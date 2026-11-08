package store_test

import (
	"errors"
	"testing"
	"time"

	"github.com/google/go-cmp/cmp"

	"github.com/twentyhq/twenty/packages/twenty-server-go/internal/records"
	"github.com/twentyhq/twenty/packages/twenty-server-go/internal/records/store"
)

func titles(page records.Page[records.Note]) []string {
	var got []string
	for _, note := range page.Records {
		got = append(got, note.Title)
	}
	return got
}

func TestNotes_Lifecycle(t *testing.T) {
	t.Parallel()
	notes := store.NewNotes(newPool(t))
	created, err := notes.Create(t.Context(), actor, records.NoteInput{Title: new("Plan"), Body: &records.RichText{Markdown: "# Plan"}})
	if err != nil {
		t.Fatalf("create: %v", err)
	}
	if created.Title != "Plan" || created.Body.Markdown != "# Plan" || created.CreatedBy.Name != "Ada Admin" || created.CreatedBy.Source != "MANUAL" {
		t.Fatalf("Create = %+v", created)
	}

	updated, err := notes.Update(t.Context(), actor, created.ID, records.NoteInput{Title: new("Plan v2")})
	if err != nil {
		t.Fatalf("update: %v", err)
	}
	if updated.Title != "Plan v2" || updated.Body.Markdown != "# Plan" {
		t.Errorf("Update = %+v, want the title changed and the body kept", updated)
	}

	if err := notes.SoftDelete(t.Context(), created.ID); err != nil {
		t.Fatalf("soft delete: %v", err)
	}
	page, err := notes.Find(t.Context(), records.Filter{}, nil, records.PageRequest{})
	if err != nil || len(page.Records) != 0 {
		t.Fatalf("Find after delete = %v, %v, want none", page, err)
	}
	if err := notes.Restore(t.Context(), created.ID); err != nil {
		t.Fatalf("restore: %v", err)
	}
	if err := notes.Destroy(t.Context(), created.ID); err != nil {
		t.Fatalf("destroy: %v", err)
	}
	if _, err := notes.Get(t.Context(), created.ID); !errors.Is(err, records.ErrNotFound) {
		t.Errorf("Get after destroy error = %v, want ErrNotFound", err)
	}
	if err := notes.Destroy(t.Context(), created.ID); !errors.Is(err, records.ErrNotFound) {
		t.Errorf("second Destroy error = %v, want ErrNotFound", err)
	}
}

func TestNotes_FindFiltersSortsAndPages(t *testing.T) {
	t.Parallel()
	notes := store.NewNotes(newPool(t))
	for _, title := range []string{"alpha", "beta", "gamma"} {
		if _, err := notes.Create(t.Context(), actor, records.NoteInput{Title: new(title)}); err != nil {
			t.Fatalf("create %s: %v", title, err)
		}
	}
	order := []records.OrderBy{{Field: "title", Direction: "DescNullsLast"}}

	first, err := notes.Find(t.Context(), fieldFilter("title", "", "neq", "beta"), order, records.PageRequest{First: 1})
	if err != nil {
		t.Fatalf("first page: %v", err)
	}
	if diff := cmp.Diff([]string{"gamma"}, titles(first)); diff != "" {
		t.Errorf("first page (-want +got):\n%s", diff)
	}
	if first.TotalCount != 2 || !first.HasNext {
		t.Errorf("first page = %+v, want total 2 and a next page", first)
	}
	second, err := notes.Find(t.Context(), fieldFilter("title", "", "neq", "beta"), order, records.PageRequest{First: 5, After: first.EndCursor})
	if err != nil {
		t.Fatalf("second page: %v", err)
	}
	if diff := cmp.Diff([]string{"alpha"}, titles(second)); diff != "" {
		t.Errorf("second page (-want +got):\n%s", diff)
	}

	if _, err := notes.Find(t.Context(), fieldFilter("nope", "", "eq", "x"), nil, records.PageRequest{}); !errors.Is(err, records.ErrUnknownField) {
		t.Errorf("unknown field error = %v, want ErrUnknownField", err)
	}
}

func TestNotes_AggregateAndGroupBy(t *testing.T) {
	t.Parallel()
	notes := store.NewNotes(newPool(t))
	for _, title := range []string{"a", "a", "b"} {
		if _, err := notes.Create(t.Context(), actor, records.NoteInput{Title: new(title)}); err != nil {
			t.Fatalf("create %s: %v", title, err)
		}
	}
	got, err := notes.Aggregate(t.Context(), records.Filter{}, []records.Aggregate{{Field: "title", Operation: "countUniqueValues"}, {Field: "id", Operation: "count"}})
	if err != nil {
		t.Fatalf("aggregate: %v", err)
	}
	if diff := cmp.Diff(records.AggregateResult{"countUniqueValuesTitle": int64(2), "totalCount": int64(3)}, got); diff != "" {
		t.Errorf("Aggregate (-want +got):\n%s", diff)
	}

	groups, err := notes.GroupBy(t.Context(), records.Filter{}, []records.GroupBy{{Field: "title"}}, nil,
		[]records.Aggregate{{Field: "id", Operation: "count"}}, records.PageRequest{First: 10})
	if err != nil {
		t.Fatalf("group by: %v", err)
	}
	sizes := map[any]int{}
	for _, group := range groups {
		sizes[group.Key[0]] = len(group.Records.Records)
	}
	if diff := cmp.Diff(map[any]int{"a": 2, "b": 1}, sizes); diff != "" {
		t.Errorf("records per group (-want +got):\n%s", diff)
	}
}

func TestTasks_RoundTripsDueDateAndStatus(t *testing.T) {
	t.Parallel()
	tasks := store.NewTasks(newPool(t))
	due := time.Date(2026, 12, 1, 9, 30, 0, 0, time.UTC)
	created, err := tasks.Create(t.Context(), actor, records.TaskInput{Title: new("Ship"), DueAt: &due, Status: new("IN_PROGRESS")})
	if err != nil {
		t.Fatalf("create: %v", err)
	}
	if created.DueAt == nil || !created.DueAt.Equal(due) || created.Status == nil || *created.Status != "IN_PROGRESS" || created.AssigneeID != nil {
		t.Fatalf("Create = %+v", created)
	}

	done, err := tasks.Update(t.Context(), actor, created.ID, records.TaskInput{Status: new("DONE")})
	if err != nil {
		t.Fatalf("update: %v", err)
	}
	if *done.Status != "DONE" || done.Title != "Ship" || !done.DueAt.Equal(due) {
		t.Errorf("Update = %+v, want only the status changed", done)
	}

	page, err := tasks.Find(t.Context(), fieldFilter("status", "", "eq", "DONE"), nil, records.PageRequest{})
	if err != nil || len(page.Records) != 1 {
		t.Errorf("Find by status = %v, %v, want the done task", page, err)
	}
	if _, err := tasks.Update(t.Context(), actor, created.ID, records.TaskInput{Status: new("BOGUS")}); err == nil {
		t.Error("Update with an invalid status succeeded, want an error")
	}
	if _, err := tasks.Update(t.Context(), actor, "00000000-0000-0000-0000-000000000000", records.TaskInput{Title: new("x")}); !errors.Is(err, records.ErrNotFound) {
		t.Errorf("Update of a missing task error = %v, want ErrNotFound", err)
	}
}

func TestTargets_LinkARecordToANoteOrTask(t *testing.T) {
	t.Parallel()
	pool := newPool(t)
	notes, noteTargets := store.NewNotes(pool), store.NewNoteTargets(pool)
	tasks, taskTargets := store.NewTasks(pool), store.NewTaskTargets(pool)
	person := create(t, store.NewPeople(pool), "Ada", "", "")
	note, err := notes.Create(t.Context(), actor, records.NoteInput{Title: new("n")})
	if err != nil {
		t.Fatalf("create note: %v", err)
	}
	task, err := tasks.Create(t.Context(), actor, records.TaskInput{Title: new("t")})
	if err != nil {
		t.Fatalf("create task: %v", err)
	}

	noteTarget, err := noteTargets.Create(t.Context(), actor, records.NoteTargetInput{NoteID: &note.ID, TargetPersonID: &person.ID})
	if err != nil {
		t.Fatalf("create note target: %v", err)
	}
	if diff := cmp.Diff(&note.ID, noteTarget.NoteID); diff != "" {
		t.Errorf("note target NoteID (-want +got):\n%s", diff)
	}
	if noteTarget.TargetPersonID == nil || *noteTarget.TargetPersonID != person.ID || noteTarget.TargetCompanyID != nil {
		t.Errorf("note target = %+v, want the person only", noteTarget)
	}
	page, err := noteTargets.Find(t.Context(), fieldFilter("targetPersonId", "", "eq", person.ID), nil, records.PageRequest{})
	if err != nil || len(page.Records) != 1 {
		t.Errorf("Find by target person = %v, %v, want the note target", page, err)
	}

	taskTarget, err := taskTargets.Create(t.Context(), actor, records.TaskTargetInput{TaskID: &task.ID, TargetPersonID: &person.ID})
	if err != nil {
		t.Fatalf("create task target: %v", err)
	}
	cleared, err := taskTargets.Update(t.Context(), actor, taskTarget.ID, records.TaskTargetInput{TargetPersonID: new("")})
	if err != nil {
		t.Fatalf("update task target: %v", err)
	}
	if cleared.TargetPersonID != nil || cleared.TaskID == nil {
		t.Errorf("Update = %+v, want the person cleared and the task kept", cleared)
	}
	if err := taskTargets.Destroy(t.Context(), taskTarget.ID); err != nil {
		t.Errorf("destroy: %v", err)
	}
}
