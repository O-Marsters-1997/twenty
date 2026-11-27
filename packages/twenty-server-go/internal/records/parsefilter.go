package records

import (
	"encoding/json"
	"errors"
	"fmt"
	"slices"
	"sort"

	"github.com/twentyhq/twenty/packages/twenty-server-go/internal/model"
)

func isComposite(object model.Object, name string) bool {
	index := slices.IndexFunc(object.Fields, func(field model.Field) bool { return field.Name == name })
	return index >= 0 && len(object.Fields[index].Columns) > 1
}

func sortedKeys(values map[string]any) []string {
	keys := make([]string, 0, len(values))
	for key := range values {
		keys = append(keys, key)
	}
	sort.Strings(keys)
	return keys
}

func ParseFilter(object model.Object, input map[string]any) (Filter, error) {
	var conjuncts []Filter
	for _, key := range sortedKeys(input) {
		switch key {
		case "and", "or":
			group, err := parseGroup(object, input[key])
			if err != nil {
				return Filter{}, err
			}
			if key == "and" {
				conjuncts = append(conjuncts, Filter{And: group})
			} else {
				conjuncts = append(conjuncts, Filter{Or: group})
			}
		case "not":
			nested, ok := input[key].(map[string]any)
			if !ok {
				return Filter{}, errors.New("not filter must be an object")
			}
			inner, err := ParseFilter(object, nested)
			if err != nil {
				return Filter{}, err
			}
			conjuncts = append(conjuncts, Filter{Not: &inner})
		default:
			operators, ok := input[key].(map[string]any)
			if !ok {
				return Filter{}, fmt.Errorf("filter on %s must be an object", key)
			}
			if isComposite(object, key) {
				for _, subField := range sortedKeys(operators) {
					subOperators, ok := operators[subField].(map[string]any)
					if !ok {
						return Filter{}, fmt.Errorf("filter on %s.%s must be an object", key, subField)
					}
					conjuncts = append(conjuncts, operatorFilters(key, subField, subOperators)...)
				}
				continue
			}
			conjuncts = append(conjuncts, operatorFilters(key, "", operators)...)
		}
	}
	return Filter{And: conjuncts}, nil
}

func parseGroup(object model.Object, raw any) ([]Filter, error) {
	items, _ := raw.([]any)
	var group []Filter
	for _, item := range items {
		if item == nil {
			continue
		}
		nested, ok := item.(map[string]any)
		if !ok {
			return nil, errors.New("and/or entries must be objects")
		}
		filter, err := ParseFilter(object, nested)
		if err != nil {
			return nil, err
		}
		group = append(group, filter)
	}
	return group, nil
}

func operatorFilters(field, subField string, operators map[string]any) []Filter {
	var filters []Filter
	for _, operand := range sortedKeys(operators) {
		filters = append(filters, Filter{Field: &FieldFilter{
			Field: field, SubField: subField, Operand: Operand(operand), Value: normalise(operators[operand]),
		}})
	}
	return filters
}

func normalise(value any) any {
	switch typed := value.(type) {
	case json.Number:
		number, err := typed.Float64()
		if err != nil {
			return typed.String()
		}
		return number
	case []any:
		strings := make([]string, 0, len(typed))
		for _, item := range typed {
			text, ok := item.(string)
			if !ok {
				return typed
			}
			strings = append(strings, text)
		}
		return strings
	}
	return value
}
