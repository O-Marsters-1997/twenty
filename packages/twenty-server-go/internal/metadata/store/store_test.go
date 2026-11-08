package store_test

import (
	"errors"
	"slices"
	"testing"

	"github.com/google/go-cmp/cmp"
	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/twentyhq/twenty/packages/twenty-server-go/internal/metadata"
	"github.com/twentyhq/twenty/packages/twenty-server-go/internal/metadata/store"
	"github.com/twentyhq/twenty/packages/twenty-server-go/internal/pgtest"
	"github.com/twentyhq/twenty/packages/twenty-server-go/internal/records"
	"github.com/twentyhq/twenty/packages/twenty-server-go/internal/workspace"
)

func newPool(t *testing.T) *pgxpool.Pool {
	t.Helper()
	pool, err := pgxpool.New(t.Context(), pgtest.New(t))
	if err != nil {
		t.Fatalf("connect: %v", err)
	}
	t.Cleanup(pool.Close)
	return pool
}

func findObject(t *testing.T, objects []metadata.ObjectMetadata, nameSingular string) metadata.ObjectMetadata {
	t.Helper()
	index := slices.IndexFunc(objects, func(object metadata.ObjectMetadata) bool { return object.NameSingular == nameSingular })
	if index < 0 {
		t.Fatalf("no %s object in %d objects", nameSingular, len(objects))
	}
	return objects[index]
}

func TestStore_Objects(t *testing.T) {
	t.Parallel()
	pool := newPool(t)
	s := store.New(pool)

	_, err := pool.Exec(t.Context(), `INSERT INTO core."objectMetadata" ("nameSingular", "namePlural", "labelSingular", "labelPlural", "targetTableName", "isActive", "workspaceId", "applicationId", "universalIdentifier")
SELECT 'rocket', 'rockets', 'Rocket', 'Rockets', '_rocket', false, w.id, w."workspaceCustomApplicationId", gen_random_uuid() FROM core.workspace w WHERE w.id = $1`, workspace.PinnedWorkspaceID)
	if err != nil {
		t.Fatalf("insert custom object: %v", err)
	}

	objects, err := s.Objects(t.Context())
	if err != nil {
		t.Fatalf("Objects() error = %v", err)
	}

	t.Run("standard object with fields", func(t *testing.T) {
		person := findObject(t, objects, "person")
		if person.IsCustom || !person.IsActive || len(person.Fields) == 0 {
			t.Fatalf("person = %+v, want active standard object with fields", person)
		}
	})

	t.Run("custom inactive object", func(t *testing.T) {
		rocket := findObject(t, objects, "rocket")
		if want := (metadata.ObjectMetadata{ID: rocket.ID, NameSingular: "rocket", NamePlural: "rockets", LabelSingular: "Rocket", LabelPlural: "Rockets", IsCustom: true}); !cmp.Equal(want, rocket) {
			t.Errorf("rocket (-want +got):\n%s", cmp.Diff(want, rocket))
		}
	})

	t.Run("relation points at the target object and field", func(t *testing.T) {
		person, company := findObject(t, objects, "person"), findObject(t, objects, "company")
		index := slices.IndexFunc(person.Fields, func(field metadata.FieldMetadata) bool { return field.Name == "company" })
		if index < 0 || person.Fields[index].Relation == nil {
			t.Fatalf("person.company relation missing")
		}
		relation := person.Fields[index].Relation
		peopleField := slices.IndexFunc(company.Fields, func(field metadata.FieldMetadata) bool { return field.ID == relation.TargetFieldMetadataID })
		want := metadata.RelationMetadata{Type: "MANY_TO_ONE", TargetObjectMetadataID: company.ID, TargetFieldMetadataID: relation.TargetFieldMetadataID}
		if diff := cmp.Diff(want, *relation); diff != "" || peopleField < 0 {
			t.Errorf("person.company relation (-want +got):\n%s\ntarget field found = %v", diff, peopleField >= 0)
		}
	})
}

func TestStore_Page(t *testing.T) {
	t.Parallel()
	s := store.New(newPool(t))
	two := 2

	first, err := s.Page(t.Context(), store.PageRequest{First: &two})
	if err != nil {
		t.Fatalf("first page: %v", err)
	}
	if len(first.Objects) != 2 || !first.HasNext || first.HasPrevious || first.Objects[0].ID <= first.Objects[1].ID {
		t.Fatalf("first page = %d objects, hasNext %v, hasPrevious %v; want 2 in id-descending order with a next page", len(first.Objects), first.HasNext, first.HasPrevious)
	}

	second, err := s.Page(t.Context(), store.PageRequest{First: &two, After: records.Cursor(first.Objects[1].ID)})
	if err != nil {
		t.Fatalf("second page: %v", err)
	}
	if !second.HasPrevious || second.Objects[0].ID >= first.Objects[1].ID {
		t.Errorf("second page starts at %s hasPrevious %v, want after %s", second.Objects[0].ID, second.HasPrevious, first.Objects[1].ID)
	}

	back, err := s.Page(t.Context(), store.PageRequest{Last: &two, Before: records.Cursor(second.Objects[0].ID)})
	if err != nil {
		t.Fatalf("backward page: %v", err)
	}
	if diff := cmp.Diff(ids(first.Objects), ids(back.Objects)); diff != "" {
		t.Errorf("backward page (-first +back):\n%s", diff)
	}

	t.Run("first with last is rejected", func(t *testing.T) {
		_, err := s.Page(t.Context(), store.PageRequest{First: &two, Last: &two})
		if !errors.Is(err, store.ErrInvalidPaging) {
			t.Errorf("Page(first+last) error = %v, want ErrInvalidPaging", err)
		}
	})
}

func ids(objects []store.ObjectDetail) []string {
	var out []string
	for _, object := range objects {
		out = append(out, object.ID)
	}
	return out
}
