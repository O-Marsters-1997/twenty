package chart_test

import (
	"testing"

	"github.com/google/go-cmp/cmp"

	"github.com/twentyhq/twenty/packages/twenty-server-go/internal/dashboard/chart"
)

type row struct {
	field string
	value float64
}

func sortRows(params chart.SortParams[row]) []string {
	params.FieldValue = func(item row) string { return item.field }
	params.NumericValue = func(item row) float64 { return item.value }
	var fields []string
	for _, item := range chart.SortIfNeeded(params) {
		fields = append(fields, item.field)
	}
	return fields
}

func TestSortIfNeeded(t *testing.T) {
	t.Parallel()
	rows := []row{{"b", 20}, {"a", 30}, {"c", 10}}
	lookup := map[string]chart.RawValue{"b": "B", "a": "A", "c": "C"}
	options := []chart.SelectOption{{Value: "A", Position: 2}, {Value: "B", Position: 0}, {Value: "C", Position: 1}}

	tests := []struct {
		name   string
		params chart.SortParams[row]
		want   []string
	}{
		{"no order", chart.SortParams[row]{Data: rows}, []string{"b", "a", "c"}},
		{"value asc", chart.SortParams[row]{Data: rows, OrderBy: chart.OrderValueAsc}, []string{"c", "b", "a"}},
		{"value desc", chart.SortParams[row]{Data: rows, OrderBy: chart.OrderValueDesc}, []string{"a", "b", "c"}},
		{"field asc", chart.SortParams[row]{Data: rows, OrderBy: chart.OrderFieldAsc}, []string{"a", "b", "c"}},
		{"field desc", chart.SortParams[row]{Data: rows, OrderBy: chart.OrderFieldDesc}, []string{"c", "b", "a"}},
		{"manual", chart.SortParams[row]{Data: rows, OrderBy: chart.OrderManual, ManualSortOrder: []string{"C", "A", "B"}, FormattedToRaw: lookup}, []string{"c", "a", "b"}},
		{"manual falls back to formatted value", chart.SortParams[row]{Data: rows, OrderBy: chart.OrderManual, ManualSortOrder: []string{"c", "b", "a"}}, []string{"c", "b", "a"}},
		{"manual unlisted last", chart.SortParams[row]{Data: rows, OrderBy: chart.OrderManual, ManualSortOrder: []string{"C"}, FormattedToRaw: lookup}, []string{"c", "b", "a"}},
		{"manual without order", chart.SortParams[row]{Data: rows, OrderBy: chart.OrderManual, FormattedToRaw: lookup}, []string{"b", "a", "c"}},
		{"manual with empty order", chart.SortParams[row]{Data: rows, OrderBy: chart.OrderManual, ManualSortOrder: []string{}, FormattedToRaw: lookup}, []string{"b", "a", "c"}},
		{"position asc", chart.SortParams[row]{Data: rows, OrderBy: chart.OrderFieldPositionAsc, SelectOptions: options, FormattedToRaw: lookup}, []string{"b", "c", "a"}},
		{"position desc", chart.SortParams[row]{Data: rows, OrderBy: chart.OrderFieldPositionDesc, SelectOptions: options, FormattedToRaw: lookup}, []string{"a", "c", "b"}},
		{"position asc unknown last", chart.SortParams[row]{Data: rows, OrderBy: chart.OrderFieldPositionAsc, SelectOptions: options[:1], FormattedToRaw: lookup}, []string{"a", "b", "c"}},
		{"position desc unknown first", chart.SortParams[row]{Data: rows, OrderBy: chart.OrderFieldPositionDesc, SelectOptions: options[:1], FormattedToRaw: lookup}, []string{"b", "c", "a"}},
		{"position without options", chart.SortParams[row]{Data: rows, OrderBy: chart.OrderFieldPositionAsc, FormattedToRaw: lookup}, []string{"b", "a", "c"}},
		{"empty data", chart.SortParams[row]{OrderBy: chart.OrderValueAsc}, nil},
		{"single item", chart.SortParams[row]{Data: rows[:1], OrderBy: chart.OrderValueDesc}, []string{"b"}},
	}
	for _, test := range tests {
		t.Run(test.name, func(t *testing.T) {
			t.Parallel()
			if diff := cmp.Diff(test.want, sortRows(test.params)); diff != "" {
				t.Errorf("order (-want +got):\n%s", diff)
			}
		})
	}
}

func TestSortIfNeeded_input(t *testing.T) {
	t.Parallel()
	t.Run("not mutated", func(t *testing.T) {
		t.Parallel()
		rows := []row{{"b", 2}, {"a", 1}}
		sortRows(chart.SortParams[row]{Data: rows, OrderBy: chart.OrderValueAsc})
		if rows[0].field != "b" {
			t.Errorf("input was reordered: %v", rows)
		}
	})
}

func TestCompareDimensionValues(t *testing.T) {
	t.Parallel()
	tests := []struct {
		name   string
		params chart.CompareParams
		want   int
	}{
		{"strings asc", chart.CompareParams{FormattedA: "Alpha", FormattedB: "Beta", Direction: chart.Ascending}, -1},
		{"strings desc", chart.CompareParams{FormattedA: "Alpha", FormattedB: "Beta", Direction: chart.Descending}, 1},
		{"strings equal", chart.CompareParams{FormattedA: "Alpha", FormattedB: "Alpha", Direction: chart.Ascending}, 0},
		{"strings ignore case first", chart.CompareParams{FormattedA: "apple", FormattedB: "Banana", Direction: chart.Ascending}, -1},
		{"dates asc", chart.CompareParams{RawA: "2024-01-01", RawB: "2024-06-15", FormattedA: "Jun", FormattedB: "Jan", Direction: chart.Ascending, FieldType: chart.FieldDate}, -1},
		{"dates desc", chart.CompareParams{RawA: "2024-01-01", RawB: "2024-06-15", Direction: chart.Descending, FieldType: chart.FieldDate}, 1},
		{"dates equal", chart.CompareParams{RawA: "2024-01-01", RawB: "2024-01-01", Direction: chart.Ascending, FieldType: chart.FieldDate}, 0},
		{"datetimes", chart.CompareParams{RawA: "2024-01-01", RawB: "2024-06-15", Direction: chart.Ascending, FieldType: chart.FieldDateTime}, -1},
		{"cyclical dates tie", chart.CompareParams{RawA: "Friday", RawB: "Monday", FormattedA: "Friday", FormattedB: "Monday", Direction: chart.Ascending, FieldType: chart.FieldDate, Granularity: chart.GranularityDayOfTheWeek}, 0},
		{"numbers asc", chart.CompareParams{RawA: 100.0, RawB: 200.0, FormattedA: "100", FormattedB: "200", Direction: chart.Ascending, FieldType: chart.FieldNumber}, -1},
		{"numbers numeric not lexical", chart.CompareParams{RawA: 9.0, RawB: 10.0, FormattedA: "9", FormattedB: "10", Direction: chart.Ascending, FieldType: chart.FieldNumber}, -1},
		{"numbers desc", chart.CompareParams{RawA: 100.0, RawB: 200.0, Direction: chart.Descending, FieldType: chart.FieldNumber}, 1},
		{"numbers equal", chart.CompareParams{RawA: 5.0, RawB: 5.0, Direction: chart.Ascending, FieldType: chart.FieldNumber}, 0},
		{"numbers from strings", chart.CompareParams{RawA: "5", RawB: "15", Direction: chart.Ascending, FieldType: chart.FieldNumber}, -1},
		{"currency amountMicros", chart.CompareParams{RawA: 1_000_000.0, RawB: 5_000_000.0, Direction: chart.Ascending, FieldType: chart.FieldCurrency, SubFieldName: "amountMicros"}, -1},
		{"currency code", chart.CompareParams{RawA: "EUR", RawB: "USD", FormattedA: "EUR", FormattedB: "USD", Direction: chart.Ascending, FieldType: chart.FieldCurrency, SubFieldName: "currencyCode"}, -1},
		{"missing raw falls back to labels", chart.CompareParams{FormattedA: "Alpha", FormattedB: "Beta", Direction: chart.Ascending, FieldType: chart.FieldNumber}, -1},
		{"one missing raw falls back to labels", chart.CompareParams{RawA: 1.0, FormattedA: "Zed", FormattedB: "Alpha", Direction: chart.Ascending, FieldType: chart.FieldNumber}, 1},
		{"no field type uses labels", chart.CompareParams{RawA: 1.0, RawB: 2.0, FormattedA: "B", FormattedB: "A", Direction: chart.Ascending}, 1},
	}
	for _, test := range tests {
		t.Run(test.name, func(t *testing.T) {
			t.Parallel()
			if got := chart.CompareDimensionValues(test.params); got != test.want {
				t.Errorf("got %d, want %d", got, test.want)
			}
		})
	}
}
