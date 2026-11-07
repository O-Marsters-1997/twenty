package migrations_test

import (
	"testing"

	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/twentyhq/twenty/packages/twenty-server-go/internal/pgtest"
	"github.com/twentyhq/twenty/packages/twenty-server-go/internal/workspace"
)

func TestBaseline(t *testing.T) {
	t.Parallel()
	pool, err := pgxpool.New(t.Context(), pgtest.New(t))
	if err != nil {
		t.Fatalf("connect: %v", err)
	}
	t.Cleanup(pool.Close)

	t.Run("seeds the pinned workspace", func(t *testing.T) {
		var databaseSchema, activationStatus string
		err := pool.QueryRow(t.Context(),
			`SELECT "databaseSchema", "activationStatus"::text FROM core.workspace WHERE id = $1`,
			workspace.PinnedWorkspaceID).Scan(&databaseSchema, &activationStatus)
		if err != nil {
			t.Fatalf("read pinned workspace: %v", err)
		}
		if databaseSchema != workspace.SchemaName() || activationStatus != "ACTIVE" {
			t.Errorf("pinned workspace = (%q, %q), want (%q, ACTIVE)", databaseSchema, activationStatus, workspace.SchemaName())
		}
	})

	t.Run("seeds the roles and metadata", func(t *testing.T) {
		var roles, objects, views int
		err := pool.QueryRow(t.Context(), `SELECT
			(SELECT count(*) FROM core.role WHERE "workspaceId" = $1),
			(SELECT count(*) FROM core."objectMetadata" WHERE "workspaceId" = $1),
			(SELECT count(*) FROM core.view WHERE "workspaceId" = $1)`,
			workspace.PinnedWorkspaceID).Scan(&roles, &objects, &views)
		if err != nil {
			t.Fatalf("count seeded rows: %v", err)
		}
		if roles != 2 || objects == 0 || views == 0 {
			t.Errorf("seeded (roles, objects, views) = (%d, %d, %d), want 2 roles and some objects and views", roles, objects, views)
		}
	})

	t.Run("creates the workspace tables and no users", func(t *testing.T) {
		var hasPerson, hasCallRecording bool
		var users int
		err := pool.QueryRow(t.Context(), `SELECT
			to_regclass(format('%I.person', $1::text)) IS NOT NULL,
			to_regclass(format('%I."callRecording"', $1::text)) IS NOT NULL,
			(SELECT count(*) FROM core."user")`,
			workspace.SchemaName()).Scan(&hasPerson, &hasCallRecording, &users)
		if err != nil {
			t.Fatalf("inspect schema: %v", err)
		}
		if !hasPerson || hasCallRecording || users != 0 {
			t.Errorf("(person, callRecording, users) = (%t, %t, %d), want (true, false, 0)", hasPerson, hasCallRecording, users)
		}
	})

	t.Run("has no call recording metadata", func(t *testing.T) {
		var count int
		err := pool.QueryRow(t.Context(), `SELECT count(*) FROM core."objectMetadata" WHERE "nameSingular" = 'callRecording'`).Scan(&count)
		if err != nil {
			t.Fatalf("count call recording metadata: %v", err)
		}
		if count != 0 {
			t.Errorf("callRecording objectMetadata rows = %d, want 0", count)
		}
	})
}
