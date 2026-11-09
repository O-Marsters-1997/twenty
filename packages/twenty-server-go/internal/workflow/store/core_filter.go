package store

import (
	"encoding/json"
	"fmt"
	"strconv"
	"strings"
	"time"
)

type CoreWorkflowFilter struct {
	LogicalOperator string
	Rules           []CoreWorkflowFilterRule
}

type CoreWorkflowFilterRule struct {
	FieldKey string
	Operand  string
	Value    *string
	Timezone *string
}

type filterPredicate struct {
	predicate  string
	parameters []any
}

const (
	maxFilterRules       = 50
	maxFilterValueLength = 2000

	nameColumn      = `c.name`
	updatedAtColumn = `c."updatedAt"`

	hasDraft       = `coalesce(bool_or(v.status = 'DRAFT'), false)`
	hasActive      = `coalesce(bool_or(v.status = 'ACTIVE'), false)`
	hasDeactivated = `coalesce(bool_or(v.status = 'DEACTIVATED'), false)`
	hasAnyStatus   = `(` + hasDraft + ` OR ` + hasActive + ` OR (NOT ` + hasActive + ` AND ` + hasDeactivated + `))`
)

var statusPredicates = map[string]string{
	"DRAFT":       hasDraft,
	"ACTIVE":      hasActive,
	"DEACTIVATED": `(NOT ` + hasActive + ` AND ` + hasDeactivated + `)`,
}

func invalid(format string, args ...any) error {
	return fmt.Errorf("%s: %w", fmt.Sprintf(format, args...), ErrInvalidInput)
}

func buildFilterPredicate(filter *CoreWorkflowFilter, firstParameter int) (filterPredicate, error) {
	if filter == nil || len(filter.Rules) == 0 {
		return filterPredicate{}, nil
	}
	if len(filter.Rules) > maxFilterRules {
		return filterPredicate{}, invalid("at most %d filter rules", maxFilterRules)
	}
	var result filterPredicate
	bind := func(value any) string {
		result.parameters = append(result.parameters, value)
		return "$" + strconv.Itoa(firstParameter+len(result.parameters)-1)
	}
	predicates := make([]string, len(filter.Rules))
	for i, rule := range filter.Rules {
		predicate, err := rulePredicate(rule, bind)
		if err != nil {
			return filterPredicate{}, err
		}
		predicates[i] = predicate
	}
	separator := " AND "
	if filter.LogicalOperator == "OR" {
		separator = " OR "
	}
	result.predicate = "(" + strings.Join(predicates, separator) + ")"
	return result, nil
}

func rulePredicate(rule CoreWorkflowFilterRule, bind func(any) string) (string, error) {
	unsupported := invalid("operand %s is not supported on field %s", rule.Operand, rule.FieldKey)
	switch rule.FieldKey {
	case "NAME":
		return namePredicate(rule, bind, unsupported)
	case "STATUSES":
		return statusesPredicate(rule, unsupported)
	case "UPDATED_AT":
		return updatedAtPredicate(rule, bind, unsupported)
	}
	return "", unsupported
}

func requireValue(rule CoreWorkflowFilterRule) (string, error) {
	var value string
	if rule.Value != nil {
		value = strings.TrimSpace(*rule.Value)
	}
	if value == "" {
		return "", invalid("operand %s on field %s requires a value", rule.Operand, rule.FieldKey)
	}
	if len(value) > maxFilterValueLength {
		return "", invalid("filter value is longer than %d characters", maxFilterValueLength)
	}
	return value, nil
}

func escapeForILike(value string) string {
	return strings.NewReplacer(`\`, `\\`, `%`, `\%`, `_`, `\_`).Replace(value)
}

func namePredicate(rule CoreWorkflowFilterRule, bind func(any) string, unsupported error) (string, error) {
	switch rule.Operand {
	case "CONTAINS", "DOES_NOT_CONTAIN":
		value, err := requireValue(rule)
		if err != nil {
			return "", err
		}
		pattern := bind("%" + escapeForILike(value) + "%")
		if rule.Operand == "CONTAINS" {
			return fmt.Sprintf(`%s ILIKE %s ESCAPE '\'`, nameColumn, pattern), nil
		}
		return fmt.Sprintf(`(%s IS NULL OR %s NOT ILIKE %s ESCAPE '\')`, nameColumn, nameColumn, pattern), nil
	case "IS_EMPTY":
		return fmt.Sprintf(`(%s IS NULL OR %s = '')`, nameColumn, nameColumn), nil
	case "IS_NOT_EMPTY":
		return fmt.Sprintf(`(%s IS NOT NULL AND %s <> '')`, nameColumn, nameColumn), nil
	}
	return "", unsupported
}

func statusesPredicate(rule CoreWorkflowFilterRule, unsupported error) (string, error) {
	switch rule.Operand {
	case "IS_EMPTY":
		return `(NOT ` + hasAnyStatus + `)`, nil
	case "IS_NOT_EMPTY":
		return hasAnyStatus, nil
	case "CONTAINS", "DOES_NOT_CONTAIN":
		statuses, err := parseStatuses(rule)
		if err != nil {
			return "", err
		}
		predicates := make([]string, len(statuses))
		for i, status := range statuses {
			predicates[i] = statusPredicates[status]
		}
		anyOf := "(" + strings.Join(predicates, " OR ") + ")"
		if rule.Operand == "CONTAINS" {
			return anyOf, nil
		}
		return "(NOT " + anyOf + ")", nil
	}
	return "", unsupported
}

func parseStatuses(rule CoreWorkflowFilterRule) ([]string, error) {
	raw, err := requireValue(rule)
	if err != nil {
		return nil, err
	}
	candidates := []any{raw}
	var parsed any
	if json.Unmarshal([]byte(raw), &parsed) == nil {
		list, isList := parsed.([]any)
		if !isList {
			return nil, invalid("operand %s on field %s requires a JSON array of workflow statuses", rule.Operand, rule.FieldKey)
		}
		candidates = list
	}
	if len(candidates) == 0 {
		return nil, invalid("operand %s on field %s requires at least one workflow status", rule.Operand, rule.FieldKey)
	}
	statuses := make([]string, len(candidates))
	for i, candidate := range candidates {
		status, _ := candidate.(string)
		if _, known := statusPredicates[status]; !known {
			return nil, invalid("operand %s on field %s requires workflow statuses among DRAFT, ACTIVE, DEACTIVATED", rule.Operand, rule.FieldKey)
		}
		statuses[i] = status
	}
	return statuses, nil
}

func ruleLocation(rule CoreWorkflowFilterRule) (*time.Location, error) {
	if rule.Timezone == nil {
		return time.UTC, nil
	}
	location, err := time.LoadLocation(*rule.Timezone)
	if err != nil {
		return nil, invalid("operand %s on field %s carries an invalid timezone", rule.Operand, rule.FieldKey)
	}
	return location, nil
}

func parseDate(rule CoreWorkflowFilterRule) (time.Time, error) {
	raw, err := requireValue(rule)
	if err != nil {
		return time.Time{}, err
	}
	var unquoted string
	if json.Unmarshal([]byte(raw), &unquoted) == nil {
		raw = unquoted
	}
	for _, layout := range []string{time.RFC3339Nano, "2006-01-02T15:04:05", "2006-01-02"} {
		if parsed, err := time.Parse(layout, raw); err == nil {
			return parsed, nil
		}
	}
	return time.Time{}, invalid("operand %s on field %s requires an ISO 8601 date value", rule.Operand, rule.FieldKey)
}

func dayBounds(moment time.Time, location *time.Location) (string, string) {
	local := moment.In(location)
	start := time.Date(local.Year(), local.Month(), local.Day(), 0, 0, 0, 0, location)
	return start.UTC().Format(time.RFC3339Nano), start.AddDate(0, 0, 1).UTC().Format(time.RFC3339Nano)
}

func updatedAtPredicate(rule CoreWorkflowFilterRule, bind func(any) string, unsupported error) (string, error) {
	switch rule.Operand {
	case "IS_IN_PAST":
		return updatedAtColumn + ` < now()`, nil
	case "IS_IN_FUTURE":
		return updatedAtColumn + ` > now()`, nil
	case "IS_EMPTY":
		return updatedAtColumn + ` IS NULL`, nil
	case "IS_NOT_EMPTY":
		return updatedAtColumn + ` IS NOT NULL`, nil
	case "IS_BEFORE", "IS_AFTER":
		date, err := parseDate(rule)
		if err != nil {
			return "", err
		}
		operator := "<"
		if rule.Operand == "IS_AFTER" {
			operator = ">="
		}
		return fmt.Sprintf(`%s %s %s::timestamptz`, updatedAtColumn, operator, bind(date.UTC().Format(time.RFC3339Nano))), nil
	case "IS", "IS_TODAY":
		location, err := ruleLocation(rule)
		if err != nil {
			return "", err
		}
		moment := time.Now()
		if rule.Operand == "IS" {
			if moment, err = parseDate(rule); err != nil {
				return "", err
			}
		}
		start, end := dayBounds(moment, location)
		return fmt.Sprintf(`(%s >= %s::timestamptz AND %s < %s::timestamptz)`, updatedAtColumn, bind(start), updatedAtColumn, bind(end)), nil
	}
	return "", unsupported
}
