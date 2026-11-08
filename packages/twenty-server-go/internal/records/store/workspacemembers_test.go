package store_test

import (
	"errors"
	"slices"
	"testing"

	"github.com/google/go-cmp/cmp"
	"github.com/google/uuid"

	"github.com/twentyhq/twenty/packages/twenty-server-go/internal/records"
	"github.com/twentyhq/twenty/packages/twenty-server-go/internal/records/store"
)

func createMember(t *testing.T, members *store.WorkspaceMembers, first, dateFormat string) records.WorkspaceMember {
	t.Helper()
	userID := uuid.NewString()
	member, err := members.Create(t.Context(), actor, records.WorkspaceMemberInput{
		Name:       &records.FullName{FirstName: first},
		UserID:     &userID,
		DateFormat: &dateFormat,
	})
	if err != nil {
		t.Fatalf("create %s: %v", first, err)
	}
	return member
}

func memberNames(page records.Page[records.WorkspaceMember]) []string {
	var names []string
	for _, member := range page.Records {
		names = append(names, member.Name.FirstName)
	}
	return names
}

func TestWorkspaceMembers(t *testing.T) {
	t.Parallel()
	members := store.NewWorkspaceMembers(newPool(t))
	ada := createMember(t, members, "Ada", "DAY_FIRST")
	createMember(t, members, "Bea", "DAY_FIRST")
	createMember(t, members, "Cy", "SYSTEM")

	t.Run("create applies column defaults", func(t *testing.T) {
		want := []any{"System", "Default", "SIDE_PANEL", "en", float64(7), "system", "DAY_FIRST", "SYSTEM", "SYSTEM", "MANUAL"}
		got := []any{ada.ColorScheme, ada.UIScale, ada.OpenRecordIn, ada.Locale, ada.CalendarStartDay, ada.TimeZone, ada.DateFormat, ada.TimeFormat, ada.NumberFormat, ada.CreatedBy.Source}
		if diff := cmp.Diff(want, got); diff != "" {
			t.Errorf("created member (-want +got):\n%s", diff)
		}
	})

	t.Run("filter on a select field, sort and page", func(t *testing.T) {
		filter := records.Filter{Field: &records.FieldFilter{Field: "dateFormat", Operand: "in", Value: []string{"DAY_FIRST"}}}
		order := []records.OrderBy{{Field: "name", SubField: "firstName", Direction: "DescNullsLast"}}
		first, err := members.Find(t.Context(), filter, order, records.PageRequest{First: 1})
		if err != nil {
			t.Fatalf("Find first page: %v", err)
		}
		if diff := cmp.Diff([]string{"Bea"}, memberNames(first)); diff != "" || first.TotalCount != 2 || !first.HasNext {
			t.Errorf("first page = %v total %d next %v (-want +got):\n%s", memberNames(first), first.TotalCount, first.HasNext, diff)
		}
		second, err := members.Find(t.Context(), filter, order, records.PageRequest{First: 5, After: first.EndCursor})
		if err != nil {
			t.Fatalf("Find second page: %v", err)
		}
		if diff := cmp.Diff([]string{"Ada"}, memberNames(second)); diff != "" {
			t.Errorf("second page (-want +got):\n%s", diff)
		}
	})

	t.Run("order by a select field pages by cursor", func(t *testing.T) {
		order := []records.OrderBy{{Field: "dateFormat", Direction: "AscNullsLast"}}
		first, err := members.Find(t.Context(), records.Filter{}, order, records.PageRequest{First: 2})
		if err != nil {
			t.Fatalf("Find first page: %v", err)
		}
		rest, err := members.Find(t.Context(), records.Filter{}, order, records.PageRequest{First: 5, After: first.EndCursor})
		if err != nil {
			t.Fatalf("Find rest: %v", err)
		}
		if got := len(first.Records) + len(rest.Records); got != 3 {
			t.Errorf("records across pages = %d, want 3", got)
		}
	})

	t.Run("update changes only the given fields", func(t *testing.T) {
		locale := "fr"
		updated, err := members.Update(t.Context(), actor, ada.ID, records.WorkspaceMemberInput{Locale: &locale})
		if err != nil {
			t.Fatalf("Update: %v", err)
		}
		if updated.Locale != "fr" || updated.Name.FirstName != "Ada" || updated.DateFormat != "DAY_FIRST" {
			t.Errorf("Update = %+v, want locale fr with name and date format kept", updated)
		}
		if _, err := members.Update(t.Context(), actor, uuid.NewString(), records.WorkspaceMemberInput{}); !errors.Is(err, records.ErrNotFound) {
			t.Errorf("Update(missing) error = %v, want ErrNotFound", err)
		}
	})

	t.Run("aggregates and groups by select field", func(t *testing.T) {
		result, err := members.Aggregate(t.Context(), records.Filter{}, []records.Aggregate{{Field: "id", Operation: "count"}, {Field: "name", Operation: "countNotEmpty"}})
		if err != nil {
			t.Fatalf("Aggregate: %v", err)
		}
		if diff := cmp.Diff(records.AggregateResult{"totalCount": int64(3), "countNotEmptyName": int64(3)}, result); diff != "" {
			t.Errorf("Aggregate (-want +got):\n%s", diff)
		}
		groups, err := members.GroupBy(t.Context(), records.Filter{}, []records.GroupBy{{Field: "dateFormat"}}, nil, []records.Aggregate{{Field: "id", Operation: "count"}}, records.PageRequest{First: 10})
		if err != nil {
			t.Fatalf("GroupBy: %v", err)
		}
		var got []string
		for _, group := range groups {
			got = append(got, group.Key[0].(string)+":"+string(rune('0'+len(group.Records.Records))))
		}
		slices.Sort(got)
		if diff := cmp.Diff([]string{"DAY_FIRST:2", "SYSTEM:1"}, got); diff != "" {
			t.Errorf("groups (-want +got):\n%s", diff)
		}
	})

	t.Run("soft delete, restore and destroy", func(t *testing.T) {
		if err := members.SoftDelete(t.Context(), ada.ID); err != nil {
			t.Fatalf("SoftDelete: %v", err)
		}
		page, err := members.Find(t.Context(), records.Filter{}, nil, records.PageRequest{})
		if err != nil || page.TotalCount != 2 {
			t.Errorf("Find after delete = %d records, %v; want 2", page.TotalCount, err)
		}
		if err := members.Restore(t.Context(), ada.ID); err != nil {
			t.Fatalf("Restore: %v", err)
		}
		if err := members.Destroy(t.Context(), ada.ID); err != nil {
			t.Fatalf("Destroy: %v", err)
		}
		if _, err := members.Get(t.Context(), ada.ID); !errors.Is(err, records.ErrNotFound) {
			t.Errorf("Get after destroy error = %v, want ErrNotFound", err)
		}
	})
}
