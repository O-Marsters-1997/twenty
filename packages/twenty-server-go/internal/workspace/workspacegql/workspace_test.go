package workspacegql_test

import (
	"bytes"
	"context"
	"encoding/json"
	"io"
	"log/slog"
	"net/http"
	"net/http/httptest"
	"strconv"
	"testing"

	"github.com/google/go-cmp/cmp"
	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/twentyhq/twenty/packages/twenty-server-go/internal/auth"
	"github.com/twentyhq/twenty/packages/twenty-server-go/internal/golden"
	"github.com/twentyhq/twenty/packages/twenty-server-go/internal/pgtest"
	"github.com/twentyhq/twenty/packages/twenty-server-go/internal/workspace"
	"github.com/twentyhq/twenty/packages/twenty-server-go/internal/workspace/workspacegql"
)

const (
	workspaceID = "20202020-1c25-4d02-bf25-6aeccf7ea419"
	roleID      = "30303030-1c25-4d02-bf25-6aeccf7ea419"
	userID      = "a1000000-0000-4000-8000-000000000001"
)

type harness struct {
	handler http.Handler
	pool    *pgxpool.Pool
}

func newHarness(t *testing.T, status string) harness {
	t.Helper()
	pool, err := pgxpool.New(t.Context(), pgtest.New(t))
	if err != nil {
		t.Fatalf("connect: %v", err)
	}
	t.Cleanup(pool.Close)
	system := workspace.SettingsConfig{PasswordAuthEnabled: true}
	checkSubdomain := func(_ context.Context, subdomain string) (bool, bool, error) {
		return subdomain != "bad_one", subdomain != "taken", nil
	}
	graphql := workspacegql.NewHandler(&workspacegql.Resolver{
		Settings: workspace.NewSettings(pool, system, checkSubdomain),
		System:   system,
		LogoURL: func(_ context.Context, workspaceID, fileID string) (string, error) {
			return "http://localhost:3000/file/core-picture/" + fileID + "?w=" + workspaceID, nil
		},
	}, slog.New(slog.NewTextHandler(io.Discard, nil)))
	h := harness{pool: pool, handler: http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		graphql.ServeHTTP(w, r.WithContext(auth.WithPrincipal(r.Context(), auth.Principal{UserID: userID, WorkspaceID: workspaceID})))
	})}
	tx, err := pool.Begin(t.Context())
	if err != nil {
		t.Fatalf("begin: %v", err)
	}
	t.Cleanup(func() { _ = tx.Rollback(context.Background()) })
	statements := []string{
		`SET LOCAL session_replication_role = replica`,
		`INSERT INTO core.role (id, label, "canUpdateAllSettings", "workspaceId", "universalIdentifier", "applicationId", icon)
			VALUES ('` + roleID + `', 'Member', false, '` + workspaceID + `', gen_random_uuid(), gen_random_uuid(), 'IconUser')`,
		`INSERT INTO core.workspace (id, subdomain, "displayName", "activationStatus", "databaseSchema", "defaultRoleId", "workspaceCustomApplicationId")
			VALUES ('` + workspaceID + `', 'acme', 'Acme', '` + status + `', 'workspace_acme', '` + roleID + `', gen_random_uuid())`,
	}
	for _, statement := range statements {
		if _, err := tx.Exec(t.Context(), statement); err != nil {
			t.Fatalf("seed %q: %v", statement, err)
		}
	}
	if err := tx.Commit(t.Context()); err != nil {
		t.Fatalf("commit: %v", err)
	}
	return h
}

func (h harness) exec(t *testing.T, query string, args ...any) {
	t.Helper()
	if _, err := h.pool.Exec(t.Context(), query, args...); err != nil {
		t.Fatalf("exec %q: %v", query, err)
	}
}

func (h harness) send(t *testing.T, query string, variables map[string]any) map[string]any {
	t.Helper()
	body, err := json.Marshal(map[string]any{"query": query, "variables": variables})
	if err != nil {
		t.Fatal(err)
	}
	return post(t, h.handler, body)
}

func post(t *testing.T, handler http.Handler, body []byte) map[string]any {
	t.Helper()
	request := httptest.NewRequest(http.MethodPost, "/metadata", bytes.NewReader(body))
	request.Header.Set("Content-Type", "application/json")
	recorder := httptest.NewRecorder()
	handler.ServeHTTP(recorder, request)
	var response map[string]any
	if err := json.Unmarshal(recorder.Body.Bytes(), &response); err != nil {
		t.Fatalf("decode %s: %v", recorder.Body, err)
	}
	return response
}

func (h harness) column(t *testing.T, column string) any {
	t.Helper()
	var value any
	if err := h.pool.QueryRow(t.Context(), `SELECT `+column+` FROM core.workspace WHERE id = $1`, workspaceID).Scan(&value); err != nil {
		t.Fatal(err)
	}
	return value
}

func errorCode(response map[string]any) any {
	errs, _ := response["errors"].([]any)
	if len(errs) == 0 {
		return nil
	}
	extensions, _ := errs[0].(map[string]any)["extensions"].(map[string]any)
	return extensions["code"]
}

const (
	updateMutation = `mutation U($input: UpdateWorkspaceInput!) { updateWorkspace(data: $input) { id subdomain displayName logo } }`
	originMutation = `mutation O($input: UpdateWorkspaceAllowedIframeOriginsInput!) { updateWorkspaceAllowedIframeOrigins(data: $input) { id allowedIframeOrigins } }`
	activateQuery  = `mutation A($input: ActivateWorkspaceInput!) { activateWorkspace(data: $input) { id } }`
)

func TestOperations_MatchNodeGolden(t *testing.T) {
	t.Parallel()
	tests := []struct{ name, status string }{
		{"UpdateWorkspace", "ACTIVE"},
		{"UpdateWorkspaceAllowedIframeOrigins", "ACTIVE"},
		{"ActivateWorkspace", "PENDING_CREATION"},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()
			h := newHarness(t, tt.status)
			golden.Assert(t, h.handler, "testdata", tt.name)
		})
	}
}

func TestUpdateWorkspace(t *testing.T) {
	t.Parallel()

	t.Run("applies only the fields sent", func(t *testing.T) {
		t.Parallel()
		h := newHarness(t, "ACTIVE")
		response := h.send(t, updateMutation, map[string]any{"input": map[string]any{
			"displayName": "Renamed", "trashRetentionDays": 30, "aiModelIdByTier": map[string]any{"fast": "openai/gpt-5"},
			"editableProfileFields": []string{"email"}, "workspaceDiscoverability": "HIDDEN",
		}})
		if response["errors"] != nil {
			t.Fatalf("errors = %v", response["errors"])
		}
		got := []any{h.column(t, `"displayName"`), h.column(t, `"trashRetentionDays"`), h.column(t, `"aiModelIdByTier"->>'fast'`), h.column(t, `"workspaceDiscoverability"::text`), h.column(t, `subdomain`)}
		want := []any{"Renamed", int32(30), "openai/gpt-5", "HIDDEN", "acme"}
		if diff := cmp.Diff(want, got); diff != "" {
			t.Errorf("columns (-want +got):\n%s", diff)
		}
	})

	t.Run("clearing the logo drops the stored file", func(t *testing.T) {
		t.Parallel()
		h := newHarness(t, "ACTIVE")
		const fileID = "b1000000-0000-4000-8000-000000000001"
		h.exec(t, `INSERT INTO core.file (id, size, "workspaceId", path) VALUES ($1, 1, $2, 'logo.png')`, fileID, workspaceID)
		h.exec(t, `UPDATE core.workspace SET logo = 'x', "logoFileId" = $1 WHERE id = $2`, fileID, workspaceID)
		h.send(t, updateMutation, map[string]any{"input": map[string]any{"logo": nil}})
		if got := []any{h.column(t, `logo`), h.column(t, `"logoFileId"`)}; got[0] != nil || got[1] != nil {
			t.Errorf("logo, logoFileId = %v, want both null", got)
		}
	})

	t.Run("rejects", func(t *testing.T) {
		t.Parallel()
		tests := []struct {
			name, status string
			input        map[string]any
			wantCode     string
		}{
			{"taken subdomain", "ACTIVE", map[string]any{"subdomain": "taken"}, "CONFLICT"},
			{"invalid subdomain", "ACTIVE", map[string]any{"subdomain": "bad_one"}, "CONFLICT"},
			{"google auth the system lacks", "ACTIVE", map[string]any{"isGoogleAuthEnabled": true}, "FORBIDDEN"},
			{"field locked before activation", "PENDING_CREATION", map[string]any{"allowImpersonation": false}, "FORBIDDEN"},
			{"negative trash retention", "ACTIVE", map[string]any{"trashRetentionDays": -1}, "BAD_USER_INPUT"},
			{"event log retention above the maximum", "ACTIVE", map[string]any{"eventLogRetentionDays": 1096}, "BAD_USER_INPUT"},
			{"default role that is not a uuid", "ACTIVE", map[string]any{"defaultRoleId": "nope"}, "BAD_USER_INPUT"},
		}
		for _, tt := range tests {
			t.Run(tt.name, func(t *testing.T) {
				t.Parallel()
				h := newHarness(t, tt.status)
				if code := errorCode(h.send(t, updateMutation, map[string]any{"input": tt.input})); code != tt.wantCode {
					t.Errorf("error code = %v, want %s", code, tt.wantCode)
				}
				if got := h.column(t, `subdomain`); got != "acme" {
					t.Errorf("subdomain = %v, want unchanged", got)
				}
			})
		}
	})

	t.Run("allows displayName before activation", func(t *testing.T) {
		t.Parallel()
		h := newHarness(t, "PENDING_CREATION")
		if response := h.send(t, updateMutation, map[string]any{"input": map[string]any{"displayName": "Early", "subdomain": "fresh"}}); response["errors"] != nil {
			t.Errorf("errors = %v", response["errors"])
		}
	})
}

func TestUpdateWorkspaceAllowedIframeOrigins(t *testing.T) {
	t.Parallel()
	run := func(h harness, t *testing.T, operation, origin string) map[string]any {
		t.Helper()
		return h.send(t, originMutation, map[string]any{"input": map[string]any{"operation": operation, "origin": origin}})
	}

	t.Run("adds a normalized origin once and removes it", func(t *testing.T) {
		t.Parallel()
		h := newHarness(t, "ACTIVE")
		run(h, t, "add", "https://PORTAL.example.com:443/")
		run(h, t, "add", "https://portal.example.com")
		if got := h.column(t, `"allowedIframeOrigins"`); !cmp.Equal(got, []any{"https://portal.example.com"}) {
			t.Fatalf("origins = %v, want one portal origin", got)
		}
		run(h, t, "remove", "https://portal.example.com")
		if got := h.column(t, `"allowedIframeOrigins"`); !cmp.Equal(got, []any{}) {
			t.Errorf("origins = %v, want none", got)
		}
	})

	t.Run("rejects", func(t *testing.T) {
		t.Parallel()
		tests := []struct{ name, operation, origin string }{
			{"wildcard", "add", "https://*.example.com"},
			{"path", "add", "https://example.com/path"},
			{"replacing the list", "replace", "https://example.com"},
		}
		for _, tt := range tests {
			t.Run(tt.name, func(t *testing.T) {
				t.Parallel()
				h := newHarness(t, "ACTIVE")
				if code := errorCode(run(h, t, tt.operation, tt.origin)); code != "BAD_USER_INPUT" {
					t.Errorf("error code = %v, want BAD_USER_INPUT", code)
				}
			})
		}
	})

	t.Run("caps the list", func(t *testing.T) {
		t.Parallel()
		h := newHarness(t, "ACTIVE")
		for i := range workspace.MaxAllowedIframeOrigins {
			run(h, t, "add", "https://site"+strconv.Itoa(i)+".example.com")
		}
		if code := errorCode(run(h, t, "add", "https://overflow.example.com")); code != "BAD_USER_INPUT" {
			t.Errorf("error code = %v, want BAD_USER_INPUT", code)
		}
		if run(h, t, "add", "https://site0.example.com")["errors"] != nil {
			t.Error("re-adding an existing origin at the cap failed, want a no-op")
		}
	})
}

func TestActivateWorkspace(t *testing.T) {
	t.Parallel()
	activate := func(h harness, t *testing.T) map[string]any {
		t.Helper()
		return h.send(t, activateQuery, map[string]any{"input": map[string]any{}})
	}

	t.Run("activates a pending workspace", func(t *testing.T) {
		t.Parallel()
		h := newHarness(t, "PENDING_CREATION")
		if response := activate(h, t); response["errors"] != nil {
			t.Fatalf("errors = %v", response["errors"])
		}
		if got := h.column(t, `"activationStatus"::text`); got != "ACTIVE" {
			t.Errorf("activationStatus = %v, want ACTIVE", got)
		}
	})

	t.Run("returns the workspace again when a retry follows a lost response", func(t *testing.T) {
		t.Parallel()
		h := newHarness(t, "ACTIVE")
		if response := activate(h, t); response["errors"] != nil {
			t.Errorf("errors = %v", response["errors"])
		}
	})

	t.Run("refuses a fresh in-progress activation but reclaims a stale one", func(t *testing.T) {
		t.Parallel()
		h := newHarness(t, "ONGOING_CREATION")
		if code := errorCode(activate(h, t)); code != "INTERNAL_SERVER_ERROR" {
			t.Fatalf("error code = %v, want INTERNAL_SERVER_ERROR for a live activation", code)
		}
		h.exec(t, `UPDATE core.workspace SET "updatedAt" = now() - interval '10 minutes' WHERE id = $1`, workspaceID)
		if response := activate(h, t); response["errors"] != nil {
			t.Fatalf("errors = %v", response["errors"])
		}
		if got := h.column(t, `"activationStatus"::text`); got != "ACTIVE" {
			t.Errorf("activationStatus = %v, want ACTIVE", got)
		}
	})

	t.Run("refuses an inactive workspace", func(t *testing.T) {
		t.Parallel()
		h := newHarness(t, "INACTIVE")
		if code := errorCode(activate(h, t)); code != "INTERNAL_SERVER_ERROR" {
			t.Errorf("error code = %v, want INTERNAL_SERVER_ERROR", code)
		}
	})
}

func TestCallerWithoutAWorkspace(t *testing.T) {
	t.Parallel()
	bare := workspacegql.NewHandler(&workspacegql.Resolver{}, slog.New(slog.NewTextHandler(io.Discard, nil)))
	body, _ := json.Marshal(map[string]any{"query": activateQuery, "variables": map[string]any{"input": map[string]any{}}})
	if code := errorCode(post(t, bare, body)); code != "UNAUTHENTICATED" {
		t.Errorf("error code = %v, want UNAUTHENTICATED", code)
	}
}
