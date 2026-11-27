package chart

import (
	"context"
	"fmt"
)

type PieChartDataItem struct {
	Key   string
	Value float64
}

type PieChartData struct {
	Data                 []*PieChartDataItem
	ShowLegend           bool
	ShowDataLabels       bool
	ShowCenterMetric     bool
	HasTooManyGroups     bool
	FormattedToRawLookup map[string]any
}

type pieChartConfiguration struct {
	AggregateFieldMetadataID string         `json:"aggregateFieldMetadataId"`
	AggregateOperation       string         `json:"aggregateOperation"`
	DateGranularity          string         `json:"dateGranularity"`
	DisplayDataLabel         bool           `json:"displayDataLabel"`
	DisplayLegend            *bool          `json:"displayLegend"`
	Filter                   map[string]any `json:"filter"`
	FirstDayOfTheWeek        *int           `json:"firstDayOfTheWeek"`
	GroupByFieldMetadataID   string         `json:"groupByFieldMetadataId"`
	GroupBySubFieldName      string         `json:"groupBySubFieldName"`
	HideEmptyCategory        bool           `json:"hideEmptyCategory"`
	ManualSortOrder          []string       `json:"manualSortOrder"`
	OrderBy                  string         `json:"orderBy"`
	ShowCenterMetric         bool           `json:"showCenterMetric"`
	Timezone                 string         `json:"timezone"`
}

func (s *Service) PieChartData(ctx context.Context, objectMetadataID string, configuration map[string]any) (PieChartData, error) {
	config, err := decodeConfiguration[pieChartConfiguration](configuration)
	if err != nil {
		return PieChartData{}, err
	}
	bar, err := s.barChart(ctx, objectMetadataID, barChartConfiguration{
		AggregateFieldMetadataID:          config.AggregateFieldMetadataID,
		AggregateOperation:                config.AggregateOperation,
		Filter:                            config.Filter,
		FirstDayOfTheWeek:                 config.FirstDayOfTheWeek,
		OmitNullValues:                    config.HideEmptyCategory,
		Timezone:                          config.Timezone,
		PrimaryAxisDateGranularity:        config.DateGranularity,
		PrimaryAxisGroupByFieldMetadataID: config.GroupByFieldMetadataID,
		PrimaryAxisGroupBySubFieldName:    config.GroupBySubFieldName,
		PrimaryAxisManualSortOrder:        config.ManualSortOrder,
		PrimaryAxisOrderBy:                config.OrderBy,
	})
	if err != nil {
		return PieChartData{}, err
	}
	result := PieChartData{
		Data:                 make([]*PieChartDataItem, 0, len(bar.Data)),
		ShowLegend:           config.DisplayLegend == nil || *config.DisplayLegend,
		ShowDataLabels:       config.DisplayDataLabel,
		ShowCenterMetric:     config.ShowCenterMetric,
		HasTooManyGroups:     bar.HasTooManyGroups,
		FormattedToRawLookup: bar.FormattedToRawLookup,
	}
	for _, item := range bar.Data {
		row, ok := item.(map[string]any)
		if !ok {
			return PieChartData{}, fmt.Errorf("pie chart row has type %T", item)
		}
		value, _ := row[bar.Keys[0]].(float64)
		key, _ := row[bar.IndexBy].(string)
		result.Data = append(result.Data, &PieChartDataItem{Key: key, Value: value})
	}
	return result, nil
}
