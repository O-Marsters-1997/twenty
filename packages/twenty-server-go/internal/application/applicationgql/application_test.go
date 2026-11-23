package applicationgql_test

import (
	"bytes"
	"context"
	"encoding/json"
	"io"
	"log/slog"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/twentyhq/twenty/packages/twenty-server-go/internal/application/applicationgql"
	"github.com/twentyhq/twenty/packages/twenty-server-go/internal/application/store"
	"github.com/twentyhq/twenty/packages/twenty-server-go/internal/auth"
	"github.com/twentyhq/twenty/packages/twenty-server-go/internal/golden"
	"github.com/twentyhq/twenty/packages/twenty-server-go/internal/pgtest"
)

const (
	workspaceID      = "20202020-1c25-4d02-bf25-6aeccf7ea419"
	otherWorkspaceID = "20202020-0000-4000-8000-000000000002"
	customAppID      = "c2000000-0000-4000-8000-000000000001"
	customAppUID     = "c3000000-0000-4000-8000-000000000001"
	standardAppID    = "c2000000-0000-4000-8000-000000000002"
	standardAppUID   = "c3000000-0000-4000-8000-000000000002"
	adminUserWS      = "c1000000-0000-4000-8000-000000000001"
	flaggedUserWS    = "c1000000-0000-4000-8000-000000000002"
	memberUserWS     = "c1000000-0000-4000-8000-000000000003"
	adminRoleID      = "d0000000-0000-4000-8000-000000000001"
	flaggedRoleID    = "d0000000-0000-4000-8000-000000000002"
	memberRoleID     = "d0000000-0000-4000-8000-000000000003"
)

func newHarness(t *testing.T) *pgxpool.Pool {
	t.Helper()
	pool, err := pgxpool.New(t.Context(), pgtest.New(t))
	if err != nil {
		t.Fatalf("connect: %v", err)
	}
	t.Cleanup(pool.Close)
	statements := []string{
		`SET LOCAL session_replication_role = replica`,
		`INSERT INTO core.workspace (id, subdomain, "workspaceCustomApplicationId", "defaultRoleId", "databaseSchema") VALUES ('` + workspaceID + `', 'acme', '` + customAppID + `', '` + adminRoleID + `', 'workspace_acme')`,
		`INSERT INTO core.workspace (id, subdomain, "workspaceCustomApplicationId", "defaultRoleId", "databaseSchema") VALUES ('` + otherWorkspaceID + `', 'other', '` + customAppID + `', '` + adminRoleID + `', 'workspace_other')`,
		application(customAppID, customAppUID, workspaceID, "Custom", "NULL", "2026-01-01", false),
		application(standardAppID, standardAppUID, workspaceID, "Standard", "'logo.png'", "2026-01-02", false),
		application("c2000000-0000-4000-8000-000000000003", "c3000000-0000-4000-8000-000000000003", workspaceID, "Hosted", "'https://cdn.example.com/hosted.png'", "2026-01-03", false),
		application("c2000000-0000-4000-8000-000000000004", "c3000000-0000-4000-8000-000000000004", workspaceID, "Gone", "NULL", "2026-01-04", true),
		application("c2000000-0000-4000-8000-000000000005", "c3000000-0000-4000-8000-000000000005", otherWorkspaceID, "Elsewhere", "NULL", "2026-01-05", false),
		`INSERT INTO core.role (id, label, "canUpdateAllSettings", "workspaceId", "universalIdentifier", "applicationId") VALUES ('` + adminRoleID + `', 'Admin', true, '` + workspaceID + `', gen_random_uuid(), '` + customAppID + `')`,
		`INSERT INTO core.role (id, label, "workspaceId", "universalIdentifier", "applicationId") VALUES ('` + flaggedRoleID + `', 'Apps', '` + workspaceID + `', gen_random_uuid(), '` + customAppID + `')`,
		`INSERT INTO core.role (id, label, "workspaceId", "universalIdentifier", "applicationId") VALUES ('` + memberRoleID + `', 'Member', '` + workspaceID + `', gen_random_uuid(), '` + customAppID + `')`,
		`INSERT INTO core."permissionFlag" (id, "workspaceId", "applicationId", "universalIdentifier", key, label, "permissionType") VALUES ('e0000000-0000-4000-8000-000000000001', '` + workspaceID + `', '` + customAppID + `', gen_random_uuid(), 'APPLICATIONS', 'Applications', 'SETTINGS')`,
		`INSERT INTO core."rolePermissionFlag" ("roleId", "workspaceId", "universalIdentifier", "applicationId", "permissionFlagId") VALUES ('` + flaggedRoleID + `', '` + workspaceID + `', gen_random_uuid(), '` + customAppID + `', 'e0000000-0000-4000-8000-000000000001')`,
		roleTarget(adminRoleID, adminUserWS),
		roleTarget(flaggedRoleID, flaggedUserWS),
		roleTarget(memberRoleID, memberUserWS),
		activityType("b1000000-0000-4000-8000-000000000001", workspaceID, standardAppID, "recordUpdated", "updated", "'updated'", "NULL", "NULL", "NULL", "NULL", "2026-01-01"),
		activityType("b1000000-0000-4000-8000-000000000002", workspaceID, standardAppID, "noteLinked", "linked a note", "'linked'", "'IconLink'", "'20202020-0b00-45cd-b6f6-6cd806fc6804'", "'20202020-0d1a-4f0e-8a55-1c0a2f0a2f01'", "ARRAY['20202020-0d1a-4f0e-8a55-1c0a2f0a2f02']::uuid[]", "2026-01-02"),
		activityType("b1000000-0000-4000-8000-000000000003", workspaceID, standardAppID, "recordCreated", "was created by", "'created'", "'IconCirclePlus'", "NULL", "NULL", "NULL", "2026-01-03"),
		activityType("b1000000-0000-4000-8000-000000000004", workspaceID, customAppID, "RecordArchived", "archived", "NULL", "NULL", "NULL", "NULL", "NULL", "2026-01-04"),
		activityType("b1000000-0000-4000-8000-000000000005", otherWorkspaceID, standardAppID, "recordDeleted", "deleted", "'deleted'", "NULL", "NULL", "NULL", "NULL", "2026-01-05"),
		`UPDATE core."timelineActivityType" SET overrides = '{"` + customAppUID + `": {"label": "changed", "isActive": false, "icon": null}}' WHERE id = 'b1000000-0000-4000-8000-000000000001'`,
		`UPDATE core."timelineActivityType" SET overrides = '{"isActive": false, "icon": "IconX", "label": ""}' WHERE id = 'b1000000-0000-4000-8000-000000000002'`,
		`UPDATE core."timelineActivityType" SET overrides = '{"` + standardAppUID + `": {"isActive": false}}' WHERE id = 'b1000000-0000-4000-8000-000000000003'`,
	}
	tx, err := pool.Begin(t.Context())
	if err != nil {
		t.Fatalf("begin: %v", err)
	}
	t.Cleanup(func() { _ = tx.Rollback(context.Background()) })
	for _, statement := range statements {
		if _, err := tx.Exec(t.Context(), statement); err != nil {
			t.Fatalf("seed %q: %v", statement, err)
		}
	}
	if err := tx.Commit(t.Context()); err != nil {
		t.Fatalf("commit: %v", err)
	}
	return pool
}

func application(id, universalIdentifier, workspace, name, logo, createdAt string, deleted bool) string {
	deletedAt := "NULL"
	if deleted {
		deletedAt = "now()"
	}
	return `INSERT INTO core.application (id, "universalIdentifier", name, description, version, logo, "workspaceId", "createdAt", "deletedAt", "defaultRoleId") VALUES ('` +
		id + `', '` + universalIdentifier + `', '` + name + `', 'about ` + name + `', '1.0.0', ` + logo + `, '` + workspace + `', '` + createdAt + `', ` + deletedAt + `, '` + adminRoleID + `')`
}

func roleTarget(roleID, userWorkspaceID string) string {
	return `INSERT INTO core."roleTarget" ("workspaceId", "roleId", "userWorkspaceId", "universalIdentifier", "applicationId") VALUES ('` + workspaceID + `', '` + roleID + `', '` + userWorkspaceID + `', gen_random_uuid(), '` + customAppID + `')`
}

func activityType(id, workspace, applicationID, name, label, action, icon, objectUID, relationField, triggerFields, createdAt string) string {
	return `INSERT INTO core."timelineActivityType" (id, "workspaceId", "applicationId", "universalIdentifier", name, label, action, icon, "objectUniversalIdentifier", "targetRelationFieldUniversalIdentifier", "triggerFieldUniversalIdentifiers", "createdAt", "updatedAt") VALUES ('` +
		id + `', '` + workspace + `', '` + applicationID + `', gen_random_uuid(), '` + name + `', '` + label + `', ` + action + `, ` + icon + `, ` + objectUID + `, ` + relationField + `, ` + triggerFields + `, '` + createdAt + `', '` + createdAt + `')`
}

func handler(pool *pgxpool.Pool, userWorkspaceID string) http.Handler {
	graphql := applicationgql.NewHandler(&applicationgql.Resolver{Store: store.New(pool, "http://localhost:3000")}, slog.New(slog.NewTextHandler(io.Discard, nil)))
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		principal := auth.Principal{UserID: "u", WorkspaceID: workspaceID, UserWorkspaceID: userWorkspaceID}
		graphql.ServeHTTP(w, r.WithContext(auth.WithPrincipal(r.Context(), principal)))
	})
}

func send(t *testing.T, handler http.Handler, query string) map[string]any {
	t.Helper()
	body, err := json.Marshal(map[string]any{"query": query})
	if err != nil {
		t.Fatal(err)
	}
	request := httptest.NewRequestWithContext(t.Context(), http.MethodPost, "/metadata", bytes.NewReader(body))
	request.Header.Set("Content-Type", "application/json")
	recorder := httptest.NewRecorder()
	handler.ServeHTTP(recorder, request)
	var decoded map[string]any
	if err := json.Unmarshal(recorder.Body.Bytes(), &decoded); err != nil {
		t.Fatalf("decode %s: %v", recorder.Body.String(), err)
	}
	return decoded
}

func errorCode(decoded map[string]any) any {
	errs, ok := decoded["errors"].([]any)
	if !ok {
		return nil
	}
	return errs[0].(map[string]any)["extensions"].(map[string]any)["code"]
}

func TestOperations_MatchNodeGolden(t *testing.T) {
	t.Parallel()
	for _, name := range []string{"FindManyApplications", "FindManyApplicationsForToolTable", "FindManyTimelineActivityTypes"} {
		t.Run(name, func(t *testing.T) {
			t.Parallel()
			golden.Assert(t, handler(newHarness(t), adminUserWS), "testdata", name, "data.timelineActivityTypes.*.universalIdentifier")
		})
	}
}

func TestFindManyApplications_RequiresApplicationsPermission(t *testing.T) {
	t.Parallel()
	pool := newHarness(t)
	const query = `{ findManyApplications { id } }`
	if code := errorCode(send(t, handler(pool, memberUserWS), query)); code != "FORBIDDEN" {
		t.Errorf("member error code = %v, want FORBIDDEN", code)
	}
	if got := send(t, handler(pool, flaggedUserWS), query); got["errors"] != nil {
		t.Errorf("APPLICATIONS role errors = %v, want none", got["errors"])
	}
}

func TestTimelineActivityTypes_NeedsNoPermission(t *testing.T) {
	t.Parallel()
	got := send(t, handler(newHarness(t), memberUserWS), `{ timelineActivityTypes { id } }`)
	if got["errors"] != nil {
		t.Errorf("member errors = %v, want none", got["errors"])
	}
}

func TestOperations_RequirePrincipal(t *testing.T) {
	t.Parallel()
	graphql := applicationgql.NewHandler(&applicationgql.Resolver{Store: store.New(newHarness(t), "")}, slog.New(slog.NewTextHandler(io.Discard, nil)))
	for _, query := range []string{`{ findManyApplications { id } }`, `{ timelineActivityTypes { id } }`} {
		if code := errorCode(send(t, graphql, query)); code != "UNAUTHENTICATED" {
			t.Errorf("%s error code = %v, want UNAUTHENTICATED", query, code)
		}
	}
}
