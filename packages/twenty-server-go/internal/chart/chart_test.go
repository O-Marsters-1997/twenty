package chart_test

import (
	"context"
	"errors"
	"testing"

	"github.com/google/go-cmp/cmp"

	"github.com/twentyhq/twenty/packages/twenty-server-go/internal/chart"
	"github.com/twentyhq/twenty/packages/twenty-server-go/internal/metadata"
	"github.com/twentyhq/twenty/packages/twenty-server-go/internal/model"
	"github.com/twentyhq/twenty/packages/twenty-server-go/internal/records"
)

const (
	opportunityID = "o-opportunity"
	fieldID       = "f-id"
	fieldStage    = "f-stage"
	fieldAmount   = "f-amount"
	fieldClose    = "f-close"
)

type staticReader []metadata.ObjectMetadata

func (r staticReader) Objects(context.Context) ([]metadata.ObjectMetadata, error) { return r, nil }

type fakeGrouper struct {
	rows    func(query records.GroupByQuery) []records.GroupRow
	queries []records.GroupByQuery
}

func (g *fakeGrouper) GroupBy(_ context.Context, query records.GroupByQuery) ([]records.GroupRow, error) {
	g.queries = append(g.queries, query)
	return g.rows(query), nil
}

func newService(grouper *fakeGrouper) *chart.Service {
	stageOptions := []byte(`[{"value":"NEW","label":"New"},{"value":"WON","label":"Won"}]`)
	return &chart.Service{
		Metadata: staticReader{{
			ID: opportunityID, NameSingular: "opportunity",
			Fields: []metadata.FieldMetadata{
				{ID: fieldID, Name: "id", Label: "Id", Type: model.TypeUUID},
				{ID: fieldStage, Name: "stage", Label: "Stage", Type: model.TypeSelect, Options: stageOptions},
				{ID: fieldAmount, Name: "amount", Label: "Amount", Type: model.TypeCurrency},
				{ID: fieldClose, Name: "closeDate", Label: "Close date", Type: model.TypeDateTime},
			},
		}},
		NewGrouper: func(model.Object, []records.FieldMetadata) chart.Grouper { return grouper },
	}
}

func oneDimension(keys ...any) func(records.GroupByQuery) []records.GroupRow {
	return func(records.GroupByQuery) []records.GroupRow {
		rows := make([]records.GroupRow, 0, len(keys)/2)
		for i := 0; i < len(keys); i += 2 {
			rows = append(rows, records.GroupRow{Keys: []any{keys[i]}, Value: keys[i+1]})
		}
		return rows
	}
}

func configuration(overrides map[string]any) map[string]any {
	config := map[string]any{
		"configurationType": "BAR_CHART", "aggregateFieldMetadataId": fieldID, "aggregateOperation": "COUNT",
		"primaryAxisGroupByFieldMetadataId": fieldStage, "layout": "VERTICAL",
	}
	for key, value := range overrides {
		config[key] = value
	}
	return config
}

func TestService_BarChartData_oneDimension(t *testing.T) {
	t.Parallel()
	tests := []struct {
		name      string
		overrides map[string]any
		rows      []any
		want      chart.BarChartData
	}{
		{
			name: "counts per stage with option labels and a Not Set bar",
			rows: []any{"NEW", int64(3), "WON", int64(2), nil, int64(1)},
			want: chart.BarChartData{
				Data:    []any{map[string]any{"stage": "New", "Count": 3.0}, map[string]any{"stage": "Won", "Count": 2.0}, map[string]any{"stage": "Not Set", "Count": 1.0}},
				IndexBy: "stage", Keys: []string{"Count"}, Series: []*chart.BarChartSeries{{Key: "Count", Label: "Count"}},
				XAxisLabel: "Stage", YAxisLabel: "Count", ShowLegend: true, Layout: "VERTICAL", GroupMode: "STACKED",
				FormattedToRawLookup: map[string]any{"New": "NEW", "Won": "WON", "Not Set": nil},
			},
		},
		{
			name:      "cumulative sums running totals and horizontal layout swaps the axis labels",
			overrides: map[string]any{"isCumulative": true, "layout": "HORIZONTAL"},
			rows:      []any{"NEW", int64(3), "WON", int64(2)},
			want: chart.BarChartData{
				Data:    []any{map[string]any{"stage": "New", "Count": 3.0}, map[string]any{"stage": "Won", "Count": 5.0}},
				IndexBy: "stage", Keys: []string{"Count"}, Series: []*chart.BarChartSeries{{Key: "Count", Label: "Count"}},
				XAxisLabel: "Count", YAxisLabel: "Stage", ShowLegend: true, Layout: "HORIZONTAL", GroupMode: "STACKED",
				FormattedToRawLookup: map[string]any{"New": "NEW", "Won": "WON"},
			},
		},
		{
			name:      "omitNullValues drops the null group",
			overrides: map[string]any{"omitNullValues": true},
			rows:      []any{"NEW", int64(3), nil, int64(1)},
			want: chart.BarChartData{
				Data:    []any{map[string]any{"stage": "New", "Count": 3.0}},
				IndexBy: "stage", Keys: []string{"Count"}, Series: []*chart.BarChartSeries{{Key: "Count", Label: "Count"}},
				XAxisLabel: "Stage", YAxisLabel: "Count", ShowLegend: true, Layout: "VERTICAL", GroupMode: "STACKED",
				FormattedToRawLookup: map[string]any{"New": "NEW"},
			},
		},
		{
			name:      "currency sums convert micros and the label names the field",
			overrides: map[string]any{"aggregateOperation": "SUM", "aggregateFieldMetadataId": fieldAmount, "groupMode": "GROUPED"},
			rows:      []any{"NEW", 2_500_000.0},
			want: chart.BarChartData{
				Data:    []any{map[string]any{"stage": "New", "Sum of Amount": 2.5}},
				IndexBy: "stage", Keys: []string{"Sum of Amount"}, Series: []*chart.BarChartSeries{{Key: "Sum of Amount", Label: "Sum of Amount"}},
				XAxisLabel: "Stage", YAxisLabel: "Sum of Amount", ShowLegend: true, Layout: "VERTICAL", GroupMode: "GROUPED",
				FormattedToRawLookup: map[string]any{"New": "NEW"},
			},
		},
		{
			name:      "dates are labelled by granularity",
			overrides: map[string]any{"primaryAxisGroupByFieldMetadataId": fieldClose, "primaryAxisDateGranularity": "MONTH"},
			rows:      []any{"2024-01-01", int64(4)},
			want: chart.BarChartData{
				Data:    []any{map[string]any{"closeDate": "Jan 2024", "Count": 4.0}},
				IndexBy: "closeDate", Keys: []string{"Count"}, Series: []*chart.BarChartSeries{{Key: "Count", Label: "Count"}},
				XAxisLabel: "Close date", YAxisLabel: "Count", ShowLegend: true, Layout: "VERTICAL", GroupMode: "STACKED",
				FormattedToRawLookup: map[string]any{"Jan 2024": "2024-01-01"},
			},
		},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()
			grouper := &fakeGrouper{rows: oneDimension(tt.rows...)}
			got, err := newService(grouper).BarChartData(t.Context(), opportunityID, configuration(tt.overrides))
			if err != nil {
				t.Fatal(err)
			}
			if diff := cmp.Diff(tt.want, got); diff != "" {
				t.Errorf("BarChartData() mismatch (-want +got):\n%s", diff)
			}
		})
	}
}

func TestService_BarChartData_twoDimensions(t *testing.T) {
	t.Parallel()
	grouper := &fakeGrouper{rows: func(query records.GroupByQuery) []records.GroupRow {
		switch len(query.Dimensions) {
		case 1:
			if query.Dimensions[0].FieldID == fieldStage {
				return []records.GroupRow{{Keys: []any{"NEW"}, Value: int64(3)}, {Keys: []any{"WON"}, Value: int64(2)}}
			}
			return []records.GroupRow{{Keys: []any{"2024-01-01"}, Value: int64(3)}, {Keys: []any{"2024-02-01"}, Value: int64(2)}}
		}
		return []records.GroupRow{
			{Keys: []any{"NEW", "2024-01-01"}, Value: int64(3)},
			{Keys: []any{"WON", "2024-02-01"}, Value: int64(2)},
		}
	}}
	config := configuration(map[string]any{
		"secondaryAxisGroupByFieldMetadataId": fieldClose, "secondaryAxisGroupByDateGranularity": "MONTH",
		"primaryAxisOrderBy": "VALUE_DESC", "isCumulative": true,
	})
	got, err := newService(grouper).BarChartData(t.Context(), opportunityID, config)
	if err != nil {
		t.Fatal(err)
	}
	want := chart.BarChartData{
		Data: []any{
			map[string]any{"stage": "New", "Jan 2024": 3.0, "Feb 2024": 0.0},
			map[string]any{"stage": "Won", "Jan 2024": 3.0, "Feb 2024": 2.0},
		},
		IndexBy: "stage", Keys: []string{"Jan 2024", "Feb 2024"},
		Series:     []*chart.BarChartSeries{{Key: "Jan 2024", Label: "Jan 2024"}, {Key: "Feb 2024", Label: "Feb 2024"}},
		XAxisLabel: "Stage", YAxisLabel: "Count", ShowLegend: true, Layout: "VERTICAL", GroupMode: "STACKED",
		FormattedToRawLookup: map[string]any{"New": "NEW", "Won": "WON", "Jan 2024": "2024-01-01", "Feb 2024": "2024-02-01"},
	}
	if diff := cmp.Diff(want, got); diff != "" {
		t.Errorf("BarChartData() mismatch (-want +got):\n%s", diff)
	}
	wantOrder := []records.GroupOrder{{ByAggregate: true, Descending: true}}
	if diff := cmp.Diff(wantOrder, grouper.queries[0].OrderBy); diff != "" {
		t.Errorf("primary group order mismatch (-want +got):\n%s", diff)
	}
}

func TestService_BarChartData_manualOrderAndTooManyGroups(t *testing.T) {
	t.Parallel()
	t.Run("manual order puts listed values first", func(t *testing.T) {
		t.Parallel()
		grouper := &fakeGrouper{rows: oneDimension("NEW", int64(1), "WON", int64(2))}
		config := configuration(map[string]any{"primaryAxisOrderBy": "MANUAL", "primaryAxisManualSortOrder": []any{"WON"}})
		got, err := newService(grouper).BarChartData(t.Context(), opportunityID, config)
		if err != nil {
			t.Fatal(err)
		}
		want := []any{map[string]any{"stage": "Won", "Count": 2.0}, map[string]any{"stage": "New", "Count": 1.0}}
		if diff := cmp.Diff(want, got.Data); diff != "" {
			t.Errorf("Data mismatch (-want +got):\n%s", diff)
		}
	})
	t.Run("more than 100 groups are cut and flagged", func(t *testing.T) {
		t.Parallel()
		var pairs []any
		for range 101 {
			pairs = append(pairs, "NEW", int64(1))
		}
		got, err := newService(&fakeGrouper{rows: oneDimension(pairs...)}).BarChartData(t.Context(), opportunityID, configuration(nil))
		if err != nil {
			t.Fatal(err)
		}
		if !got.HasTooManyGroups {
			t.Errorf("HasTooManyGroups = false, want true")
		}
	})
}

func TestService_BarChartData_errors(t *testing.T) {
	t.Parallel()
	tests := []struct {
		name      string
		objectID  string
		overrides map[string]any
		want      error
	}{
		{"unknown object", "missing", nil, chart.ErrNotFound},
		{"unknown group by field", opportunityID, map[string]any{"primaryAxisGroupByFieldMetadataId": "nope"}, chart.ErrInvalidConfiguration},
		{"unknown aggregate operation", opportunityID, map[string]any{"aggregateOperation": "MEDIAN"}, chart.ErrInvalidConfiguration},
		{"record filters are not supported", opportunityID, map[string]any{"filter": map[string]any{"recordFilters": []any{map[string]any{"fieldMetadataId": fieldStage}}}}, chart.ErrInvalidConfiguration},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()
			_, err := newService(&fakeGrouper{rows: oneDimension()}).BarChartData(t.Context(), tt.objectID, configuration(tt.overrides))
			if !errors.Is(err, tt.want) {
				t.Errorf("BarChartData() error = %v, want %v", err, tt.want)
			}
		})
	}
}
