package usergql_test

import (
	"bytes"
	"context"
	"encoding/json"
	"io"
	"log/slog"
	"net/http"
	"net/http/httptest"
	"net/url"
	"testing"
	"time"

	"github.com/google/go-cmp/cmp"
	"github.com/jackc/pgx/v5/pgxpool"

	applicationstore "github.com/twentyhq/twenty/packages/twenty-server-go/internal/application/store"
	"github.com/twentyhq/twenty/packages/twenty-server-go/internal/auth"
	"github.com/twentyhq/twenty/packages/twenty-server-go/internal/golden"
	"github.com/twentyhq/twenty/packages/twenty-server-go/internal/pgtest"
	"github.com/twentyhq/twenty/packages/twenty-server-go/internal/user"
	"github.com/twentyhq/twenty/packages/twenty-server-go/internal/user/usergql"
	"github.com/twentyhq/twenty/packages/twenty-server-go/internal/workspace"
)

const (
	workspaceID     = "20202020-1c25-4d02-bf25-6aeccf7ea419"
	otherWorkspace  = "20202020-1c25-4d02-bf25-6aeccf7ea420"
	userID          = "a1000000-0000-4000-8000-000000000001"
	userWorkspaceID = "a2000000-0000-4000-8000-000000000001"
	customAppID     = "c2000000-0000-4000-8000-000000000001"
	standardAppID   = "c2000000-0000-4000-8000-000000000002"
	roleID          = "d0000000-0000-4000-8000-000000000001"
	otherRoleID     = "d0000000-0000-4000-8000-000000000002"
)

func newPool(t *testing.T) *pgxpool.Pool {
	t.Helper()
	pool, err := pgxpool.New(t.Context(), pgtest.New(t))
	if err != nil {
		t.Fatalf("connect: %v", err)
	}
	t.Cleanup(pool.Close)
	statements := []string{
		`SET LOCAL session_replication_role = replica`,
		`INSERT INTO core."user" (id, "firstName", "lastName", email, "passwordHash") VALUES ('` + userID + `', 'Tim', 'Apple', 'tim@apple.dev', 'hash')`,
		workspaceRow(workspaceID, "acme", "Acme", "ACTIVE", "'"+roleID+"'"),
		workspaceRow(otherWorkspace, "pitch", "Pitch", "ACTIVE", "'"+otherRoleID+"'"),
		`INSERT INTO core.role (id, label, "workspaceId", "universalIdentifier", "applicationId") VALUES ('` + otherRoleID + `', 'Admin', '` + otherWorkspace + `', gen_random_uuid(), '` + customAppID + `')`,
		`INSERT INTO core."userWorkspace" (id, "userId", "workspaceId") VALUES ('` + userWorkspaceID + `', '` + userID + `', '` + workspaceID + `')`,
		`INSERT INTO core."userWorkspace" ("userId", "workspaceId", "createdAt") VALUES ('` + userID + `', '` + otherWorkspace + `', now() + interval '1 second')`,
		`INSERT INTO core."featureFlag" (key, "workspaceId", value) VALUES ('IS_AI_ENABLED', '` + workspaceID + `', true)`,
		`INSERT INTO core.role (id, label, "canUpdateAllSettings", "workspaceId", "universalIdentifier", "applicationId") VALUES ('` + roleID + `', 'Admin', true, '` + workspaceID + `', gen_random_uuid(), '` + customAppID + `')`,
		application(customAppID, "Custom", "2026-01-01"),
		application(standardAppID, "Standard", "2026-01-02"),
		keyValue(`'`+userID+`'`, "ACCOUNTS_TO_RECONNECT_EMAIL_ALIASES", `'["acc-1"]'`),
		keyValue(`'`+userID+`'`, "SOME_PRIVATE_KEY", `'"secret"'`),
		keyValue(`'`+userID+`'`, "ONBOARDING_CONNECT_ACCOUNT_PENDING", `'true'`),
		keyValue("NULL", "ONBOARDING_INVITE_TEAM_PENDING", `'true'`),
	}
	tx, err := pool.Begin(t.Context())
	if err != nil {
		t.Fatalf("begin: %v", err)
	}
	defer func() { _ = tx.Rollback(context.Background()) }()
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

func workspaceRow(id, subdomain, name, status, defaultRole string) string {
	return `INSERT INTO core.workspace (id, subdomain, "displayName", "activationStatus", "workspaceCustomApplicationId", "defaultRoleId", "databaseSchema", "isPasswordAuthEnabled", "inviteHash")
		VALUES ('` + id + `', '` + subdomain + `', '` + name + `', '` + status + `', '` + customAppID + `', ` + defaultRole + `, 'workspace_` + subdomain + `', false, 'invite-` + subdomain + `')`
}

func application(id, name, createdAt string) string {
	return `INSERT INTO core.application (id, "universalIdentifier", name, "workspaceId", "createdAt", logo) VALUES ('` + id + `', gen_random_uuid(), '` + name + `', '` + workspaceID + `', '` + createdAt + `', 'logo.png')`
}

func keyValue(user, key, value string) string {
	return `INSERT INTO core."keyValuePair" ("userId", "workspaceId", key, value, type) VALUES (` + user + `, '` + workspaceID + `', '` + key + `', ` + value + `::jsonb, 'USER_VARIABLE')`
}

func newHandler(t *testing.T, pool *pgxpool.Pool, principal *auth.Principal, supportKey string) http.Handler {
	t.Helper()
	frontURL, err := url.Parse("http://localhost:3001")
	if err != nil {
		t.Fatal(err)
	}
	logins := auth.NewPasswordLogin(pool, auth.NewPasswordHasher(), nil, nil, auth.PasswordLoginConfig{
		FrontURL: frontURL, ServerURL: "http://localhost:3000", MultiWorkspace: true, FileTokenTTL: time.Hour,
	})
	graphql := usergql.NewHandler(&usergql.Resolver{
		Users:        user.NewStore(pool, logins, user.Config{GoogleAuthEnabled: true, PasswordAuthEnabled: true, SupportHMACKey: supportKey}),
		Applications: applicationstore.New(pool, "http://localhost:3000"),
		Settings:     workspace.NewSettings(pool, workspace.SettingsConfig{}, nil),
	}, slog.New(slog.NewTextHandler(io.Discard, nil)))
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if principal != nil {
			r = r.WithContext(auth.WithPrincipal(r.Context(), *principal))
		}
		graphql.ServeHTTP(w, r)
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

func TestCurrentUser_MatchesNodeGolden(t *testing.T) {
	t.Parallel()
	principal := auth.Principal{UserID: userID, WorkspaceID: workspaceID, UserWorkspaceID: userWorkspaceID}
	golden.Assert(t, newHandler(t, newPool(t), &principal, "support-key"), "testdata", "GetCurrentUser",
		"data.currentUser.currentWorkspace.installedApplications.*.id",
		"data.currentUser.currentWorkspace.installedApplications.*.universalIdentifier",
		"data.currentUser.currentWorkspace.workspaceCustomApplication.id")
}

func TestCurrentUser_WithoutWorkspaceOmitsWorkspaceScopedFields(t *testing.T) {
	t.Parallel()
	principal := auth.Principal{UserID: userID}
	got := send(t, newHandler(t, newPool(t), &principal, ""),
		`{ currentUser { supportUserHash onboardingStatus userVars currentWorkspace { id } } }`)
	want := map[string]any{"data": map[string]any{"currentUser": map[string]any{
		"supportUserHash": nil, "onboardingStatus": nil, "userVars": nil, "currentWorkspace": nil,
	}}}
	if diff := cmp.Diff(want, got); diff != "" {
		t.Errorf("currentUser differs (-want +got):\n%s", diff)
	}
}

func TestCurrentUser_RequiresUser(t *testing.T) {
	t.Parallel()
	for name, principal := range map[string]*auth.Principal{
		"no principal": nil,
		"api key":      {APIKeyID: "key", WorkspaceID: workspaceID},
	} {
		t.Run(name, func(t *testing.T) {
			t.Parallel()
			got := send(t, newHandler(t, newPool(t), principal, ""), `{ currentUser { id } }`)
			errs, _ := got["errors"].([]any)
			if len(errs) != 1 || errs[0].(map[string]any)["extensions"].(map[string]any)["code"] != "UNAUTHENTICATED" {
				t.Errorf("errors = %v, want one UNAUTHENTICATED", got["errors"])
			}
		})
	}
}
