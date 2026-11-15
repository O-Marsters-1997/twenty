package workspacegql_test

import (
	"bytes"
	"encoding/json"
	"io"
	"log/slog"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/google/go-cmp/cmp"
	"github.com/jackc/pgx/v5/pgxpool"

	accessstore "github.com/twentyhq/twenty/packages/twenty-server-go/internal/access/store"
	"github.com/twentyhq/twenty/packages/twenty-server-go/internal/auth"
	"github.com/twentyhq/twenty/packages/twenty-server-go/internal/golden"
	"github.com/twentyhq/twenty/packages/twenty-server-go/internal/pgtest"
	"github.com/twentyhq/twenty/packages/twenty-server-go/internal/workspace"
	workspacestore "github.com/twentyhq/twenty/packages/twenty-server-go/internal/workspace/store"
	"github.com/twentyhq/twenty/packages/twenty-server-go/internal/workspace/workspacegql"
)

const (
	adminUserID          = "0b7a6c1e-3f55-4a47-8d6e-6c1f1b7f2a01"
	adminUserWorkspaceID = "0b7a6c1e-3f55-4a47-8d6e-6c1f1b7f2a02"
	memberUserID         = "0b7a6c1e-3f55-4a47-8d6e-6c1f1b7f2a03"
	memberWorkspaceID    = "0b7a6c1e-3f55-4a47-8d6e-6c1f1b7f2a04"
)

type harness struct {
	graphql http.Handler
	pool    *pgxpool.Pool
}

func (h harness) as(userWorkspaceID string) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		principal := auth.Principal{UserID: "user-1", UserWorkspaceID: userWorkspaceID}
		h.graphql.ServeHTTP(w, r.WithContext(auth.WithPrincipal(r.Context(), principal)))
	})
}

func newHarness(t *testing.T) harness {
	t.Helper()
	pool, err := pgxpool.New(t.Context(), pgtest.New(t))
	if err != nil {
		t.Fatalf("connect: %v", err)
	}
	t.Cleanup(pool.Close)
	graphql := workspacegql.NewHandler(&workspacegql.Resolver{
		Workspaces:  workspacestore.NewWorkspaces(pool, "app", true, true),
		Permissions: accessstore.NewPermissions(pool),
	}, slog.New(slog.NewTextHandler(io.Discard, nil)))
	h := harness{graphql: graphql, pool: pool}
	h.seedSession(t, adminUserID, adminUserWorkspaceID, "Workspace admin", true)
	h.seedSession(t, memberUserID, memberWorkspaceID, "Plain member", false)
	return h
}

func (h harness) seedSession(t *testing.T, userID, userWorkspaceID, roleLabel string, canUpdateAllSettings bool) {
	t.Helper()
	statements := []string{
		`INSERT INTO core."user" (id, email) VALUES ('` + userID + `', '` + userID + `@example.com')`,
		`INSERT INTO core."userWorkspace" (id, "userId", "workspaceId") VALUES ('` + userWorkspaceID + `', '` + userID + `', '` + workspace.PinnedWorkspaceID + `')`,
	}
	for _, statement := range statements {
		if _, err := h.pool.Exec(t.Context(), statement); err != nil {
			t.Fatalf("seed session: %v", err)
		}
	}
	var roleID string
	err := h.pool.QueryRow(t.Context(), `INSERT INTO core.role (label, "workspaceId", "canUpdateAllSettings", "universalIdentifier", "applicationId")
		VALUES ($1, $2::uuid, $3, gen_random_uuid(), (SELECT "workspaceCustomApplicationId" FROM core.workspace WHERE id = $2::uuid)) RETURNING id::text`,
		roleLabel, workspace.PinnedWorkspaceID, canUpdateAllSettings).Scan(&roleID)
	if err != nil {
		t.Fatalf("seed role: %v", err)
	}
	_, err = h.pool.Exec(t.Context(), `INSERT INTO core."roleTarget" ("roleId", "userWorkspaceId", "universalIdentifier", "workspaceId", "applicationId")
		VALUES ($1::uuid, $2::uuid, gen_random_uuid(), $3::uuid, (SELECT "workspaceCustomApplicationId" FROM core.workspace WHERE id = $3::uuid))`,
		roleID, userWorkspaceID, workspace.PinnedWorkspaceID)
	if err != nil {
		t.Fatalf("seed role target: %v", err)
	}
}

func (h harness) send(t *testing.T, userWorkspaceID, operation, query string, variables map[string]any) map[string]any {
	t.Helper()
	body, err := json.Marshal(map[string]any{"operationName": operation, "query": query, "variables": variables})
	if err != nil {
		t.Fatal(err)
	}
	req := httptest.NewRequestWithContext(t.Context(), http.MethodPost, "/metadata", bytes.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	recorder := httptest.NewRecorder()
	h.as(userWorkspaceID).ServeHTTP(recorder, req)
	var decoded map[string]any
	if err := json.Unmarshal(recorder.Body.Bytes(), &decoded); err != nil {
		t.Fatalf("decode %s response: %v", operation, err)
	}
	return decoded
}

func errorCode(t *testing.T, decoded map[string]any) string {
	t.Helper()
	errs, ok := decoded["errors"].([]any)
	if !ok || len(errs) == 0 {
		t.Fatalf("response = %v, want an error", decoded)
	}
	return errs[0].(map[string]any)["extensions"].(map[string]any)["code"].(string)
}

func (h harness) updateWorkspace(t *testing.T, userWorkspaceID string, input map[string]any) map[string]any {
	t.Helper()
	return h.send(t, userWorkspaceID, "UpdateWorkspace",
		`mutation UpdateWorkspace($input: UpdateWorkspaceInput!) { updateWorkspace(data: $input) { subdomain displayName logo defaultRole { label } } }`,
		map[string]any{"input": input})
}

func (h harness) updateOrigins(t *testing.T, userWorkspaceID, operation, origin string) map[string]any {
	t.Helper()
	return h.send(t, userWorkspaceID, "UpdateWorkspaceAllowedIframeOrigins",
		`mutation UpdateWorkspaceAllowedIframeOrigins($input: UpdateWorkspaceAllowedIframeOriginsInput!) { updateWorkspaceAllowedIframeOrigins(data: $input) { allowedIframeOrigins } }`,
		map[string]any{"input": map[string]any{"operation": operation, "origin": origin}})
}

func originsOf(t *testing.T, decoded map[string]any) []any {
	t.Helper()
	if errs, bad := decoded["errors"]; bad {
		t.Fatalf("unexpected errors: %v", errs)
	}
	return decoded["data"].(map[string]any)["updateWorkspaceAllowedIframeOrigins"].(map[string]any)["allowedIframeOrigins"].([]any)
}

func TestUpdateWorkspace_matchesNodeGolden(t *testing.T) {
	t.Parallel()
	h := newHarness(t)
	golden.Assert(t, h.as(adminUserWorkspaceID), "testdata", "UpdateWorkspace")
}

func TestUpdateWorkspaceAllowedIframeOrigins_matchesNodeGolden(t *testing.T) {
	t.Parallel()
	h := newHarness(t)
	golden.Assert(t, h.as(adminUserWorkspaceID), "testdata", "UpdateWorkspaceAllowedIframeOrigins")
}

func TestUpdateWorkspace(t *testing.T) {
	t.Parallel()

	t.Run("an admin changes a field and a role name comes back", func(t *testing.T) {
		t.Parallel()
		h := newHarness(t)
		var roleID string
		if err := h.pool.QueryRow(t.Context(), `SELECT id::text FROM core.role WHERE label = 'Plain member'`).Scan(&roleID); err != nil {
			t.Fatal(err)
		}
		got := h.updateWorkspace(t, adminUserWorkspaceID, map[string]any{"displayName": "Acme", "defaultRoleId": roleID})
		want := map[string]any{"data": map[string]any{"updateWorkspace": map[string]any{
			"subdomain": got["data"].(map[string]any)["updateWorkspace"].(map[string]any)["subdomain"], "displayName": "Acme", "logo": "",
			"defaultRole": map[string]any{"label": "Plain member"},
		}}}
		if diff := cmp.Diff(want, got); diff != "" {
			t.Errorf("updateWorkspace (-want +got):\n%s", diff)
		}
	})

	t.Run("rejections", func(t *testing.T) {
		t.Parallel()
		h := newHarness(t)
		tests := []struct {
			name   string
			caller string
			input  map[string]any
			want   string
		}{
			{"member without the permission", memberWorkspaceID, map[string]any{"displayName": "Nope"}, "FORBIDDEN"},
			{"field outside the permission map", adminUserWorkspaceID, map[string]any{"isGoogleAuthBypassEnabled": true}, "FORBIDDEN"},
			{"reserved subdomain", adminUserWorkspaceID, map[string]any{"subdomain": "admin"}, "BAD_USER_INPUT"},
			{"malformed subdomain", adminUserWorkspaceID, map[string]any{"subdomain": "-bad-"}, "BAD_USER_INPUT"},
			{"default subdomain", adminUserWorkspaceID, map[string]any{"subdomain": "app"}, "BAD_USER_INPUT"},
			{"retention below the minimum", adminUserWorkspaceID, map[string]any{"eventLogRetentionDays": 0}, "BAD_USER_INPUT"},
			{"null for a required field", adminUserWorkspaceID, map[string]any{"allowImpersonation": nil}, "BAD_USER_INPUT"},
			{"unvalidated AI model pins", adminUserWorkspaceID, map[string]any{"aiEvaluationModelId": "gpt"}, "BAD_USER_INPUT"},
		}
		for _, tt := range tests {
			t.Run(tt.name, func(t *testing.T) {
				if got := errorCode(t, h.updateWorkspace(t, tt.caller, tt.input)); got != tt.want {
					t.Errorf("error code = %q, want %q", got, tt.want)
				}
			})
		}
	})

	t.Run("a nulled logo clears the stored file reference", func(t *testing.T) {
		t.Parallel()
		h := newHarness(t)
		h.updateWorkspace(t, adminUserWorkspaceID, map[string]any{"logo": nil})
		var logoFileID *string
		if err := h.pool.QueryRow(t.Context(), `SELECT "logoFileId"::text FROM core.workspace`).Scan(&logoFileID); err != nil {
			t.Fatal(err)
		}
		if logoFileID != nil {
			t.Errorf("logoFileId = %q, want NULL", *logoFileID)
		}
	})
}

func TestUpdateWorkspaceAllowedIframeOrigins(t *testing.T) {
	t.Parallel()
	h := newHarness(t)

	if diff := cmp.Diff([]any{"https://a.example.com", "http://b.example.com:8080"}, func() []any {
		h.updateOrigins(t, adminUserWorkspaceID, "add", "https://a.example.com/")
		return originsOf(t, h.updateOrigins(t, adminUserWorkspaceID, "add", "HTTP://B.example.com:8080"))
	}()); diff != "" {
		t.Errorf("origins after adds (-want +got):\n%s", diff)
	}
	if diff := cmp.Diff([]any{"https://a.example.com", "http://b.example.com:8080"}, originsOf(t, h.updateOrigins(t, adminUserWorkspaceID, "add", "https://a.example.com"))); diff != "" {
		t.Errorf("adding a duplicate (-want +got):\n%s", diff)
	}
	if diff := cmp.Diff([]any{"http://b.example.com:8080"}, originsOf(t, h.updateOrigins(t, adminUserWorkspaceID, "remove", "https://a.example.com"))); diff != "" {
		t.Errorf("origins after remove (-want +got):\n%s", diff)
	}

	rejections := []struct {
		name      string
		caller    string
		operation string
		origin    string
		want      string
	}{
		{"path", adminUserWorkspaceID, "add", "https://example.com/app", "BAD_USER_INPUT"},
		{"wildcard", adminUserWorkspaceID, "add", "https://*.example.com", "BAD_USER_INPUT"},
		{"credentials", adminUserWorkspaceID, "add", "https://user@example.com", "BAD_USER_INPUT"},
		{"unknown operation", adminUserWorkspaceID, "toggle", "https://example.com", "BAD_USER_INPUT"},
		{"member without the permission", memberWorkspaceID, "add", "https://example.com", "FORBIDDEN"},
	}
	for _, tt := range rejections {
		t.Run(tt.name, func(t *testing.T) {
			if got := errorCode(t, h.updateOrigins(t, tt.caller, tt.operation, tt.origin)); got != tt.want {
				t.Errorf("error code = %q, want %q", got, tt.want)
			}
		})
	}
}

func TestUpdateWorkspaceAllowedIframeOrigins_limit(t *testing.T) {
	t.Parallel()
	h := newHarness(t)
	for i := range 20 {
		originsOf(t, h.updateOrigins(t, adminUserWorkspaceID, "add", "https://h"+string(rune('a'+i))+".example.com"))
	}
	if got := errorCode(t, h.updateOrigins(t, adminUserWorkspaceID, "add", "https://over.example.com")); got != "BAD_USER_INPUT" {
		t.Errorf("error code = %q, want BAD_USER_INPUT", got)
	}
}
