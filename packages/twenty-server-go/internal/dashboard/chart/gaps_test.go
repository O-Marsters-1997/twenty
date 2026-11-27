package chart_test

import (
	"testing"

	"github.com/google/go-cmp/cmp"

	"github.com/twentyhq/twenty/packages/twenty-server-go/internal/dashboard/chart"
)

func result(aggregate float64, dimensions ...chart.RawValue) chart.GroupByResult {
	return chart.GroupByResult{DimensionValues: dimensions, AggregateValue: aggregate}
}

func TestFillDateGaps(t *testing.T) {
	t.Parallel()
	tests := []struct {
		name        string
		data        []chart.GroupByResult
		granularity chart.Granularity
		descending  bool
		want        []chart.GroupByResult
	}{
		{"empty", nil, chart.GranularityDay, false, nil},
		{"no granularity", []chart.GroupByResult{result(5, "2024-01-01"), result(3, "2024-01-03")}, "", false, []chart.GroupByResult{result(5, "2024-01-01"), result(3, "2024-01-03")}},
		{"cyclical unchanged", []chart.GroupByResult{result(5, "Monday"), result(3, "Friday")}, chart.GranularityDayOfTheWeek, false, []chart.GroupByResult{result(5, "Monday"), result(3, "Friday")}},
		{"none unchanged", []chart.GroupByResult{result(5, "2024-01-01"), result(3, "2024-01-03")}, chart.GranularityNone, false, []chart.GroupByResult{result(5, "2024-01-01"), result(3, "2024-01-03")}},
		{"days", []chart.GroupByResult{result(5, "2024-01-01"), result(3, "2024-01-04")}, chart.GranularityDay, false,
			[]chart.GroupByResult{result(5, "2024-01-01"), result(0, "2024-01-02"), result(0, "2024-01-03"), result(3, "2024-01-04")}},
		{"days descending", []chart.GroupByResult{result(3, "2024-01-03"), result(5, "2024-01-01")}, chart.GranularityDay, true,
			[]chart.GroupByResult{result(3, "2024-01-03"), result(0, "2024-01-02"), result(5, "2024-01-01")}},
		{"weeks", []chart.GroupByResult{result(1, "2024-01-01"), result(2, "2024-01-15")}, chart.GranularityWeek, false,
			[]chart.GroupByResult{result(1, "2024-01-01"), result(0, "2024-01-08"), result(2, "2024-01-15")}},
		{"months across year", []chart.GroupByResult{result(1, "2023-11-01"), result(2, "2024-02-01")}, chart.GranularityMonth, false,
			[]chart.GroupByResult{result(1, "2023-11-01"), result(0, "2023-12-01"), result(0, "2024-01-01"), result(2, "2024-02-01")}},
		{"quarters", []chart.GroupByResult{result(1, "2024-01-01"), result(2, "2024-07-01")}, chart.GranularityQuarter, false,
			[]chart.GroupByResult{result(1, "2024-01-01"), result(0, "2024-04-01"), result(2, "2024-07-01")}},
		{"years", []chart.GroupByResult{result(1, "2022-01-01"), result(2, "2024-01-01")}, chart.GranularityYear, false,
			[]chart.GroupByResult{result(1, "2022-01-01"), result(0, "2023-01-01"), result(2, "2024-01-01")}},
		{"month end clamps", []chart.GroupByResult{result(1, "2024-01-31"), result(2, "2024-03-29")}, chart.GranularityMonth, false,
			[]chart.GroupByResult{result(1, "2024-01-31"), result(0, "2024-02-29"), result(2, "2024-03-29")}},
	}
	for _, test := range tests {
		t.Run(test.name, func(t *testing.T) {
			t.Parallel()
			got, err := chart.FillDateGaps(test.data, test.granularity, test.descending)
			if err != nil {
				t.Fatalf("FillDateGaps: %v", err)
			}
			if diff := cmp.Diff(test.want, got.Data); diff != "" {
				t.Errorf("data (-want +got):\n%s", diff)
			}
			if got.WasTruncated {
				t.Error("unexpected truncation")
			}
		})
	}
}

func TestFillDateGaps_limits(t *testing.T) {
	t.Parallel()
	tests := []struct {
		name          string
		end           string
		wantTruncated bool
	}{
		{"over the bar limit", "2020-06-01", true},
		{"exactly at the bar limit", "2020-04-09", false},
	}
	for _, test := range tests {
		t.Run(test.name, func(t *testing.T) {
			t.Parallel()
			data := []chart.GroupByResult{result(1, "2020-01-01"), result(1, test.end)}
			got, err := chart.FillDateGaps(data, chart.GranularityDay, false)
			if err != nil {
				t.Fatalf("FillDateGaps: %v", err)
			}
			if len(got.Data) != 100 || got.WasTruncated != test.wantTruncated {
				t.Errorf("got %d rows truncated=%t, want 100 rows truncated=%t", len(got.Data), got.WasTruncated, test.wantTruncated)
			}
		})
	}

	t.Run("unparsable date", func(t *testing.T) {
		t.Parallel()
		if _, err := chart.FillDateGaps([]chart.GroupByResult{result(1, "garbage")}, chart.GranularityDay, false); err == nil {
			t.Fatal("expected an error")
		}
	})
}

func TestFillDateGapsTwoDimensional(t *testing.T) {
	t.Parallel()
	data := []chart.GroupByResult{result(5, "2024-01-01", "A"), result(3, "2024-01-03", "B")}
	got, err := chart.FillDateGapsTwoDimensional(data, chart.GranularityDay, false)
	if err != nil {
		t.Fatalf("FillDateGapsTwoDimensional: %v", err)
	}
	want := []chart.GroupByResult{
		result(5, "2024-01-01", "A"), result(0, "2024-01-01", "B"),
		result(0, "2024-01-02", "A"), result(0, "2024-01-02", "B"),
		result(0, "2024-01-03", "A"), result(3, "2024-01-03", "B"),
	}
	if diff := cmp.Diff(want, got.Data); diff != "" {
		t.Errorf("data (-want +got):\n%s", diff)
	}

	nulls := []chart.GroupByResult{result(5, "2024-01-01", nil), result(3, "2024-01-03", nil)}
	got, err = chart.FillDateGapsTwoDimensional(nulls, chart.GranularityDay, false)
	if err != nil {
		t.Fatalf("FillDateGapsTwoDimensional: %v", err)
	}
	if diff := cmp.Diff([]chart.GroupByResult{result(5, "2024-01-01", nil), result(0, "2024-01-02", nil), result(3, "2024-01-03", nil)}, got.Data); diff != "" {
		t.Errorf("null secondary (-want +got):\n%s", diff)
	}

	descending := []chart.GroupByResult{result(3, "2024-01-03", "A"), result(5, "2024-01-01", "A")}
	got, err = chart.FillDateGapsTwoDimensional(descending, chart.GranularityDay, true)
	if err != nil {
		t.Fatalf("FillDateGapsTwoDimensional: %v", err)
	}
	if diff := cmp.Diff([]chart.GroupByResult{result(3, "2024-01-03", "A"), result(0, "2024-01-02", "A"), result(5, "2024-01-01", "A")}, got.Data); diff != "" {
		t.Errorf("descending (-want +got):\n%s", diff)
	}

	unchanged, err := chart.FillDateGapsTwoDimensional(data, chart.GranularityDayOfTheWeek, false)
	if err != nil || diff(data, unchanged.Data) != "" {
		t.Errorf("cyclical granularity should be unchanged, err=%v", err)
	}
}

func diff(want, got []chart.GroupByResult) string { return cmp.Diff(want, got) }

var statusOptions = []chart.SelectOption{{Value: "NEW"}, {Value: "OPEN"}, {Value: "DONE"}}

func TestFillSelectGaps(t *testing.T) {
	t.Parallel()
	data := []chart.GroupByResult{result(7, "DONE"), result(2, "NEW")}

	tests := []struct {
		name    string
		data    []chart.GroupByResult
		options []chart.SelectOption
		want    []chart.GroupByResult
	}{
		{"no options", data, nil, data},
		{"empty data", nil, statusOptions, nil},
		{"fills in option order", data, statusOptions, []chart.GroupByResult{result(2, "NEW"), result(0, "OPEN"), result(7, "DONE")}},
	}
	for _, test := range tests {
		t.Run(test.name, func(t *testing.T) {
			t.Parallel()
			if d := diff(test.want, chart.FillSelectGaps(test.data, test.options)); d != "" {
				t.Errorf("data (-want +got):\n%s", d)
			}
		})
	}
}

func TestFillSelectGapsTwoDimensional(t *testing.T) {
	t.Parallel()
	data := []chart.GroupByResult{result(7, "DONE", "x"), result(2, "NEW", nil)}
	want := []chart.GroupByResult{
		result(0, "NEW", "x"), result(2, "NEW", nil),
		result(0, "OPEN", "x"), result(0, "OPEN", nil),
		result(7, "DONE", "x"), result(0, "DONE", nil),
	}
	if d := diff(want, chart.FillSelectGapsTwoDimensional(data, statusOptions)); d != "" {
		t.Errorf("data (-want +got):\n%s", d)
	}
	if d := diff(data, chart.FillSelectGapsTwoDimensional(data, nil)); d != "" {
		t.Errorf("no options should leave data unchanged:\n%s", d)
	}
}

func TestApplyGapFilling(t *testing.T) {
	t.Parallel()
	dates := []chart.GroupByResult{result(1, "2024-01-01"), result(1, "2024-01-03")}
	selects := []chart.GroupByResult{result(1, "DONE")}

	tests := []struct {
		name   string
		params chart.GapFillParams
		want   int
	}{
		{"omit null values skips filling", chart.GapFillParams{Data: dates, PrimaryAxisField: chart.Field{Type: chart.FieldDate}, Granularity: chart.GranularityDay, OmitNullValues: true}, 2},
		{"date field", chart.GapFillParams{Data: dates, PrimaryAxisField: chart.Field{Type: chart.FieldDate}, Granularity: chart.GranularityDay}, 3},
		{"select field", chart.GapFillParams{Data: selects, PrimaryAxisField: chart.Field{Type: chart.FieldSelect, Options: statusOptions}}, 3},
		{"multi select split by default", chart.GapFillParams{Data: selects, PrimaryAxisField: chart.Field{Type: chart.FieldMultiSelect, Options: statusOptions}}, 3},
		{"multi select kept as one value", chart.GapFillParams{Data: selects, PrimaryAxisField: chart.Field{Type: chart.FieldMultiSelect, Options: statusOptions}, KeepMultiValues: true}, 1},
		{"array second dimension", chart.GapFillParams{Data: []chart.GroupByResult{result(1, "DONE", []any{"a"})}, PrimaryAxisField: chart.Field{Type: chart.FieldSelect, Options: statusOptions}, TwoDimensional: true}, 3},
		{"other field", chart.GapFillParams{Data: selects, PrimaryAxisField: chart.Field{Type: chart.FieldNumber}}, 1},
	}
	for _, test := range tests {
		t.Run(test.name, func(t *testing.T) {
			t.Parallel()
			got, err := chart.ApplyGapFilling(test.params)
			if err != nil {
				t.Fatalf("ApplyGapFilling: %v", err)
			}
			if len(got.Data) != test.want {
				t.Errorf("got %d rows, want %d", len(got.Data), test.want)
			}
		})
	}
}
