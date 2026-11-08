package store_test

import (
	"errors"
	"testing"

	"github.com/google/go-cmp/cmp"
	"github.com/google/uuid"

	"github.com/twentyhq/twenty/packages/twenty-server-go/internal/records"
	"github.com/twentyhq/twenty/packages/twenty-server-go/internal/records/store"
)

func createDashboard(t *testing.T, dashboards *store.Dashboards, title string) records.Dashboard {
	t.Helper()
	dashboard, err := dashboards.Create(t.Context(), actor, records.DashboardInput{Title: &title})
	if err != nil {
		t.Fatalf("create %s: %v", title, err)
	}
	return dashboard
}

func dashboardTitles(page records.Page[records.Dashboard]) []string {
	var titles []string
	for _, dashboard := range page.Records {
		titles = append(titles, dashboard.Title)
	}
	return titles
}

func TestDashboards(t *testing.T) {
	t.Parallel()
	dashboards := store.NewDashboards(newPool(t))
	sales := createDashboard(t, dashboards, "Sales")
	createDashboard(t, dashboards, "Pipeline")
	createDashboard(t, dashboards, "Sales")

	t.Run("filter, sort and page", func(t *testing.T) {
		filter := records.Filter{Field: &records.FieldFilter{Field: "title", Operand: "ilike", Value: "%ALE%"}}
		order := []records.OrderBy{{Field: "title", Direction: "AscNullsLast"}}
		first, err := dashboards.Find(t.Context(), filter, order, records.PageRequest{First: 1})
		if err != nil {
			t.Fatalf("Find: %v", err)
		}
		if diff := cmp.Diff([]string{"Sales"}, dashboardTitles(first)); diff != "" || first.TotalCount != 2 || !first.HasNext {
			t.Errorf("first page = %v total %d next %v (-want +got):\n%s", dashboardTitles(first), first.TotalCount, first.HasNext, diff)
		}
		second, err := dashboards.Find(t.Context(), filter, order, records.PageRequest{First: 5, After: first.EndCursor})
		if err != nil {
			t.Fatalf("Find second page: %v", err)
		}
		if len(second.Records) != 1 || second.HasNext {
			t.Errorf("second page = %v next %v, want one record and no next page", dashboardTitles(second), second.HasNext)
		}
	})

	t.Run("update changes only the given fields", func(t *testing.T) {
		layout := uuid.NewString()
		updated, err := dashboards.Update(t.Context(), actor, sales.ID, records.DashboardInput{PageLayoutID: &layout})
		if err != nil {
			t.Fatalf("Update: %v", err)
		}
		if updated.Title != "Sales" || updated.PageLayoutID == nil || *updated.PageLayoutID != layout {
			t.Errorf("Update = %+v, want title kept and layout %s", updated, layout)
		}
	})

	t.Run("update of a missing dashboard is not found", func(t *testing.T) {
		if _, err := dashboards.Update(t.Context(), actor, uuid.NewString(), records.DashboardInput{}); !errors.Is(err, records.ErrNotFound) {
			t.Errorf("Update(missing) error = %v, want ErrNotFound", err)
		}
	})

	t.Run("aggregates and groups", func(t *testing.T) {
		result, err := dashboards.Aggregate(t.Context(), records.Filter{}, []records.Aggregate{{Field: "id", Operation: "count"}, {Field: "title", Operation: "countUniqueValues"}})
		if err != nil {
			t.Fatalf("Aggregate: %v", err)
		}
		if diff := cmp.Diff(records.AggregateResult{"totalCount": int64(4), "countUniqueValuesTitle": int64(3)}, result); diff != "" {
			t.Errorf("Aggregate (-want +got):\n%s", diff)
		}
		groups, err := dashboards.GroupBy(t.Context(), records.Filter{}, []records.GroupBy{{Field: "title"}}, []records.OrderBy{{Field: "title", Direction: "AscNullsLast"}}, []records.Aggregate{{Field: "id", Operation: "count"}}, records.PageRequest{First: 10})
		if err != nil {
			t.Fatalf("GroupBy: %v", err)
		}
		type summary struct {
			Key     any
			Count   any
			Records int
		}
		var got []summary
		for _, group := range groups {
			got = append(got, summary{group.Key[0], group.Aggregates["totalCount"], len(group.Records.Records)})
		}
		want := []summary{{"My First Dashboard", int64(1), 1}, {"Pipeline", int64(1), 1}, {"Sales", int64(2), 2}}
		if diff := cmp.Diff(want, got); diff != "" {
			t.Errorf("groups (-want +got):\n%s", diff)
		}
	})

	t.Run("soft delete, restore and destroy", func(t *testing.T) {
		if err := dashboards.SoftDelete(t.Context(), sales.ID); err != nil {
			t.Fatalf("SoftDelete: %v", err)
		}
		if page, err := dashboards.Find(t.Context(), records.Filter{}, nil, records.PageRequest{}); err != nil || page.TotalCount != 3 {
			t.Errorf("Find after delete = %d records, %v; want 3", page.TotalCount, err)
		}
		if err := dashboards.Restore(t.Context(), sales.ID); err != nil {
			t.Fatalf("Restore: %v", err)
		}
		if err := dashboards.Destroy(t.Context(), sales.ID); err != nil {
			t.Fatalf("Destroy: %v", err)
		}
		if _, err := dashboards.Get(t.Context(), sales.ID); !errors.Is(err, records.ErrNotFound) {
			t.Errorf("Get after destroy error = %v, want ErrNotFound", err)
		}
	})
}
