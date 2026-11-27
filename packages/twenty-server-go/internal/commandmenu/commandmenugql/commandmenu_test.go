package commandmenugql_test

import (
	"bytes"
	"context"
	"encoding/json"
	"io"
	"log/slog"
	"net/http"
	"net/http/httptest"
	"slices"
	"strings"
	"testing"

	"github.com/google/go-cmp/cmp"
	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/twentyhq/twenty/packages/twenty-server-go/internal/auth"
	"github.com/twentyhq/twenty/packages/twenty-server-go/internal/commandmenu"
	"github.com/twentyhq/twenty/packages/twenty-server-go/internal/commandmenu/commandmenugql"
	"github.com/twentyhq/twenty/packages/twenty-server-go/internal/golden"
	"github.com/twentyhq/twenty/packages/twenty-server-go/internal/pgtest"
)

const (
	workspaceID  = "20202020-1c25-4d02-bf25-6aeccf7ea419"
	customApp    = "c2000000-0000-4000-8000-000000000001"
	customUID    = "c3000000-0000-4000-8000-000000000001"
	standardApp  = "c2000000-0000-4000-8000-000000000002"
	standardUID  = "20202020-64aa-4b6f-b003-9c74b97cee20"
	personObject = "a0000000-0000-4000-8000-000000000001"
	adminMember  = "c1000000-0000-4000-8000-000000000001"
	otherMember  = "c1000000-0000-4000-8000-000000000002"

	navigationItem = "b1000000-0000-4000-8000-000000000001"
	standardItem   = "b1000000-0000-4000-8000-000000000002"
	customItem     = "b1000000-0000-4000-8000-000000000003"
)

type permissions bool

func (p permissions) HasLayoutsPermission(context.Context, string, string) (bool, error) {
	return bool(p), nil
}

func item(fields map[string]string) string {
	columns := []string{}
	values := []string{}
	for column, value := range fields {
		columns = append(columns, `"`+column+`"`)
		values = append(values, value)
	}
	return `INSERT INTO core."commandMenuItem" ("workspaceId", "createdAt", "updatedAt", ` + strings.Join(columns, ", ") +
		`) VALUES ('` + workspaceID + `', '2026-01-01', '2026-01-01', ` + strings.Join(values, ", ") + `)`
}

func newHarness(t *testing.T) *pgxpool.Pool {
	t.Helper()
	pool, err := pgxpool.New(t.Context(), pgtest.New(t))
	if err != nil {
		t.Fatalf("connect: %v", err)
	}
	t.Cleanup(pool.Close)
	statements := []string{
		`SET LOCAL session_replication_role = replica`,
		`INSERT INTO core.workspace (id, subdomain, "workspaceCustomApplicationId", "defaultRoleId", "databaseSchema") VALUES ('` + workspaceID + `', 'acme', '` + customApp + `', gen_random_uuid(), 'workspace_acme')`,
		`INSERT INTO core.application (id, "universalIdentifier", name, "workspaceId") VALUES ('` + customApp + `', '` + customUID + `', 'Custom', '` + workspaceID + `')`,
		`INSERT INTO core.application (id, "universalIdentifier", name, "workspaceId") VALUES ('` + standardApp + `', '` + standardUID + `', 'Standard', '` + workspaceID + `')`,
		`INSERT INTO core."objectMetadata" (id, "workspaceId", "nameSingular", "namePlural", "labelSingular", "labelPlural", icon, "targetTableName", "applicationId", "universalIdentifier")
			VALUES ('` + personObject + `', '` + workspaceID + `', 'person', 'people', 'person', 'people', 'IconUser', 'person', '` + standardApp + `', gen_random_uuid())`,
		`INSERT INTO core.workflow (id, "universalIdentifier", "applicationId", "workspaceId", visibility, "createdByUserWorkspaceId") VALUES
			('f1000000-0000-4000-8000-000000000001', gen_random_uuid(), '` + customApp + `', '` + workspaceID + `', 'WORKSPACE', '` + otherMember + `'),
			('f1000000-0000-4000-8000-000000000002', gen_random_uuid(), '` + customApp + `', '` + workspaceID + `', 'PRIVATE', '` + otherMember + `')`,
		`INSERT INTO core."workflowVersion" (id, "universalIdentifier", "applicationId", "workspaceId", "coreWorkflowId", "workspaceWorkflowVersionId") VALUES
			('f2000000-0000-4000-8000-000000000001', gen_random_uuid(), '` + customApp + `', '` + workspaceID + `', 'f1000000-0000-4000-8000-000000000001', NULL),
			('f2000000-0000-4000-8000-000000000002', gen_random_uuid(), '` + customApp + `', '` + workspaceID + `', 'f1000000-0000-4000-8000-000000000002', 'f3000000-0000-4000-8000-000000000002')`,
		item(map[string]string{
			"id": `'` + navigationItem + `'`, "universalIdentifier": `'d1000000-0000-4000-8000-000000000001'`, "applicationId": `'` + standardApp + `'`,
			"label": `'Go to {objectLabelPlural}'`, "shortLabel": `'{objectLabelPlural}'`, "icon": `'{objectIcon}'`, "position": "1",
			"engineComponentKey": `'NAVIGATION'`, "navigationTargetObjectMetadataId": `'` + personObject + `'`,
		}),
		item(map[string]string{
			"id": `'` + standardItem + `'`, "universalIdentifier": `'d1000000-0000-4000-8000-000000000002'`, "applicationId": `'` + standardApp + `'`,
			"label": `'Create record'`, "shortLabel": `'Create'`, "icon": `'IconPlus'`, "position": "2", "isPinned": "true",
			"engineComponentKey": `'CREATE_NEW_RECORD'`, "availabilityType": `'GLOBAL_OBJECT_CONTEXT'`,
			"availabilityObjectMetadataId": `'` + personObject + `'`, "hotKeys": `ARRAY['c']`,
			"overrides": `'{"` + customUID + `": {"label": "Add record", "position": 5}}'::jsonb`,
		}),
		item(map[string]string{
			"id": `'` + customItem + `'`, "universalIdentifier": `'d1000000-0000-4000-8000-000000000003'`, "applicationId": `'` + customApp + `'`,
			"label": `'Settings'`, "position": "3", "engineComponentKey": `'NAVIGATION'`, "payload": `'{"path": "/settings"}'::jsonb`,
		}),
		item(map[string]string{
			"id": `'b1000000-0000-4000-8000-000000000004'`, "universalIdentifier": `'d1000000-0000-4000-8000-000000000004'`, "applicationId": `'` + customApp + `'`,
			"label": `'Run public workflow'`, "position": "4", "engineComponentKey": `'TRIGGER_WORKFLOW_VERSION'`,
			"coreWorkflowVersionId": `'f2000000-0000-4000-8000-000000000001'`,
		}),
		item(map[string]string{
			"id": `'b1000000-0000-4000-8000-000000000005'`, "universalIdentifier": `'d1000000-0000-4000-8000-000000000005'`, "applicationId": `'` + customApp + `'`,
			"label": `'Run private workflow'`, "position": "5", "engineComponentKey": `'TRIGGER_WORKFLOW_VERSION'`,
			"coreWorkflowVersionId": `'f2000000-0000-4000-8000-000000000002'`,
		}),
		item(map[string]string{
			"id": `'b1000000-0000-4000-8000-000000000006'`, "universalIdentifier": `'d1000000-0000-4000-8000-000000000006'`, "applicationId": `'` + customApp + `'`,
			"label": `'Run private legacy workflow'`, "position": "6", "engineComponentKey": `'TRIGGER_WORKFLOW_VERSION'`,
			"workflowVersionId": `'f3000000-0000-4000-8000-000000000002'`,
		}),
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

func handler(pool *pgxpool.Pool, userWorkspaceID string, canEditLayouts bool) http.Handler {
	graphql := commandmenugql.NewHandler(&commandmenugql.Resolver{
		Store: commandmenu.New(pool), Permissions: permissions(canEditLayouts),
	}, slog.New(slog.NewTextHandler(io.Discard, nil)))
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		principal := auth.Principal{UserID: "u", WorkspaceID: workspaceID, UserWorkspaceID: userWorkspaceID}
		graphql.ServeHTTP(w, r.WithContext(auth.WithPrincipal(r.Context(), principal)))
	})
}

func send(t *testing.T, handler http.Handler, query string, variables map[string]any) map[string]any {
	t.Helper()
	body, err := json.Marshal(map[string]any{"query": query, "variables": variables})
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
	for _, name := range []string{"FindManyCommandMenuItems", "UpdateCommandMenuItem", "ResetCommandMenuItem"} {
		t.Run(name, func(t *testing.T) {
			t.Parallel()
			golden.Assert(t, handler(newHarness(t), adminMember, true), "testdata", name)
		})
	}
}

func TestCommandMenuItems_HidesPrivateWorkflowItems(t *testing.T) {
	t.Parallel()
	pool := newHarness(t)
	const query = `{ commandMenuItems { id } }`
	labelsFor := func(userWorkspaceID string) []string {
		decoded := send(t, handler(pool, userWorkspaceID, false), query, nil)
		var ids []string
		for _, entry := range decoded["data"].(map[string]any)["commandMenuItems"].([]any) {
			ids = append(ids, entry.(map[string]any)["id"].(string)[len(navigationItem)-2:])
		}
		return ids
	}
	if got, want := labelsFor(adminMember), []string{"01", "02", "03", "04"}; !slices.Equal(got, want) {
		t.Errorf("another member sees %v, want %v", got, want)
	}
	if got, want := labelsFor(otherMember), []string{"01", "02", "03", "04", "05", "06"}; !slices.Equal(got, want) {
		t.Errorf("creator sees %v, want %v", got, want)
	}
}

func TestUpdateCommandMenuItem_Custom(t *testing.T) {
	t.Parallel()
	const mutation = `mutation($input: UpdateCommandMenuItemInput!) { updateCommandMenuItem(input: $input) { label position shortLabel } }`
	t.Run("a custom item changes its columns", func(t *testing.T) {
		pool := newHarness(t)
		got := send(t, handler(pool, adminMember, true), mutation, map[string]any{"input": map[string]any{"id": customItem, "label": "Prefs", "position": 9}})
		want := map[string]any{"label": "Prefs", "position": 9.0, "shortLabel": nil}
		if diff := jsonDiff(want, got["data"].(map[string]any)["updateCommandMenuItem"]); diff != "" {
			t.Errorf("updateCommandMenuItem (-want +got): %s", diff)
		}
		var column string
		if err := pool.QueryRow(t.Context(), `SELECT label FROM core."commandMenuItem" WHERE id = $1`, customItem).Scan(&column); err != nil || column != "Prefs" {
			t.Errorf("stored label = %q, %v; want Prefs", column, err)
		}
	})
	t.Run("a standard item keeps its columns and records an override", func(t *testing.T) {
		pool := newHarness(t)
		send(t, handler(pool, adminMember, true), mutation, map[string]any{"input": map[string]any{"id": navigationItem, "position": 7}})
		var column float64
		var stored string
		if err := pool.QueryRow(t.Context(), `SELECT "position", overrides::text FROM core."commandMenuItem" WHERE id = $1`, navigationItem).Scan(&column, &stored); err != nil {
			t.Fatal(err)
		}
		if column != 1 || stored != `{"`+customUID+`": {"position": 7}}` {
			t.Errorf("column = %v, overrides = %s", column, stored)
		}
	})
}

func jsonDiff(want, got any) string {
	return cmp.Diff(want, got)
}

func TestMutations_Refusals(t *testing.T) {
	t.Parallel()
	update := `mutation($input: UpdateCommandMenuItemInput!) { updateCommandMenuItem(input: $input) { id } }`
	reset := `mutation($id: UUID!) { resetCommandMenuItem(id: $id) { id } }`
	missing := "b1000000-0000-4000-8000-0000000000ff"
	tests := []struct {
		name      string
		canEdit   bool
		query     string
		variables map[string]any
		want      string
	}{
		{"update without the layouts permission", false, update, map[string]any{"input": map[string]any{"id": customItem}}, "FORBIDDEN"},
		{"reset without the layouts permission", false, reset, map[string]any{"id": customItem}, "FORBIDDEN"},
		{"update of a missing item", true, update, map[string]any{"input": map[string]any{"id": missing}}, "NOT_FOUND"},
		{"reset of a missing item", true, reset, map[string]any{"id": missing}, "NOT_FOUND"},
		{"empty label on a custom item", true, update, map[string]any{"input": map[string]any{"id": customItem, "label": ""}}, "BAD_USER_INPUT"},
		{"null position on a custom item", true, update, map[string]any{"input": map[string]any{"id": customItem, "position": nil}}, "BAD_USER_INPUT"},
		{"unknown engine key", true, update, map[string]any{"input": map[string]any{"id": customItem, "engineComponentKey": "NOPE"}}, "GRAPHQL_VALIDATION_FAILED"},
		{"engine key that breaks the workflow coherence", true, update, map[string]any{"input": map[string]any{"id": "b1000000-0000-4000-8000-000000000004", "engineComponentKey": "CREATE_NEW_RECORD"}}, "BAD_USER_INPUT"},
		{"missing availability object", true, update, map[string]any{"input": map[string]any{"id": customItem, "availabilityObjectMetadataId": missing}}, "BAD_USER_INPUT"},
		{"missing availability object on a standard item", true, update, map[string]any{"input": map[string]any{"id": navigationItem, "availabilityObjectMetadataId": missing}}, "BAD_USER_INPUT"},
		{"missing page layout", true, update, map[string]any{"input": map[string]any{"id": customItem, "pageLayoutId": missing}}, "BAD_USER_INPUT"},
		{"reset of a custom item", true, reset, map[string]any{"id": customItem}, "BAD_USER_INPUT"},
	}
	pool := newHarness(t)
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got := errorCode(send(t, handler(pool, adminMember, tt.canEdit), tt.query, tt.variables))
			if tt.want == "GRAPHQL_VALIDATION_FAILED" {
				if got == nil {
					t.Error("error = nil, want a validation failure")
				}
				return
			}
			if got != tt.want {
				t.Errorf("error code = %v, want %s", got, tt.want)
			}
		})
	}
}

func TestOperations_RequirePrincipal(t *testing.T) {
	t.Parallel()
	graphql := commandmenugql.NewHandler(&commandmenugql.Resolver{Store: commandmenu.New(newHarness(t)), Permissions: permissions(true)},
		slog.New(slog.NewTextHandler(io.Discard, nil)))
	for _, query := range []string{`{ commandMenuItems { id } }`, `mutation { resetCommandMenuItem(id: "` + standardItem + `") { id } }`} {
		if code := errorCode(send(t, graphql, query, nil)); code != "UNAUTHENTICATED" {
			t.Errorf("%s error code = %v, want UNAUTHENTICATED", query, code)
		}
	}
}
