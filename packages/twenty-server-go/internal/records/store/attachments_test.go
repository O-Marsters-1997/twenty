package store_test

import (
	"errors"
	"slices"
	"testing"

	"github.com/google/go-cmp/cmp"

	"github.com/twentyhq/twenty/packages/twenty-server-go/internal/records"
	"github.com/twentyhq/twenty/packages/twenty-server-go/internal/records/store"
)

func createAttachment(t *testing.T, attachments *store.Attachments, name, category, target string) records.Attachment {
	t.Helper()
	attachment, err := attachments.Create(t.Context(), actor, records.AttachmentInput{Name: &name, FileCategory: &category, TargetPersonID: &target})
	if err != nil {
		t.Fatalf("create %s: %v", name, err)
	}
	return attachment
}

func attachmentNames(page records.Page[records.Attachment]) []string {
	var names []string
	for _, attachment := range page.Records {
		names = append(names, attachment.Name)
	}
	return names
}

func TestAttachments_CreateGetUpdate(t *testing.T) {
	t.Parallel()
	pool := newPool(t)
	personID, _ := seedTargets(t, pool)
	attachments := store.NewAttachments(pool)
	created, err := attachments.Create(t.Context(), actor, records.AttachmentInput{
		Name: new("cv.pdf"), FullPath: new("/files/cv.pdf"), File: []byte(`[{"fileId":"f1","label":"cv.pdf"}]`), TargetPersonID: new(personID),
	})
	if err != nil {
		t.Fatalf("create: %v", err)
	}
	if created.FileCategory != "OTHER" {
		t.Errorf("FileCategory = %q, want default OTHER", created.FileCategory)
	}

	got, err := attachments.Get(t.Context(), created.ID)
	if err != nil {
		t.Fatalf("get: %v", err)
	}
	if diff := cmp.Diff(created, got); diff != "" {
		t.Errorf("Get differs from Create (-create +get):\n%s", diff)
	}

	editor := records.Actor{Source: "MANUAL", Name: "Eve Editor"}
	updated, err := attachments.Update(t.Context(), editor, created.ID, records.AttachmentInput{Name: new("resume.pdf"), FileCategory: new("TEXT_DOCUMENT"), TargetPersonID: new("")})
	if err != nil {
		t.Fatalf("update: %v", err)
	}
	if updated.Name != "resume.pdf" || updated.FileCategory != "TEXT_DOCUMENT" || updated.FullPath != "/files/cv.pdf" || updated.TargetPersonID != nil {
		t.Errorf("got %+v, want name and category changed and the rest kept", updated)
	}
	if updated.UpdatedBy != editor || updated.CreatedBy != actor {
		t.Errorf("got createdBy %+v updatedBy %+v, want creator kept and editor recorded", updated.CreatedBy, updated.UpdatedBy)
	}
}

func TestAttachments_SoftDeleteRestoreDestroy(t *testing.T) {
	t.Parallel()
	pool := newPool(t)
	personID, _ := seedTargets(t, pool)
	attachments := store.NewAttachments(pool)
	attachment := createAttachment(t, attachments, "one", "IMAGE", personID)
	names := func() []string {
		page, err := attachments.Find(t.Context(), records.Filter{}, nil, records.PageRequest{})
		if err != nil {
			t.Fatalf("find: %v", err)
		}
		return attachmentNames(page)
	}

	if err := attachments.SoftDelete(t.Context(), attachment.ID); err != nil {
		t.Fatalf("soft delete: %v", err)
	}
	if got := names(); len(got) != 0 {
		t.Errorf("after SoftDelete names = %v, want none", got)
	}
	if err := attachments.Restore(t.Context(), attachment.ID); err != nil {
		t.Fatalf("restore: %v", err)
	}
	if got := names(); !slices.Equal(got, []string{"one"}) {
		t.Errorf("after Restore names = %v, want [one]", got)
	}
	if err := attachments.Destroy(t.Context(), attachment.ID); err != nil {
		t.Fatalf("destroy: %v", err)
	}
	if _, err := attachments.Get(t.Context(), attachment.ID); !errors.Is(err, records.ErrNotFound) {
		t.Errorf("Get after Destroy error = %v, want ErrNotFound", err)
	}
}

func TestAttachments_FindFiltersSortsAndPages(t *testing.T) {
	t.Parallel()
	pool := newPool(t)
	personID, otherPersonID := seedTargets(t, pool)
	attachments := store.NewAttachments(pool)
	createAttachment(t, attachments, "a", "IMAGE", personID)
	createAttachment(t, attachments, "b", "IMAGE", personID)
	createAttachment(t, attachments, "c", "VIDEO", personID)
	createAttachment(t, attachments, "d", "IMAGE", otherPersonID)
	images := records.Filter{And: []records.Filter{fieldFilter("targetPersonId", "", "eq", personID), fieldFilter("fileCategory", "", "eq", "IMAGE")}}
	byName := []records.OrderBy{{Field: "name", Direction: "DescNullsLast"}}

	first, err := attachments.Find(t.Context(), images, byName, records.PageRequest{First: 1})
	if err != nil {
		t.Fatalf("find first page: %v", err)
	}
	if got := attachmentNames(first); !slices.Equal(got, []string{"b"}) || first.TotalCount != 2 || !first.HasNext {
		t.Errorf("first page = %v total %d hasNext %v, want [b] total 2 hasNext", got, first.TotalCount, first.HasNext)
	}
	second, err := attachments.Find(t.Context(), images, byName, records.PageRequest{First: 1, After: first.EndCursor})
	if err != nil {
		t.Fatalf("find second page: %v", err)
	}
	if got := attachmentNames(second); !slices.Equal(got, []string{"a"}) || second.HasNext {
		t.Errorf("second page = %v hasNext %v, want [a] last page", got, second.HasNext)
	}
}

func TestAttachments_AggregateAndGroupBy(t *testing.T) {
	t.Parallel()
	pool := newPool(t)
	personID, _ := seedTargets(t, pool)
	attachments := store.NewAttachments(pool)
	createAttachment(t, attachments, "a", "IMAGE", personID)
	createAttachment(t, attachments, "b", "IMAGE", personID)
	createAttachment(t, attachments, "c", "VIDEO", personID)

	result, err := attachments.Aggregate(t.Context(), records.Filter{}, []records.Aggregate{
		{Field: "id", Operation: "count"}, {Field: "fileCategory", Operation: "countUniqueValues"},
	})
	if err != nil {
		t.Fatalf("aggregate: %v", err)
	}
	if diff := cmp.Diff(records.AggregateResult{"totalCount": int64(3), "countUniqueValuesFileCategory": int64(2)}, result); diff != "" {
		t.Errorf("Aggregate (-want +got):\n%s", diff)
	}

	groups, err := attachments.GroupBy(t.Context(), records.Filter{}, []records.GroupBy{{Field: "fileCategory"}}, nil,
		[]records.Aggregate{{Field: "id", Operation: "count"}}, records.PageRequest{First: 10})
	if err != nil {
		t.Fatalf("group by: %v", err)
	}
	sizes := map[any]int64{}
	for _, group := range groups {
		sizes[group.Key[0]] = group.Aggregates["totalCount"].(int64)
	}
	if diff := cmp.Diff(map[any]int64{"IMAGE": 2, "VIDEO": 1}, sizes); diff != "" {
		t.Errorf("group sizes (-want +got):\n%s", diff)
	}
}
