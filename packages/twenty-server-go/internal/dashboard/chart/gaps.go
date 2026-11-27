package chart

import (
	"fmt"
	"time"
)

type GapFillResult struct {
	Data         []GroupByResult
	WasTruncated bool
}

func isGapFillable(granularity Granularity) bool {
	switch granularity {
	case GranularityDay, GranularityWeek, GranularityMonth, GranularityQuarter, GranularityYear:
		return true
	}
	return false
}

func nextDate(date time.Time, granularity Granularity) time.Time {
	switch granularity {
	case GranularityWeek:
		return date.AddDate(0, 0, 7)
	case GranularityMonth:
		return addMonths(date, 1)
	case GranularityQuarter:
		return addMonths(date, 3)
	case GranularityYear:
		return addMonths(date, 12)
	}
	return date.AddDate(0, 0, 1)
}

func datesInRange(start, end time.Time, granularity Granularity) ([]time.Time, bool) {
	var dates []time.Time
	for cursor := start; !cursor.After(end); cursor = nextDate(cursor, granularity) {
		if len(dates) >= maximumNumberOfBars {
			return dates, true
		}
		dates = append(dates, cursor)
	}
	return dates, false
}

type dateGaps struct {
	dates     []time.Time
	truncated bool
}

func dateRange(data []GroupByResult, granularity Granularity, descending bool) (dateGaps, bool, error) {
	if len(data) == 0 || !isGapFillable(granularity) {
		return dateGaps{}, false, nil
	}
	var minDate, maxDate time.Time
	found := false
	for _, item := range data {
		if len(item.DimensionValues) == 0 || item.DimensionValues[0] == nil {
			continue
		}
		date, err := parseDate(asString(item.DimensionValues[0]))
		if err != nil {
			return dateGaps{}, false, fmt.Errorf("fill date gaps: %w", err)
		}
		if !found || date.Before(minDate) {
			minDate = date
		}
		if !found || date.After(maxDate) {
			maxDate = date
		}
		found = true
	}
	if !found {
		return dateGaps{}, false, nil
	}
	dates, truncated := datesInRange(minDate, maxDate, granularity)
	if descending {
		for left, right := 0, len(dates)-1; left < right; left, right = left+1, right-1 {
			dates[left], dates[right] = dates[right], dates[left]
		}
	}
	return dateGaps{dates: dates, truncated: truncated}, true, nil
}

// FillDateGaps adds a zero row for every period without data between the
// first and last row. Cyclical, NONE and unset granularities are left alone.
func FillDateGaps(data []GroupByResult, granularity Granularity, descending bool) (GapFillResult, error) {
	gaps, ok, err := dateRange(data, granularity, descending)
	if err != nil || !ok {
		return GapFillResult{Data: data}, err
	}
	existing := make(map[string]GroupByResult, len(data))
	for _, item := range data {
		if len(item.DimensionValues) == 0 || item.DimensionValues[0] == nil {
			continue
		}
		date, _ := parseDate(asString(item.DimensionValues[0]))
		existing[date.Format(time.DateOnly)] = item
	}
	filled := make([]GroupByResult, 0, len(gaps.dates))
	for _, date := range gaps.dates {
		key := date.Format(time.DateOnly)
		if item, found := existing[key]; found {
			filled = append(filled, item)
			continue
		}
		filled = append(filled, GroupByResult{DimensionValues: []RawValue{key}})
	}
	return GapFillResult{Data: filled, WasTruncated: gaps.truncated}, nil
}

func secondDimension(item GroupByResult) RawValue {
	if len(item.DimensionValues) > 1 {
		return item.DimensionValues[1]
	}
	return nil
}

func uniqueSecondDimensions(data []GroupByResult, include func(GroupByResult) bool) []RawValue {
	seen := map[string]bool{}
	var unique []RawValue
	for _, item := range data {
		second := secondDimension(item)
		key := fmt.Sprintf("%T:%s", second, asString(second))
		if include(item) && !seen[key] {
			seen[key] = true
			unique = append(unique, second)
		}
	}
	return unique
}

func hasPrimaryDimension(item GroupByResult) bool {
	return len(item.DimensionValues) > 0 && item.DimensionValues[0] != nil
}

// FillDateGapsTwoDimensional zero-fills every period for every secondary value seen.
func FillDateGapsTwoDimensional(data []GroupByResult, granularity Granularity, descending bool) (GapFillResult, error) {
	gaps, ok, err := dateRange(data, granularity, descending)
	if err != nil || !ok {
		return GapFillResult{Data: data}, err
	}
	existing := make(map[string]GroupByResult, len(data))
	for _, item := range data {
		if !hasPrimaryDimension(item) {
			continue
		}
		date, _ := parseDate(asString(item.DimensionValues[0]))
		existing[date.Format(time.DateOnly)+"_"+asString(secondDimension(item))] = item
	}
	seconds := uniqueSecondDimensions(data, hasPrimaryDimension)
	filled := make([]GroupByResult, 0, len(gaps.dates)*len(seconds))
	for _, date := range gaps.dates {
		dateKey := date.Format(time.DateOnly)
		for _, second := range seconds {
			if item, found := existing[dateKey+"_"+asString(second)]; found {
				filled = append(filled, item)
				continue
			}
			filled = append(filled, GroupByResult{DimensionValues: []RawValue{dateKey, second}})
		}
	}
	return GapFillResult{Data: filled, WasTruncated: gaps.truncated}, nil
}

// FillSelectGaps returns one row per select option, in option order.
func FillSelectGaps(data []GroupByResult, options []SelectOption) []GroupByResult {
	if len(options) == 0 || len(data) == 0 {
		return data
	}
	existing := make(map[string]GroupByResult, len(data))
	for _, item := range data {
		if hasPrimaryDimension(item) {
			existing[asString(item.DimensionValues[0])] = item
		}
	}
	filled := make([]GroupByResult, 0, len(options))
	for _, option := range options {
		if item, found := existing[option.Value]; found {
			filled = append(filled, item)
			continue
		}
		filled = append(filled, GroupByResult{DimensionValues: []RawValue{option.Value}})
	}
	return filled
}

// FillSelectGapsTwoDimensional returns every option crossed with every secondary value seen.
func FillSelectGapsTwoDimensional(data []GroupByResult, options []SelectOption) []GroupByResult {
	if len(options) == 0 || len(data) == 0 {
		return data
	}
	existing := make(map[string]GroupByResult, len(data))
	for _, item := range data {
		if hasPrimaryDimension(item) {
			existing[asString(item.DimensionValues[0])+"_"+asString(secondDimension(item))] = item
		}
	}
	seconds := uniqueSecondDimensions(data, hasPrimaryDimension)
	filled := make([]GroupByResult, 0, len(options)*len(seconds))
	for _, option := range options {
		for _, second := range seconds {
			if item, found := existing[option.Value+"_"+asString(second)]; found {
				filled = append(filled, item)
				continue
			}
			filled = append(filled, GroupByResult{DimensionValues: []RawValue{option.Value, second}})
		}
	}
	return filled
}

type GapFillParams struct {
	Data             []GroupByResult
	PrimaryAxisField Field
	Granularity      Granularity
	OmitNullValues   bool
	Descending       bool
	TwoDimensional   bool
	KeepMultiValues  bool
}

// ApplyGapFilling picks date and select gap filling from the primary axis field type.
func ApplyGapFilling(params GapFillParams) (GapFillResult, error) {
	result := GapFillResult{Data: params.Data}
	if params.OmitNullValues {
		return result, nil
	}
	fieldType := params.PrimaryAxisField.Type

	if fieldType.isDateKind() {
		fill := FillDateGaps
		if params.TwoDimensional {
			fill = FillDateGapsTwoDimensional
		}
		var err error
		if result, err = fill(result.Data, params.Granularity, params.Descending); err != nil {
			return GapFillResult{}, err
		}
	}

	arrayWithoutSplit := fieldType.isArrayKind() && params.KeepMultiValues
	if fieldType.isSelectKind() && !arrayWithoutSplit {
		fill := FillSelectGaps
		if params.TwoDimensional {
			fill = FillSelectGapsTwoDimensional
		}
		result.Data = fill(result.Data, params.PrimaryAxisField.Options)
	}
	return result, nil
}
