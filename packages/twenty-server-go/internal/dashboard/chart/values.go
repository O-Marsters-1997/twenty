package chart

import (
	"fmt"
	"math"
	"strconv"
	"strings"
)

func asString(value any) string {
	switch typed := value.(type) {
	case string:
		return typed
	case float64:
		return strconv.FormatFloat(typed, 'f', -1, 64)
	case float32:
		return strconv.FormatFloat(float64(typed), 'f', -1, 32)
	case nil:
		return "null"
	case []any:
		parts := make([]string, len(typed))
		for index, part := range typed {
			parts[index] = asString(part)
		}
		return strings.Join(parts, ",")
	case []string:
		return strings.Join(typed, ",")
	}
	return fmt.Sprint(value)
}

func asNumber(value any) float64 {
	switch typed := value.(type) {
	case float64:
		return typed
	case float32:
		return float64(typed)
	case int:
		return float64(typed)
	case int32:
		return float64(typed)
	case int64:
		return float64(typed)
	case bool:
		if typed {
			return 1
		}
		return 0
	case string:
		trimmed := strings.TrimSpace(typed)
		if trimmed == "" {
			return 0
		}
		parsed, err := strconv.ParseFloat(trimmed, 64)
		if err != nil {
			return math.NaN()
		}
		return parsed
	}
	return math.NaN()
}
