package chart_test

import (
	"testing"

	"github.com/google/go-cmp/cmp"

	"github.com/twentyhq/twenty/packages/twenty-server-go/internal/dashboard/chart"
)

func TestBuildUniqueRelationLabels(t *testing.T) {
	t.Parallel()
	tests := []struct {
		name           string
		labels         map[string]string
		recordIDs      []string
		wantLabels     map[string]string
		wantUnresolved map[string]struct{}
	}{
		{"unique labels untouched", map[string]string{"id-1": "Alice", "id-2": "Bob"}, []string{"id-1", "id-2"},
			map[string]string{"id-1": "Alice", "id-2": "Bob"}, map[string]struct{}{}},
		{"colliding group fully suffixed", map[string]string{"id-1": "John", "id-2": "John", "id-3": "Jane"}, []string{"id-1", "id-2", "id-3"},
			map[string]string{"id-1": "John (1)", "id-2": "John (2)", "id-3": "Jane"}, map[string]struct{}{}},
		{"ordinals follow record id order", map[string]string{"id-b": "John", "id-a": "John"}, []string{"id-b", "id-a"},
			map[string]string{"id-a": "John (1)", "id-b": "John (2)"}, map[string]struct{}{}},
		{"duplicate ids collapse", map[string]string{"id-1": "Alice"}, []string{"id-1", "id-1"},
			map[string]string{"id-1": "Alice"}, map[string]struct{}{}},
		{"missing label unresolved", map[string]string{"id-1": "Alice"}, []string{"id-1", "id-2"},
			map[string]string{"id-1": "Alice"}, map[string]struct{}{"id-2": {}}},
		{"whitespace label unresolved", map[string]string{"id-1": "   "}, []string{"id-1"},
			map[string]string{}, map[string]struct{}{"id-1": {}}},
		{"sentinel names suffixed", map[string]string{"id-1": "Not Set", "id-2": "Unknown"}, []string{"id-1", "id-2"},
			map[string]string{"id-1": "Not Set (1)", "id-2": "Unknown (1)"}, map[string]struct{}{}},
		{"suffixed label already taken", map[string]string{"id-1": "John", "id-2": "John", "id-3": "John (1)"}, []string{"id-1", "id-2", "id-3"},
			map[string]string{"id-1": "John (1)", "id-2": "John (2)", "id-3": "John (1) (1)"}, map[string]struct{}{}},
	}
	for _, test := range tests {
		t.Run(test.name, func(t *testing.T) {
			t.Parallel()
			got := chart.BuildUniqueRelationLabels(test.labels, test.recordIDs)
			if diff := cmp.Diff(test.wantLabels, got.LabelByRecordID); diff != "" {
				t.Errorf("labels (-want +got):\n%s", diff)
			}
			if diff := cmp.Diff(test.wantUnresolved, got.UnresolvedRecordIDs); diff != "" {
				t.Errorf("unresolved (-want +got):\n%s", diff)
			}
		})
	}
}

func TestMergeFormattedToRawLookups(t *testing.T) {
	t.Parallel()
	got := chart.MergeFormattedToRawLookups([]chart.AxisLookup{
		{FormattedToRaw: map[string]chart.RawValue{"Alice": "id-1", "Bob": "id-2"}, UnresolvedRecordIDs: map[string]struct{}{"id-2": {}}},
		{FormattedToRaw: map[string]chart.RawValue{"Open": "OPEN", "Alice": "id-9"}},
	})
	want := map[string]chart.RawValue{"Alice": "id-9", "Open": "OPEN"}
	if diff := cmp.Diff(want, got); diff != "" {
		t.Errorf("lookup (-want +got):\n%s", diff)
	}
}
