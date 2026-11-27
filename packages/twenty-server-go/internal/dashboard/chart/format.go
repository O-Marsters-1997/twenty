package chart

import (
	"fmt"
	"math"
	"math/big"
	"regexp"
	"strconv"
	"strings"
)

const (
	labelNotSet  = "Not Set"
	labelUnknown = "Unknown"
)

var trailingZeros = regexp.MustCompile(`\.?0+$`)

type FormatParams struct {
	Value                   any
	Field                   Field
	Granularity             Granularity
	SubFieldName            string
	FirstDayOfTheWeek       FirstDayOfTheWeek
	RelationLabelByRecordID map[string]string
}

func FormatDimensionValue(params FormatParams) (string, error) {
	value := params.Value
	if value == nil {
		return labelNotSet, nil
	}

	switch params.Field.Type {
	case FieldSelect:
		return optionLabel(params.Field.Options, value), nil
	case FieldMultiSelect:
		items := normalizeMultiSelectValue(value)
		labels := make([]string, len(items))
		for index, item := range items {
			labels[index] = optionLabel(params.Field.Options, item)
		}
		return strings.Join(labels, ", "), nil
	case FieldBoolean:
		if value == true {
			return "Yes", nil
		}
		return "No", nil
	case FieldDate, FieldDateTime:
		granularity := params.Granularity
		if granularity == "" {
			granularity = GranularityDay
		}
		if granularity.isCyclical() {
			return asString(value), nil
		}
		date, err := parseDate(asString(value))
		if err != nil {
			return "", fmt.Errorf("format dimension value: %w", err)
		}
		return formatDateByGranularity(date, granularity, params.FirstDayOfTheWeek), nil
	case FieldRelation, FieldMorphRelation:
		if params.SubFieldName != "" || params.RelationLabelByRecordID == nil {
			return asString(value), nil
		}
		if label, ok := params.RelationLabelByRecordID[asString(value)]; ok {
			return label, nil
		}
		return labelUnknown, nil
	case FieldNumber, FieldCurrency:
		if params.Field.Type == FieldCurrency && params.SubFieldName == "currencyCode" {
			if code, ok := value.(string); ok && code != "" {
				return code, nil
			}
			return labelNotSet, nil
		}
		number := asNumber(value)
		if math.IsNaN(number) {
			return asString(value), nil
		}
		return formatShortNumber(number), nil
	}
	return asString(value), nil
}

func optionLabel(options []SelectOption, value any) string {
	if selected, ok := value.(string); ok {
		for _, option := range options {
			if option.Value == selected {
				return option.Label
			}
		}
	}
	return asString(value)
}

func normalizeMultiSelectValue(value any) []any {
	switch typed := value.(type) {
	case []any:
		return typed
	case []string:
		items := make([]any, len(typed))
		for index, item := range typed {
			items[index] = item
		}
		return items
	case string:
		trimmed := strings.TrimSpace(typed)
		if !strings.HasPrefix(trimmed, "{") || !strings.HasSuffix(trimmed, "}") {
			return []any{value}
		}
		content := trimmed[1 : len(trimmed)-1]
		if content == "" {
			return nil
		}
		parts := strings.Split(content, ",")
		items := make([]any, len(parts))
		for index, part := range parts {
			items[index] = part
		}
		return items
	}
	return []any{value}
}

func formatShortNumber(amount float64) string {
	sign := ""
	if amount < 0 {
		sign = "-"
	}
	absolute := math.Abs(amount)

	format := func(scaled float64, suffix string) string {
		return sign + trailingZeros.ReplaceAllString(toFixedOneDecimal(scaled), "") + suffix
	}
	roundsBelowThousand := func(scaled float64) bool {
		rounded, _ := strconv.ParseFloat(toFixedOneDecimal(scaled), 64)
		return rounded < 1000
	}

	switch {
	case roundsBelowThousand(absolute):
		return format(absolute, "")
	case roundsBelowThousand(absolute / 1_000):
		return format(absolute/1_000, "k")
	case roundsBelowThousand(absolute / 1_000_000):
		return format(absolute/1_000_000, "m")
	}
	return format(absolute/1_000_000_000, "b")
}

func toFixedOneDecimal(amount float64) string {
	scaled := new(big.Float).SetPrec(200).Mul(big.NewFloat(amount), big.NewFloat(10))
	floor, _ := scaled.Int(nil)
	isTie := new(big.Float).Sub(scaled, new(big.Float).SetInt(floor)).Cmp(big.NewFloat(0.5)) == 0
	if !isTie {
		return strconv.FormatFloat(amount, 'f', 1, 64)
	}
	return strconv.FormatFloat(float64(floor.Int64()+1)/10, 'f', 1, 64)
}
