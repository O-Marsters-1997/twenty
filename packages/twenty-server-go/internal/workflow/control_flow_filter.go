package workflow

import (
	"encoding/json"
	"fmt"
	"reflect"
	"regexp"
	"slices"
	"strconv"
	"strings"
	"time"
)

type stepFilterGroup struct {
	ID                        string `json:"id"`
	LogicalOperator           string `json:"logicalOperator"`
	ParentStepFilterGroupID   string `json:"parentStepFilterGroupId"`
	PositionInStepFilterGroup int    `json:"positionInStepFilterGroup"`
}

type stepFilter struct {
	Type              string `json:"type"`
	StepOutputKey     string `json:"stepOutputKey"`
	Operand           string `json:"operand"`
	Value             string `json:"value"`
	StepFilterGroupID string `json:"stepFilterGroupId"`
}

type resolvedFilter struct {
	filterType        string
	operand           string
	left, right       any
	stepFilterGroupID string
}

var variablePattern = regexp.MustCompile(`\{\{([^{}]+)\}\}`)

// resolveVariables replaces {{path}} tokens from context. A string that is a
// single token keeps the referenced value's type.
func resolveVariables(input any, context map[string]any) any {
	switch value := input.(type) {
	case string:
		if loc := variablePattern.FindStringIndex(value); loc != nil && loc[0] == 0 && loc[1] == len(value) {
			return lookupPath(value[2:len(value)-2], context)
		}
		return variablePattern.ReplaceAllStringFunc(value, func(token string) string {
			resolved := lookupPath(token[2:len(token)-2], context)
			if _, isObject := resolved.(map[string]any); isObject {
				encoded, _ := json.Marshal(resolved)
				return string(encoded)
			}
			return fmt.Sprint(resolved)
		})
	case []any:
		resolved := make([]any, len(value))
		for i, item := range value {
			resolved[i] = resolveVariables(item, context)
		}
		return resolved
	case map[string]any:
		resolved := make(map[string]any, len(value))
		for key, item := range value {
			resolved[fmt.Sprint(resolveVariables(key, context))] = resolveVariables(item, context)
		}
		return resolved
	}
	return input
}

func lookupPath(path string, context map[string]any) any {
	var current any = context
	for _, segment := range strings.Split(strings.TrimSpace(path), ".") {
		switch node := current.(type) {
		case map[string]any:
			current = node[segment]
		case []any:
			index, err := strconv.Atoi(segment)
			if err != nil || index < 0 || index >= len(node) {
				return nil
			}
			current = node[index]
		default:
			return nil
		}
	}
	return current
}

var emptinessOperand = map[string]string{
	"IS":               "IS_EMPTY",
	"IS_NOT":           "IS_NOT_EMPTY",
	"CONTAINS":         "IS_EMPTY",
	"DOES_NOT_CONTAIN": "IS_NOT_EMPTY",
}

func resolveFilters(filters []stepFilter, context map[string]any) []resolvedFilter {
	resolved := make([]resolvedFilter, len(filters))
	for i, filter := range filters {
		right := resolveVariables(filter.Value, context)
		operand := filter.Operand
		if right == nil && variablePattern.MatchString(filter.Value) {
			if swapped, ok := emptinessOperand[operand]; ok {
				operand = swapped
			}
		}
		resolved[i] = resolvedFilter{
			filterType:        filter.Type,
			operand:           operand,
			left:              resolveVariables(filter.StepOutputKey, context),
			right:             right,
			stepFilterGroupID: filter.StepFilterGroupID,
		}
	}
	return resolved
}

func evaluateFilterConditions(groups []stepFilterGroup, filters []resolvedFilter) (bool, error) {
	if len(groups) == 0 && len(filters) == 0 {
		return true, nil
	}
	if len(groups) > 0 {
		for _, filter := range filters {
			if !slices.ContainsFunc(groups, func(group stepFilterGroup) bool { return group.ID == filter.stepFilterGroupID }) {
				return false, fmt.Errorf("filter group %q not found: %w", filter.stepFilterGroupID, ErrInvalidStepInput)
			}
		}
	}

	var roots []stepFilterGroup
	for _, group := range groups {
		if group.ParentStepFilterGroupID == "" {
			roots = append(roots, group)
		}
	}
	if len(roots) == 0 {
		return allFilters(filters)
	}
	for _, root := range roots {
		matched, err := evaluateGroup(root.ID, groups, filters)
		if err != nil || !matched {
			return false, err
		}
	}
	return true, nil
}

func allFilters(filters []resolvedFilter) (bool, error) {
	for _, filter := range filters {
		matched, err := evaluateFilter(filter)
		if err != nil || !matched {
			return false, err
		}
	}
	return true, nil
}

func evaluateGroup(groupID string, groups []stepFilterGroup, filters []resolvedFilter) (bool, error) {
	index := slices.IndexFunc(groups, func(group stepFilterGroup) bool { return group.ID == groupID })
	if index < 0 {
		return false, fmt.Errorf("filter group %q not found: %w", groupID, ErrInvalidStepInput)
	}

	var results []bool
	for _, filter := range filters {
		if filter.stepFilterGroupID != groupID {
			continue
		}
		matched, err := evaluateFilter(filter)
		if err != nil {
			return false, err
		}
		results = append(results, matched)
	}

	var children []stepFilterGroup
	for _, group := range groups {
		if group.ParentStepFilterGroupID == groupID {
			children = append(children, group)
		}
	}
	slices.SortStableFunc(children, func(a, b stepFilterGroup) int {
		return a.PositionInStepFilterGroup - b.PositionInStepFilterGroup
	})
	for _, child := range children {
		matched, err := evaluateGroup(child.ID, groups, filters)
		if err != nil {
			return false, err
		}
		results = append(results, matched)
	}

	if len(results) == 0 {
		return true, nil
	}
	switch groups[index].LogicalOperator {
	case "AND":
		return !slices.Contains(results, false), nil
	case "OR":
		return slices.Contains(results, true), nil
	}
	return false, fmt.Errorf("unknown logical operator %q: %w", groups[index].LogicalOperator, ErrInvalidStepInput)
}

// evaluateFilter covers the operands shared by every field type. Relative
// dates, select, currency, actor and rating filters are not ported yet.
func evaluateFilter(filter resolvedFilter) (bool, error) {
	left, right := filter.left, filter.right
	switch filter.operand {
	case "IS":
		return valuesEqual(left, right), nil
	case "IS_NOT":
		return !valuesEqual(left, right), nil
	case "IS_NOT_NULL":
		return left != nil, nil
	case "IS_EMPTY":
		return isEmpty(left), nil
	case "IS_NOT_EMPTY":
		return !isEmpty(left), nil
	case "CONTAINS":
		return contains(left, right), nil
	case "DOES_NOT_CONTAIN":
		return !contains(left, right), nil
	case "GREATER_THAN_OR_EQUAL", "LESS_THAN_OR_EQUAL":
		order, err := compareOrdered(left, right)
		if err != nil {
			return false, err
		}
		if filter.operand == "GREATER_THAN_OR_EQUAL" {
			return order >= 0, nil
		}
		return order <= 0, nil
	case "IS_BEFORE", "IS_AFTER":
		leftTime, rightTime, err := parseTimes(left, right)
		if err != nil {
			return false, err
		}
		if filter.operand == "IS_BEFORE" {
			return leftTime.Before(rightTime), nil
		}
		return leftTime.After(rightTime), nil
	case "IS_IN_PAST", "IS_IN_FUTURE":
		leftTime, err := parseTime(left)
		if err != nil {
			return false, err
		}
		if filter.operand == "IS_IN_PAST" {
			return leftTime.Before(time.Now()), nil
		}
		return leftTime.After(time.Now()), nil
	}
	return false, fmt.Errorf("unsupported operand %q for type %q: %w", filter.operand, filter.filterType, ErrInvalidStepInput)
}

func valuesEqual(left, right any) bool {
	if reflect.DeepEqual(left, right) {
		return true
	}
	leftNumber, leftIsNumber := toNumber(left)
	rightNumber, rightIsNumber := toNumber(right)
	if leftIsNumber && rightIsNumber {
		return leftNumber == rightNumber
	}
	return isScalar(left) && isScalar(right) && fmt.Sprint(left) == fmt.Sprint(right)
}

func isScalar(value any) bool {
	switch value.(type) {
	case nil, map[string]any, []any:
		return false
	}
	return true
}

func isEmpty(value any) bool {
	switch typed := value.(type) {
	case nil:
		return true
	case string:
		return typed == ""
	case []any:
		return len(typed) == 0
	case map[string]any:
		return len(typed) == 0
	}
	return false
}

func contains(left, right any) bool {
	rightText, rightIsText := right.(string)
	switch typed := left.(type) {
	case []any:
		if rightList, ok := right.([]any); ok {
			return slices.ContainsFunc(typed, func(item any) bool {
				return slices.ContainsFunc(rightList, func(candidate any) bool { return valuesEqual(item, candidate) })
			})
		}
		if rightIsText {
			var rightList []any
			if json.Unmarshal([]byte(rightText), &rightList) == nil {
				return contains(left, rightList)
			}
		}
		return slices.ContainsFunc(typed, func(item any) bool { return valuesEqual(item, right) })
	case string:
		if rightIsText {
			var rightList []any
			if json.Unmarshal([]byte(rightText), &rightList) == nil {
				return slices.ContainsFunc(rightList, func(item any) bool { return strings.Contains(typed, fmt.Sprint(item)) })
			}
		}
	}
	return strings.Contains(fmt.Sprint(left), fmt.Sprint(right))
}

func toNumber(value any) (float64, bool) {
	switch typed := value.(type) {
	case float64:
		return typed, true
	case int:
		return float64(typed), true
	case string:
		number, err := strconv.ParseFloat(typed, 64)
		return number, err == nil
	}
	return 0, false
}

func compareOrdered(left, right any) (int, error) {
	leftNumber, leftIsNumber := toNumber(left)
	rightNumber, rightIsNumber := toNumber(right)
	if leftIsNumber && rightIsNumber {
		switch {
		case leftNumber < rightNumber:
			return -1, nil
		case leftNumber > rightNumber:
			return 1, nil
		}
		return 0, nil
	}
	leftTime, rightTime, err := parseTimes(left, right)
	if err != nil {
		return 0, err
	}
	return leftTime.Compare(rightTime), nil
}

func parseTimes(left, right any) (time.Time, time.Time, error) {
	leftTime, err := parseTime(left)
	if err != nil {
		return time.Time{}, time.Time{}, err
	}
	rightTime, err := parseTime(right)
	return leftTime, rightTime, err
}

func parseTime(value any) (time.Time, error) {
	text, ok := value.(string)
	if !ok {
		return time.Time{}, fmt.Errorf("value %v is not a date: %w", value, ErrInvalidStepInput)
	}
	for _, layout := range []string{time.RFC3339Nano, "2006-01-02"} {
		if parsed, err := time.Parse(layout, text); err == nil {
			return parsed, nil
		}
	}
	return time.Time{}, fmt.Errorf("value %q is not a date: %w", text, ErrInvalidStepInput)
}
