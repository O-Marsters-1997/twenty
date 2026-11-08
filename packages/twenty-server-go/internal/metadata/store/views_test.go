package store_test

import (
	"encoding/json"
	"errors"
	"testing"

	"github.com/google/go-cmp/cmp"
	"github.com/google/go-cmp/cmp/cmpopts"
	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/twentyhq/twenty/packages/twenty-server-go/internal/metadata"
	"github.com/twentyhq/twenty/packages/twenty-server-go/internal/metadata/store"
	"github.com/twentyhq/twenty/packages/twenty-server-go/internal/pgtest"
)

func newViews(t *testing.T) (*store.Views, *pgxpool.Pool) {
	t.Helper()
	pool, err := pgxpool.New(t.Context(), pgtest.New(t))
	if err != nil {
		t.Fatalf("connect: %v", err)
	}
	t.Cleanup(pool.Close)
	return store.NewViews(pool), pool
}

func personTarget(t *testing.T, pool *pgxpool.Pool) (objectID, fieldID string) {
	t.Helper()
	err := pool.QueryRow(t.Context(), `SELECT o.id::text, f.id::text FROM core."objectMetadata" o JOIN core."fieldMetadata" f ON f."objectMetadataId" = o.id WHERE o."nameSingular" = 'person' AND f.name = 'jobTitle'`).Scan(&objectID, &fieldID)
	if err != nil {
		t.Fatalf("find person metadata: %v", err)
	}
	return objectID, fieldID
}

func TestViews_List(t *testing.T) {
	t.Parallel()
	views, pool := newViews(t)
	objectID, _ := personTarget(t, pool)

	all, err := views.List(t.Context(), "", nil)
	if err != nil {
		t.Fatalf("List() error = %v", err)
	}
	forPerson, err := views.List(t.Context(), objectID, nil)
	if err != nil {
		t.Fatalf("List(person) error = %v", err)
	}
	if len(forPerson) == 0 || len(forPerson) >= len(all) {
		t.Fatalf("List(person) = %d views of %d, want a non-empty subset", len(forPerson), len(all))
	}
	for _, view := range forPerson {
		if view.ObjectMetadataID != objectID {
			t.Errorf("view %s belongs to object %s, want %s", view.ID, view.ObjectMetadataID, objectID)
		}
	}
	if len(forPerson[0].Fields) == 0 {
		t.Errorf("first person view has no fields, want its view fields loaded")
	}
}

func TestViews_createUpdateDestroyChildren(t *testing.T) {
	t.Parallel()
	views, pool := newViews(t)
	objectID, fieldID := personTarget(t, pool)
	ctx := t.Context()

	created, err := views.Create(ctx, map[string]any{"name": "Hot leads", "objectMetadataId": objectID, "icon": "IconStar", "type": "KANBAN", "position": 9.5})
	if err != nil {
		t.Fatalf("Create() error = %v", err)
	}
	if created.Type != "KANBAN" || created.Position != 9.5 || created.Visibility != "WORKSPACE" {
		t.Errorf("Create() = %+v, want KANBAN at 9.5 with default visibility", created.View)
	}

	field, err := views.Fields.Insert(ctx, map[string]any{"viewId": created.ID, "fieldMetadataId": fieldID, "size": 120.0, "position": 1.0})
	if err != nil {
		t.Fatalf("insert view field: %v", err)
	}
	filter, err := views.Filters.Insert(ctx, map[string]any{"viewId": created.ID, "fieldMetadataId": fieldID, "operand": "CONTAINS", "value": "eng"})
	if err != nil {
		t.Fatalf("insert view filter: %v", err)
	}
	if _, err := views.Sorts.Insert(ctx, map[string]any{"viewId": created.ID, "fieldMetadataId": fieldID, "direction": "DESC"}); err != nil {
		t.Fatalf("insert view sort: %v", err)
	}
	if _, err := views.Groups.Insert(ctx, map[string]any{"viewId": created.ID, "fieldValue": "Open"}); err != nil {
		t.Fatalf("insert view group: %v", err)
	}

	if _, err := views.Filters.Update(ctx, filter.ID, map[string]any{"operand": "IS", "value": []string{"a", "b"}}); err != nil {
		t.Fatalf("update view filter: %v", err)
	}
	if _, err := views.Update(ctx, created.ID, map[string]any{"name": "Warm leads", "kanbanColumnWidth": nil}); err != nil {
		t.Fatalf("Update() error = %v", err)
	}

	got, err := views.Get(ctx, created.ID)
	if err != nil {
		t.Fatalf("Get() error = %v", err)
	}
	if got.Name != "Warm leads" || len(got.Fields) != 1 || len(got.Sorts) != 1 || len(got.Groups) != 1 || len(got.Filters) != 1 {
		t.Fatalf("Get() = %+v, want renamed view with one of each child", got)
	}
	var value []string
	if err := json.Unmarshal(got.Filters[0].Value, &value); err != nil {
		t.Fatalf("decode filter value: %v", err)
	}
	if diff := cmp.Diff([]string{"a", "b"}, value); diff != "" || got.Filters[0].Operand != "IS" {
		t.Errorf("filter = %s %v (-want +got):\n%s", got.Filters[0].Operand, value, diff)
	}

	if _, err := views.Fields.Destroy(ctx, field.ID); err != nil {
		t.Fatalf("destroy view field: %v", err)
	}
	if _, err := views.Fields.Destroy(ctx, field.ID); !errors.Is(err, metadata.ErrNotFound) {
		t.Errorf("second destroy error = %v, want ErrNotFound", err)
	}
	if err := views.DeleteView(ctx, created.ID); err != nil {
		t.Fatalf("DeleteView() error = %v", err)
	}
	if _, err := views.Get(ctx, created.ID); !errors.Is(err, metadata.ErrNotFound) {
		t.Errorf("Get() after delete error = %v, want ErrNotFound", err)
	}
	var orphans int
	if err := pool.QueryRow(ctx, `SELECT count(*) FROM core."viewFilter" WHERE "viewId" = $1::uuid`, created.ID).Scan(&orphans); err != nil || orphans != 0 {
		t.Errorf("filters left after delete = %d (err %v), want 0", orphans, err)
	}
}

func TestViews_rejectsUnknownColumns(t *testing.T) {
	t.Parallel()
	views, _ := newViews(t)

	_, err := views.Create(t.Context(), map[string]any{"name": "x", "workspaceId": "y"})
	if !errors.Is(err, metadata.ErrInvalidInput) {
		t.Errorf("Create(workspaceId) error = %v, want ErrInvalidInput", err)
	}
}

func TestViews_SaveView(t *testing.T) {
	t.Parallel()
	views, pool := newViews(t)
	objectID, fieldID := personTarget(t, pool)
	ctx := t.Context()

	filterValue := json.RawMessage(`"eng"`)
	saved, err := views.SaveView(ctx, metadata.View{
		ObjectMetadataID: objectID, Name: "Saved", Type: "TABLE", Icon: "IconList", Position: 3,
		Fields:  []metadata.ViewField{{FieldMetadataID: fieldID, IsVisible: true, Size: 150, Position: 1}},
		Filters: []metadata.ViewFilter{{FieldMetadataID: fieldID, Operand: "CONTAINS", Value: filterValue}},
	})
	if err != nil {
		t.Fatalf("SaveView(new) error = %v", err)
	}
	if saved.ID == "" || len(saved.Fields) != 1 || len(saved.Filters) != 1 {
		t.Fatalf("SaveView(new) = %+v, want an id with one field and one filter", saved)
	}

	saved.Name = "Renamed"
	saved.Fields = nil
	resaved, err := views.SaveView(ctx, saved)
	if err != nil {
		t.Fatalf("SaveView(existing) error = %v", err)
	}
	want := metadata.View{ID: saved.ID, ObjectMetadataID: objectID, Name: "Renamed", Type: "TABLE", Icon: "IconList", Position: 3}
	opts := cmpopts.IgnoreFields(metadata.View{}, "Fields", "Filters", "FilterGroups", "Sorts", "Groups")
	if diff := cmp.Diff(want, resaved, opts); diff != "" {
		t.Errorf("SaveView(existing) (-want +got):\n%s", diff)
	}
	if len(resaved.Fields) != 0 || len(resaved.Filters) != 1 {
		t.Errorf("children = %d fields, %d filters, want the fields replaced by none and the filter kept", len(resaved.Fields), len(resaved.Filters))
	}

	listed, err := views.Views(ctx, objectID)
	if err != nil {
		t.Fatalf("Views() error = %v", err)
	}
	found := false
	for _, view := range listed {
		found = found || view.ID == saved.ID
	}
	if !found {
		t.Errorf("Views(person) does not include the saved view %s", saved.ID)
	}
}
