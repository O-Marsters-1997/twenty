package chart

import (
	"cmp"
	"math"
	"sync"

	"golang.org/x/text/collate"
	"golang.org/x/text/language"
)

var collators = sync.Pool{New: func() any { return collate.New(language.English) }}

func localeCompare(left, right string) int {
	collator := collators.Get().(*collate.Collator)
	defer collators.Put(collator)
	return collator.CompareString(left, right)
}

type CompareParams struct {
	RawA, RawB             RawValue
	FormattedA, FormattedB string
	Direction              Direction
	FieldType              FieldType
	SubFieldName           string
	Granularity            Granularity
}

// CompareDimensionValues orders two dimension values by their raw value when
// the field type has a natural order, and by their formatted label otherwise.
func CompareDimensionValues(params CompareParams) int {
	apply := func(comparison int) int {
		if params.Direction == Descending {
			return -comparison
		}
		return comparison
	}
	bothDefined := params.RawA != nil && params.RawB != nil

	switch {
	case params.FieldType.isDateKind():
		if params.Granularity.isCyclical() {
			return 0
		}
		dateA, errA := parseDate(asString(params.RawA))
		dateB, errB := parseDate(asString(params.RawB))
		if bothDefined && errA == nil && errB == nil {
			return apply(dateA.Compare(dateB))
		}
	case params.FieldType == FieldCurrency:
		if params.SubFieldName == "amountMicros" && bothDefined {
			return apply(compareNumbers(params.RawA, params.RawB))
		}
	case params.FieldType.isNumericKind():
		if bothDefined {
			return apply(compareNumbers(params.RawA, params.RawB))
		}
	}
	return apply(localeCompare(params.FormattedA, params.FormattedB))
}

func compareNumbers(left, right any) int {
	difference := asNumber(left) - asNumber(right)
	if math.IsNaN(difference) {
		return 0
	}
	return cmp.Compare(difference, 0)
}
