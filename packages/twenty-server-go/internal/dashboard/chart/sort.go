package chart

import (
	"cmp"
	"math"
	"slices"
)

type SortParams[TItem any] struct {
	Data            []TItem
	OrderBy         OrderBy
	ManualSortOrder []string
	FormattedToRaw  map[string]RawValue
	FieldValue      func(TItem) string
	NumericValue    func(TItem) float64
	SelectOptions   []SelectOption
	FieldType       FieldType
	SubFieldName    string
	Granularity     Granularity
}

// SortIfNeeded returns data ordered per params.OrderBy, or data itself when
// there is nothing to order by. It never mutates its input.
func SortIfNeeded[TItem any](params SortParams[TItem]) []TItem {
	data := params.Data

	switch params.OrderBy {
	case OrderManual:
		if params.ManualSortOrder == nil {
			return data
		}
		return sortByManualOrder(data, params.ManualSortOrder, func(item TItem) string {
			formatted := params.FieldValue(item)
			if raw := params.FormattedToRaw[formatted]; raw != nil {
				return asString(raw)
			}
			return formatted
		})
	case OrderValueAsc:
		return sortedBy(data, func(left, right TItem) int {
			return cmp.Compare(params.NumericValue(left), params.NumericValue(right))
		})
	case OrderValueDesc:
		return sortedBy(data, func(left, right TItem) int {
			return cmp.Compare(params.NumericValue(right), params.NumericValue(left))
		})
	case OrderFieldAsc, OrderFieldDesc:
		direction := Ascending
		if params.OrderBy == OrderFieldDesc {
			direction = Descending
		}
		return sortedBy(data, func(left, right TItem) int {
			formattedA, formattedB := params.FieldValue(left), params.FieldValue(right)
			return CompareDimensionValues(CompareParams{
				RawA:         params.FormattedToRaw[formattedA],
				RawB:         params.FormattedToRaw[formattedB],
				FormattedA:   formattedA,
				FormattedB:   formattedB,
				Direction:    direction,
				FieldType:    params.FieldType,
				SubFieldName: params.SubFieldName,
				Granularity:  params.Granularity,
			})
		})
	case OrderFieldPositionAsc, OrderFieldPositionDesc:
		if len(params.SelectOptions) == 0 {
			return data
		}
		return sortBySelectOptionPosition(params, params.OrderBy == OrderFieldPositionDesc)
	}
	return data
}

func sortedBy[TItem any](data []TItem, compare func(left, right TItem) int) []TItem {
	sorted := slices.Clone(data)
	slices.SortStableFunc(sorted, compare)
	return sorted
}

func sortByManualOrder[TItem any](items []TItem, manualSortOrder []string, rawValue func(TItem) string) []TItem {
	if len(manualSortOrder) == 0 {
		return items
	}
	indexByValue := make(map[string]int, len(manualSortOrder))
	for index, value := range manualSortOrder {
		indexByValue[value] = index
	}
	return sortedBy(items, func(left, right TItem) int {
		indexLeft, foundLeft := indexByValue[rawValue(left)]
		indexRight, foundRight := indexByValue[rawValue(right)]
		switch {
		case !foundLeft && !foundRight:
			return 0
		case !foundLeft:
			return 1
		case !foundRight:
			return -1
		}
		return indexLeft - indexRight
	})
}

func sortBySelectOptionPosition[TItem any](params SortParams[TItem], descending bool) []TItem {
	positionByValue := make(map[string]int, len(params.SelectOptions))
	for _, option := range params.SelectOptions {
		positionByValue[option.Value] = option.Position
	}
	position := func(item TItem) int {
		raw := params.FormattedToRaw[params.FieldValue(item)]
		if raw == nil {
			return math.MaxInt64
		}
		if found, ok := positionByValue[asString(raw)]; ok {
			return found
		}
		return math.MaxInt64
	}
	return sortedBy(params.Data, func(left, right TItem) int {
		if descending {
			return cmp.Compare(position(right), position(left))
		}
		return cmp.Compare(position(left), position(right))
	})
}
