package chart_test

import (
	"testing"

	"github.com/twentyhq/twenty/packages/twenty-server-go/internal/dashboard/chart"
)

func TestFormatDimensionValue(t *testing.T) {
	t.Parallel()
	selectField := chart.Field{Type: chart.FieldSelect, Options: []chart.SelectOption{
		{Value: "ACTIVE", Label: "Active"}, {Value: "INACTIVE", Label: "Inactive", Position: 1},
	}}
	multiSelectField := chart.Field{Type: chart.FieldMultiSelect, Options: []chart.SelectOption{
		{Value: "TAG1", Label: "Tag One"}, {Value: "TAG2", Label: "Tag Two"},
	}}
	relationLabels := map[string]string{"record-id-1": "Alice Smith"}

	tests := []struct {
		name   string
		params chart.FormatParams
		want   string
	}{
		{"nil value", chart.FormatParams{Value: nil, Field: chart.Field{Type: chart.FieldNumber}}, "Not Set"},
		{"select label", chart.FormatParams{Value: "ACTIVE", Field: selectField}, "Active"},
		{"select unknown option", chart.FormatParams{Value: "OTHER", Field: selectField}, "OTHER"},
		{"multi select slice", chart.FormatParams{Value: []any{"TAG1", "TAG2"}, Field: multiSelectField}, "Tag One, Tag Two"},
		{"multi select postgres array", chart.FormatParams{Value: "{TAG1,TAG2}", Field: multiSelectField}, "Tag One, Tag Two"},
		{"multi select empty postgres array", chart.FormatParams{Value: "{}", Field: multiSelectField}, ""},
		{"multi select single", chart.FormatParams{Value: "TAG1", Field: multiSelectField}, "Tag One"},
		{"boolean true", chart.FormatParams{Value: true, Field: chart.Field{Type: chart.FieldBoolean}}, "Yes"},
		{"boolean false", chart.FormatParams{Value: false, Field: chart.Field{Type: chart.FieldBoolean}}, "No"},
		{"cyclical day of week", chart.FormatParams{Value: "Monday", Field: chart.Field{Type: chart.FieldDate}, Granularity: chart.GranularityDayOfTheWeek}, "Monday"},
		{"cyclical quarter", chart.FormatParams{Value: "Q1", Field: chart.Field{Type: chart.FieldDateTime}, Granularity: chart.GranularityQuarterOfTheYear}, "Q1"},
		{"date day", chart.FormatParams{Value: "2024-01-15", Field: chart.Field{Type: chart.FieldDate}, Granularity: chart.GranularityDay}, "Jan 15, 2024"},
		{"date defaults to day", chart.FormatParams{Value: "2024-09-05", Field: chart.Field{Type: chart.FieldDate}}, "Sep 5, 2024"},
		{"datetime month", chart.FormatParams{Value: "2024-01-15T23:30:00Z", Field: chart.Field{Type: chart.FieldDateTime}, Granularity: chart.GranularityMonth}, "January 2024"},
		{"date quarter", chart.FormatParams{Value: "2024-05-01", Field: chart.Field{Type: chart.FieldDate}, Granularity: chart.GranularityQuarter}, "Q2 2024"},
		{"date year", chart.FormatParams{Value: "2024-05-01", Field: chart.Field{Type: chart.FieldDate}, Granularity: chart.GranularityYear}, "2024"},
		{"date none", chart.FormatParams{Value: "2024-05-01", Field: chart.Field{Type: chart.FieldDate}, Granularity: chart.GranularityNone}, "5/1/2024"},
		{"week within month", chart.FormatParams{Value: "2024-01-17", Field: chart.Field{Type: chart.FieldDate}, Granularity: chart.GranularityWeek, FirstDayOfTheWeek: chart.Monday}, "Jan 15 - 21, 2024"},
		{"week across months", chart.FormatParams{Value: "2024-01-31", Field: chart.Field{Type: chart.FieldDate}, Granularity: chart.GranularityWeek, FirstDayOfTheWeek: chart.Monday}, "Jan 29 - Feb 4, 2024"},
		{"week across years", chart.FormatParams{Value: "2024-12-31", Field: chart.Field{Type: chart.FieldDate}, Granularity: chart.GranularityWeek, FirstDayOfTheWeek: chart.Monday}, "Dec 30, 2024 - Jan 5, 2025"},
		{"week starting sunday", chart.FormatParams{Value: "2024-01-14", Field: chart.Field{Type: chart.FieldDate}, Granularity: chart.GranularityWeek, FirstDayOfTheWeek: chart.Sunday}, "Jan 14 - 20, 2024"},
		{"week starting saturday", chart.FormatParams{Value: "2024-01-14", Field: chart.Field{Type: chart.FieldDate}, Granularity: chart.GranularityWeek, FirstDayOfTheWeek: chart.Saturday}, "Jan 13 - 19, 2024"},
		{"relation raw", chart.FormatParams{Value: "Company Name", Field: chart.Field{Type: chart.FieldRelation}}, "Company Name"},
		{"relation with granularity", chart.FormatParams{Value: "2024-01-15", Field: chart.Field{Type: chart.FieldRelation}, Granularity: chart.GranularityDay, SubFieldName: "createdAt"}, "2024-01-15"},
		{"relation resolved", chart.FormatParams{Value: "record-id-1", Field: chart.Field{Type: chart.FieldRelation}, RelationLabelByRecordID: relationLabels}, "Alice Smith"},
		{"relation resolved ignores granularity", chart.FormatParams{Value: "record-id-1", Field: chart.Field{Type: chart.FieldRelation}, Granularity: chart.GranularityDay, RelationLabelByRecordID: relationLabels}, "Alice Smith"},
		{"relation unresolved", chart.FormatParams{Value: "record-id-2", Field: chart.Field{Type: chart.FieldRelation}, RelationLabelByRecordID: relationLabels}, "Unknown"},
		{"relation sub field keeps raw", chart.FormatParams{Value: "Acme", Field: chart.Field{Type: chart.FieldRelation}, SubFieldName: "name", RelationLabelByRecordID: relationLabels}, "Acme"},
		{"relation nil with map", chart.FormatParams{Value: nil, Field: chart.Field{Type: chart.FieldRelation}, RelationLabelByRecordID: relationLabels}, "Not Set"},
		{"morph relation resolved", chart.FormatParams{Value: "record-id-1", Field: chart.Field{Type: chart.FieldMorphRelation}, RelationLabelByRecordID: relationLabels}, "Alice Smith"},
		{"morph relation without map", chart.FormatParams{Value: "record-id-1", Field: chart.Field{Type: chart.FieldMorphRelation}}, "record-id-1"},
		{"number thousands", chart.FormatParams{Value: 1500.0, Field: chart.Field{Type: chart.FieldNumber}}, "1.5k"},
		{"number from string", chart.FormatParams{Value: "2000", Field: chart.Field{Type: chart.FieldNumber}}, "2k"},
		{"number not numeric", chart.FormatParams{Value: "not a number", Field: chart.Field{Type: chart.FieldNumber}}, "not a number"},
		{"number zero", chart.FormatParams{Value: 0.0, Field: chart.Field{Type: chart.FieldNumber}}, "0"},
		{"number millions", chart.FormatParams{Value: 2_500_000.0, Field: chart.Field{Type: chart.FieldNumber}}, "2.5m"},
		{"number billions", chart.FormatParams{Value: 3e9, Field: chart.Field{Type: chart.FieldNumber}}, "3b"},
		{"number negative", chart.FormatParams{Value: -1500.0, Field: chart.Field{Type: chart.FieldNumber}}, "-1.5k"},
		{"number rounds up to next unit", chart.FormatParams{Value: 999_960.0, Field: chart.Field{Type: chart.FieldNumber}}, "1m"},
		{"number tie rounds up", chart.FormatParams{Value: 1250.0, Field: chart.Field{Type: chart.FieldNumber}}, "1.3k"},
		{"array value joined", chart.FormatParams{Value: []any{"a", "b"}, Field: chart.Field{Type: "ARRAY"}}, "a,b"},
		{"currency amount", chart.FormatParams{Value: 1500.0, Field: chart.Field{Type: chart.FieldCurrency}}, "1.5k"},
		{"currency code", chart.FormatParams{Value: "USD", Field: chart.Field{Type: chart.FieldCurrency}, SubFieldName: "currencyCode"}, "USD"},
		{"currency empty code", chart.FormatParams{Value: "", Field: chart.Field{Type: chart.FieldCurrency}, SubFieldName: "currencyCode"}, "Not Set"},
		{"text", chart.FormatParams{Value: "Hello World", Field: chart.Field{Type: "TEXT"}}, "Hello World"},
		{"text from integer", chart.FormatParams{Value: 123.0, Field: chart.Field{Type: "TEXT"}}, "123"},
	}
	for _, test := range tests {
		t.Run(test.name, func(t *testing.T) {
			t.Parallel()
			got, err := chart.FormatDimensionValue(test.params)
			if err != nil {
				t.Fatalf("FormatDimensionValue: %v", err)
			}
			if got != test.want {
				t.Errorf("got %q, want %q", got, test.want)
			}
		})
	}
}

func TestFormatDimensionValue_errors(t *testing.T) {
	t.Parallel()
	t.Run("unparsable date", func(t *testing.T) {
		t.Parallel()
		_, err := chart.FormatDimensionValue(chart.FormatParams{Value: "not-a-date", Field: chart.Field{Type: chart.FieldDate}})
		if err == nil {
			t.Fatal("expected an error for an unparsable date")
		}
	})
}
