package store_test

import (
	"errors"
	"slices"
	"testing"
	"time"

	"github.com/google/go-cmp/cmp"
	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/twentyhq/twenty/packages/twenty-server-go/internal/records"
	"github.com/twentyhq/twenty/packages/twenty-server-go/internal/records/store"
	"github.com/twentyhq/twenty/packages/twenty-server-go/internal/workspace"
)

const unknownID = "6f2a3a2e-8b0e-4a39-9d5e-2f7d4e2f6a11"

func seedTargets(t *testing.T, pool *pgxpool.Pool) (personID, otherPersonID string) {
	t.Helper()
	people := store.NewPeople(pool)
	return create(t, people, "Ada", "Lovelace", "ada@analytical.org").ID, create(t, people, "Alan", "Turing", "alan@bletchley.uk").ID
}

func createActivity(t *testing.T, activities *store.TimelineActivities, name string, happensAt time.Time, target string) records.TimelineActivity {
	t.Helper()
	activity, err := activities.Create(t.Context(), actor, records.TimelineActivityInput{
		HappensAt: &happensAt, LinkedRecordCachedName: &name, TargetPersonID: &target,
	})
	if err != nil {
		t.Fatalf("create %s: %v", name, err)
	}
	return activity
}

func activityNames(page records.Page[records.TimelineActivity]) []string {
	var names []string
	for _, activity := range page.Records {
		names = append(names, activity.LinkedRecordCachedName)
	}
	return names
}

func TestTimelineActivities_CreateGetUpdate(t *testing.T) {
	t.Parallel()
	pool := newPool(t)
	personID, _ := seedTargets(t, pool)
	var companyID string
	if err := pool.QueryRow(t.Context(), `INSERT INTO `+workspace.SchemaName()+`.company DEFAULT VALUES RETURNING id::text`).Scan(&companyID); err != nil {
		t.Fatalf("seed company: %v", err)
	}
	activities := store.NewTimelineActivities(pool)
	happensAt := time.Date(2026, 3, 1, 9, 0, 0, 0, time.UTC)
	created, err := activities.Create(t.Context(), actor, records.TimelineActivityInput{
		HappensAt: &happensAt, Properties: []byte(`{"diff":{"name":{"after":"Ada"}}}`),
		LinkedRecordCachedName: new("Ada"), TargetPersonID: new(personID),
	})
	if err != nil {
		t.Fatalf("create: %v", err)
	}

	got, err := activities.Get(t.Context(), created.ID)
	if err != nil {
		t.Fatalf("get: %v", err)
	}
	if diff := cmp.Diff(created, got); diff != "" {
		t.Errorf("Get differs from Create (-create +get):\n%s", diff)
	}
	if !got.HappensAt.Equal(happensAt) || got.TargetPersonID == nil || *got.TargetPersonID != personID || got.CreatedBy != actor {
		t.Errorf("got %+v, want happensAt, person target and actor kept", got)
	}

	editor := records.Actor{Source: "MANUAL", Name: "Eve Editor"}
	updated, err := activities.Update(t.Context(), editor, created.ID, records.TimelineActivityInput{TargetCompanyID: new(companyID), TargetPersonID: new("")})
	if err != nil {
		t.Fatalf("update: %v", err)
	}
	if updated.TargetPersonID != nil || updated.TargetCompanyID == nil || *updated.TargetCompanyID != companyID {
		t.Errorf("got person %v company %v, want person cleared and company set", updated.TargetPersonID, updated.TargetCompanyID)
	}
	if updated.LinkedRecordCachedName != "Ada" || updated.UpdatedBy != editor || updated.CreatedBy != actor {
		t.Errorf("got %+v, want untouched fields kept and editor recorded", updated)
	}
}

func TestTimelineActivities_Get(t *testing.T) {
	t.Parallel()
	activities := store.NewTimelineActivities(newPool(t))
	if _, err := activities.Get(t.Context(), unknownID); !errors.Is(err, records.ErrNotFound) {
		t.Errorf("Get(unknown) error = %v, want ErrNotFound", err)
	}
}

func TestTimelineActivities_SoftDeleteRestoreDestroy(t *testing.T) {
	t.Parallel()
	pool := newPool(t)
	personID, _ := seedTargets(t, pool)
	activities := store.NewTimelineActivities(pool)
	activity := createActivity(t, activities, "one", time.Now(), personID)
	names := func() []string {
		page, err := activities.Find(t.Context(), records.Filter{}, nil, records.PageRequest{})
		if err != nil {
			t.Fatalf("find: %v", err)
		}
		return activityNames(page)
	}

	if err := activities.SoftDelete(t.Context(), activity.ID); err != nil {
		t.Fatalf("soft delete: %v", err)
	}
	if got := names(); len(got) != 0 {
		t.Errorf("after SoftDelete names = %v, want none", got)
	}
	if err := activities.Restore(t.Context(), activity.ID); err != nil {
		t.Fatalf("restore: %v", err)
	}
	if got := names(); !slices.Equal(got, []string{"one"}) {
		t.Errorf("after Restore names = %v, want [one]", got)
	}
	if err := activities.Destroy(t.Context(), activity.ID); err != nil {
		t.Fatalf("destroy: %v", err)
	}
	if err := activities.Destroy(t.Context(), activity.ID); !errors.Is(err, records.ErrNotFound) {
		t.Errorf("second Destroy error = %v, want ErrNotFound", err)
	}
}

func TestTimelineActivities_FindFiltersSortsAndPages(t *testing.T) {
	t.Parallel()
	pool := newPool(t)
	personID, otherPersonID := seedTargets(t, pool)
	activities := store.NewTimelineActivities(pool)
	base := time.Date(2026, 1, 1, 0, 0, 0, 0, time.UTC)
	createActivity(t, activities, "old", base, personID)
	createActivity(t, activities, "mid", base.Add(time.Hour), personID)
	createActivity(t, activities, "new", base.Add(2*time.Hour), personID)
	createActivity(t, activities, "other", base.Add(3*time.Hour), otherPersonID)
	forPerson := fieldFilter("targetPersonId", "", "eq", personID)
	newestFirst := []records.OrderBy{{Field: "happensAt", Direction: "DescNullsFirst"}}

	first, err := activities.Find(t.Context(), forPerson, newestFirst, records.PageRequest{First: 2})
	if err != nil {
		t.Fatalf("find first page: %v", err)
	}
	if got := activityNames(first); !slices.Equal(got, []string{"new", "mid"}) || first.TotalCount != 3 || !first.HasNext {
		t.Errorf("first page = %v total %d hasNext %v, want [new mid] total 3 hasNext", got, first.TotalCount, first.HasNext)
	}
	second, err := activities.Find(t.Context(), forPerson, newestFirst, records.PageRequest{First: 2, After: first.EndCursor})
	if err != nil {
		t.Fatalf("find second page: %v", err)
	}
	if got := activityNames(second); !slices.Equal(got, []string{"old"}) || second.HasNext || !second.HasPrevious {
		t.Errorf("second page = %v hasNext %v hasPrevious %v, want [old] last page", got, second.HasNext, second.HasPrevious)
	}
	if _, err := activities.Find(t.Context(), fieldFilter("nope", "", "eq", "x"), nil, records.PageRequest{}); !errors.Is(err, records.ErrUnknownField) {
		t.Errorf("Find(unknown field) error = %v, want ErrUnknownField", err)
	}
}

func TestTimelineActivities_AggregateAndGroupBy(t *testing.T) {
	t.Parallel()
	pool := newPool(t)
	personID, _ := seedTargets(t, pool)
	activities := store.NewTimelineActivities(pool)
	now := time.Now()
	createActivity(t, activities, "a", now, personID)
	createActivity(t, activities, "b", now, personID)
	createActivity(t, activities, "c", now, "")

	result, err := activities.Aggregate(t.Context(), records.Filter{}, []records.Aggregate{
		{Field: "id", Operation: "count"}, {Field: "targetPersonId", Operation: "countNotEmpty"},
	})
	if err != nil {
		t.Fatalf("aggregate: %v", err)
	}
	if diff := cmp.Diff(records.AggregateResult{"totalCount": int64(3), "countNotEmptyTargetPersonId": int64(2)}, result); diff != "" {
		t.Errorf("Aggregate (-want +got):\n%s", diff)
	}

	groups, err := activities.GroupBy(t.Context(), records.Filter{}, []records.GroupBy{{Field: "targetPersonId"}}, nil,
		[]records.Aggregate{{Field: "id", Operation: "count"}}, records.PageRequest{First: 10})
	if err != nil {
		t.Fatalf("group by: %v", err)
	}
	sizes := map[any]int64{}
	for _, group := range groups {
		sizes[group.Key[0]] = group.Aggregates["totalCount"].(int64)
		if int64(len(group.Records.Records)) != group.Aggregates["totalCount"] {
			t.Errorf("group %v pages %d records, want %v", group.Key, len(group.Records.Records), group.Aggregates["totalCount"])
		}
	}
	if diff := cmp.Diff(map[any]int64{personID: 2, nil: 1}, sizes); diff != "" {
		t.Errorf("group sizes (-want +got):\n%s", diff)
	}
}
