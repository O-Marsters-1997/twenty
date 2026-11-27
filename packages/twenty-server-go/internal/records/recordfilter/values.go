package recordfilter

import (
	"encoding/json"
	"fmt"
	"math"
	"regexp"
	"slices"
	"strconv"
	"strings"
)

var (
	numericPrefix   = regexp.MustCompile(`^[+-]?(?:\d+\.?\d*|\.\d+)(?:[eE][+-]?\d+)?`)
	variablePattern = regexp.MustCompile(`^\{\{[^{}]+\}\}$`)
	uuidPattern     = regexp.MustCompile(`(?i)^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$`)
)

var actorSources = []string{"EMAIL", "CALENDAR", "WORKFLOW", "AGENT", "API", "IMPORT", "MANUAL", "SYSTEM", "WEBHOOK", "APPLICATION"}

func parseNumber(value string) (float64, error) {
	match := numericPrefix.FindString(strings.TrimSpace(value))
	if match != "" {
		if number, err := strconv.ParseFloat(match, 64); err == nil {
			return number, nil
		}
	}
	return 0, fmt.Errorf("%w: %q is not a number", ErrInvalidFilter, value)
}

func currencyMicros(amount float64) float64 {
	return math.Floor(amount*1_000_000 + 0.5)
}

func parseStringList(value string) ([]string, error) {
	if value == "" {
		return nil, nil
	}
	if variablePattern.MatchString(value) {
		return []string{value}, nil
	}
	var items *[]string
	if err := json.Unmarshal([]byte(value), &items); err != nil || items == nil {
		return nil, fmt.Errorf("%w: %q is not an array of strings", ErrInvalidFilter, value)
	}
	return *items, nil
}

func parseUUIDList(value string) []string {
	var items []any
	if variablePattern.MatchString(value) {
		items = []any{value}
	} else {
		var parsed any
		switch err := json.Unmarshal([]byte(value), &parsed); {
		case err != nil:
			items = []any{value}
		default:
			if list, isList := parsed.([]any); isList {
				items = list
			} else {
				items = []any{parsed}
			}
		}
	}

	ids := make([]string, 0, len(items))
	for _, item := range items {
		id, isString := item.(string)
		if !isString || (!uuidPattern.MatchString(id) && !variablePattern.MatchString(id)) {
			return nil
		}
		ids = append(ids, id)
	}
	return ids
}

type relationValue struct {
	currentWorkspaceMember bool
	currentRecord          bool
	ids                    []string
}

func parseRelationValue(value string) relationValue {
	var raw struct {
		CurrentWorkspaceMember bool      `json:"isCurrentWorkspaceMemberSelected"`
		CurrentRecord          bool      `json:"isCurrentRecordSelected"`
		SelectedRecordIDs      *[]string `json:"selectedRecordIds"`
	}
	if err := json.Unmarshal([]byte(value), &raw); err != nil || raw.SelectedRecordIDs == nil {
		return relationValue{ids: parseUUIDList(value)}
	}
	return relationValue{raw.CurrentWorkspaceMember, raw.CurrentRecord, *raw.SelectedRecordIDs}
}

func parseActorSources(value string) ([]string, error) {
	var sources []string
	if err := json.Unmarshal([]byte(value), &sources); err != nil {
		return nil, fmt.Errorf("%w: %q is not an array of actor sources", ErrInvalidFilter, value)
	}
	for _, source := range sources {
		if !slices.Contains(actorSources, source) {
			return nil, fmt.Errorf("%w: unknown actor source %q", ErrInvalidFilter, source)
		}
	}
	return sources, nil
}

func phoneDigits(value string) string {
	var cleaned strings.Builder
	for i, r := range strings.TrimSpace(value) {
		if (r >= '0' && r <= '9') || (r == '+' && i == 0) {
			cleaned.WriteRune(r)
		}
	}
	return cleaned.String()
}
