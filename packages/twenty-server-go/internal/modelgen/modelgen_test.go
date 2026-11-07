package modelgen_test

import (
	"os"
	"path/filepath"
	"slices"
	"strings"
	"testing"

	"github.com/google/go-cmp/cmp"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/twentyhq/twenty/packages/twenty-server-go/internal/model"
	"github.com/twentyhq/twenty/packages/twenty-server-go/internal/modelgen"
	"github.com/twentyhq/twenty/packages/twenty-server-go/internal/pgtest"
	"github.com/twentyhq/twenty/packages/twenty-server-go/internal/workspace"
)

const moduleRoot = "../.."

func newPool(t *testing.T) *pgxpool.Pool {
	t.Helper()
	pool, err := pgxpool.New(t.Context(), pgtest.New(t))
	if err != nil {
		t.Fatalf("connect: %v", err)
	}
	t.Cleanup(pool.Close)
	return pool
}

func TestGenerate(t *testing.T) {
	t.Parallel()

	t.Run("matches the committed files", func(t *testing.T) {
		t.Parallel()
		files, err := modelgen.Generate(t.Context(), newPool(t), workspace.PinnedWorkspaceID, workspace.SchemaName())
		if err != nil {
			t.Fatalf("Generate() error = %v", err)
		}
		for path, want := range files {
			got, err := os.ReadFile(filepath.Join(moduleRoot, path))
			if err != nil {
				t.Errorf("read %s: %v (run go generate ./internal/model)", path, err)
				continue
			}
			if diff := cmp.Diff(string(want), string(got)); diff != "" {
				t.Errorf("%s is stale, run go generate ./internal/model (-generated +committed):\n%s", path, diff)
			}
		}
		committed, err := filepath.Glob(filepath.Join(moduleRoot, "internal/records/store/queries", "*.sql"))
		if err != nil {
			t.Fatalf("glob queries: %v", err)
		}
		for _, path := range committed {
			rel, err := filepath.Rel(moduleRoot, path)
			if err != nil {
				t.Fatalf("relative path: %v", err)
			}
			if _, ok := files[rel]; !ok {
				t.Errorf("%s has no generated counterpart, run go generate ./internal/model", rel)
			}
		}
	})

	t.Run("lists every person column with its type and subfields", func(t *testing.T) {
		t.Parallel()
		rows, err := newPool(t).Query(t.Context(), `SELECT column_name FROM information_schema.columns WHERE table_schema = $1 AND table_name = 'person'`, workspace.SchemaName())
		if err != nil {
			t.Fatalf("query columns: %v", err)
		}
		want, err := pgx.CollectRows(rows, pgx.RowTo[string])
		if err != nil {
			t.Fatalf("read columns: %v", err)
		}

		var got []string
		byName := map[string]model.Field{}
		for _, object := range model.Objects {
			if object.NameSingular != "person" {
				continue
			}
			for _, f := range object.Fields {
				byName[f.Name] = f
				for _, c := range f.Columns {
					got = append(got, c.Name)
				}
			}
		}
		slices.Sort(want)
		slices.Sort(got)
		if diff := cmp.Diff(want, got); diff != "" {
			t.Errorf("person columns (-table +model):\n%s", diff)
		}

		wantFields := []model.Field{
			{Name: "name", Type: model.TypeFullName, Columns: []model.Column{{Name: "nameFirstName", SubField: "firstName"}, {Name: "nameLastName", SubField: "lastName"}}},
			{Name: "jobTitle", Type: model.TypeText, Columns: []model.Column{{Name: "jobTitle"}}},
			{Name: "company", Type: model.TypeRelation, Columns: []model.Column{{Name: "companyId"}}},
			{Name: "position", Type: model.TypePosition, Columns: []model.Column{{Name: "position"}}},
			{Name: "createdAt", Type: model.TypeDateTime, Columns: []model.Column{{Name: "createdAt"}}},
		}
		for _, want := range wantFields {
			if diff := cmp.Diff(want, byName[want.Name]); diff != "" {
				t.Errorf("person field %s (-want +got):\n%s", want.Name, diff)
			}
		}
	})

	t.Run("picks up a new select field", func(t *testing.T) {
		t.Parallel()
		pool := newPool(t)
		ctx := t.Context()
		if _, err := pool.Exec(ctx, `ALTER TABLE `+workspace.SchemaName()+`.person ADD COLUMN "leadStatus" text`); err != nil {
			t.Fatalf("add column: %v", err)
		}
		_, err := pool.Exec(ctx, `
			INSERT INTO core."fieldMetadata" ("objectMetadataId", type, name, label, options, "isActive", "workspaceId", "universalIdentifier", "applicationId")
			SELECT o.id, 'SELECT', 'leadStatus', 'Lead status',
				'[{"value": "COLD", "position": 1}, {"value": "HOT", "position": 0}]'::jsonb,
				true, o."workspaceId", gen_random_uuid(), o."applicationId"
			FROM core."objectMetadata" o
			WHERE o."workspaceId" = $1 AND o."nameSingular" = 'person'`, workspace.PinnedWorkspaceID)
		if err != nil {
			t.Fatalf("add metadata: %v", err)
		}

		files, err := modelgen.Generate(ctx, pool, workspace.PinnedWorkspaceID, workspace.SchemaName())
		if err != nil {
			t.Fatalf("Generate() error = %v", err)
		}
		wantContent := map[string]string{
			"internal/model/objects_gen.go":             `Options: []string{"HOT", "COLD"}`,
			"internal/records/schema.graphqls":          "  leadStatus: PersonLeadStatusEnum\n",
			"internal/records/store/queries/person.sql": `"leadStatus"`,
		}
		for path, want := range wantContent {
			if !strings.Contains(string(files[path]), want) {
				t.Errorf("%s does not contain %q", path, want)
			}
		}
	})

	t.Run("rejects a column no field owns", func(t *testing.T) {
		t.Parallel()
		pool := newPool(t)
		if _, err := pool.Exec(t.Context(), `ALTER TABLE `+workspace.SchemaName()+`.person ADD COLUMN orphan text`); err != nil {
			t.Fatalf("add column: %v", err)
		}
		_, err := modelgen.Generate(t.Context(), pool, workspace.PinnedWorkspaceID, workspace.SchemaName())
		if err == nil || !strings.Contains(err.Error(), "orphan") {
			t.Errorf("Generate() error = %v, want one naming column orphan", err)
		}
	})
}
