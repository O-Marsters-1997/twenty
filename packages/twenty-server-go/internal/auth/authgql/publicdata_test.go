package authgql_test

import (
	"net/http"
	"regexp"
	"testing"

	"github.com/google/go-cmp/cmp"

	"github.com/twentyhq/twenty/packages/twenty-server-go/internal/auth"
	"github.com/twentyhq/twenty/packages/twenty-server-go/internal/golden"
)

const janeUserID = "a1000000-0000-4000-8000-000000000007"

func (h *loginHarness) authenticatedAs(principal auth.Principal) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		h.handler.ServeHTTP(w, r.WithContext(auth.WithPrincipal(r.Context(), principal)))
	})
}

func TestPublicWorkspaceData_MatchesGolden(t *testing.T) {
	t.Parallel()
	tests := []struct {
		name   string
		setup  func(*testing.T, *loginHarness)
		ignore []string
	}{
		{name: "get-public-workspace-data-by-domain"},
		{name: "get-public-workspace-data-by-id"},
		{name: "get-workspace-from-invite-hash", setup: func(t *testing.T, h *loginHarness) {
			h.exec(t, `UPDATE core.workspace SET "inviteHash" = 'acme-hash' WHERE id = $1`, acmeWorkspaceID)
		}},
		{name: "check-user-exists"},
		{name: "check-user-exists-unknown"},
		{name: "check-workspace-subdomain-availability-taken"},
		{name: "check-workspace-subdomain-availability-free"},
		{name: "check-workspace-subdomain-availability-reserved", ignore: []string{
			"data.checkWorkspaceSubdomainAvailability.suggestedSubdomain", "data.checkWorkspaceSubdomainAvailability.suggestedSubdomains",
		}},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()
			h := newPasswordHarness(t, false)
			if tt.setup != nil {
				tt.setup(t, h)
			}
			golden.Assert(t, h.handler, "testdata/golden", tt.name, tt.ignore...)
		})
	}
}

func TestWorkspaceData_MatchesGolden(t *testing.T) {
	t.Parallel()

	t.Run("get-workspace-creation-defaults", func(t *testing.T) {
		t.Parallel()
		h := newPasswordHarness(t, false)
		h.user(t, janeUserID, "jane@initech.io", true, true)
		golden.Assert(t, h.authenticatedAs(auth.Principal{UserID: janeUserID}), "testdata/golden", "get-workspace-creation-defaults")
	})

	t.Run("get-workspace-iframe-origins", func(t *testing.T) {
		t.Parallel()
		h := newPasswordHarness(t, false)
		h.exec(t, `UPDATE core.workspace SET "allowedIframeOrigins" = ARRAY['https://a.example', 'https://b.example'] WHERE id = $1`, acmeWorkspaceID)
		golden.Assert(t, h.authenticatedAs(auth.Principal{WorkspaceID: acmeWorkspaceID}), "testdata/golden", "get-workspace-iframe-origins")
	})
}

func TestPublicWorkspaceData(t *testing.T) {
	t.Parallel()

	t.Run("signs the workspace logo", func(t *testing.T) {
		t.Parallel()
		h := newPasswordHarness(t, false)
		fileID := "b1000000-0000-4000-8000-000000000001"
		h.exec(t, `INSERT INTO core.file (id, size, "workspaceId", path) VALUES ($2, 1, $1, 'logo.png')`, acmeWorkspaceID, fileID)
		h.exec(t, `UPDATE core.workspace SET "logoFileId" = $2 WHERE id = $1`, acmeWorkspaceID, fileID)
		response, _ := h.send(t, `query GetPublicWorkspaceDataById($id: UUID!) { getPublicWorkspaceDataById(id: $id) { logo } }`, map[string]any{"id": acmeWorkspaceID})
		logo := response["data"].(map[string]any)["getPublicWorkspaceDataById"].(map[string]any)["logo"].(string)
		if !regexp.MustCompile(`^http://localhost:3000/file/core-picture/` + fileID + `\?token=.+`).MatchString(logo) {
			t.Errorf("logo = %q, want a signed core-picture url", logo)
		}
	})

	t.Run("rejects unknown workspaces with the errors Node returns", func(t *testing.T) {
		t.Parallel()
		tests := []struct {
			name      string
			query     string
			variables map[string]any
			want      map[string]any
		}{
			{"unknown id", `query Q($id: UUID!) { getPublicWorkspaceDataById(id: $id) { id } }`, map[string]any{"id": "b1000000-0000-4000-8000-000000000009"},
				map[string]any{"code": "NOT_FOUND", "subCode": "WORKSPACE_NOT_FOUND", "userFriendlyMessage": "Workspace not found."}},
			{"unknown origin", `query Q($origin: String!) { getPublicWorkspaceDataByDomain(origin: $origin) { id } }`, map[string]any{"origin": "http://nope.localhost:3001"},
				map[string]any{"code": "NOT_FOUND", "subCode": "WORKSPACE_NOT_FOUND", "userFriendlyMessage": "Workspace not found."}},
			{"unknown invite hash", `query Q($hash: String!) { findWorkspaceFromInviteHash(inviteHash: $hash) { id } }`, map[string]any{"hash": "missing"},
				map[string]any{"code": "BAD_USER_INPUT", "subCode": "INVALID_INPUT", "userFriendlyMessage": "Workspace does not exist."}},
		}
		for _, tt := range tests {
			t.Run(tt.name, func(t *testing.T) {
				t.Parallel()
				h := newPasswordHarness(t, false)
				response, _ := h.send(t, tt.query, tt.variables)
				if diff := cmp.Diff(tt.want, errorOf(t, response)["extensions"]); diff != "" {
					t.Errorf("extensions (-want +got):\n%s", diff)
				}
			})
		}
	})

	t.Run("hides the current workspace from callers without one", func(t *testing.T) {
		t.Parallel()
		h := newPasswordHarness(t, false)
		response, _ := h.send(t, `query Q { currentWorkspace { id } }`, nil)
		if diff := cmp.Diff(map[string]any{"code": "UNAUTHENTICATED"}, errorOf(t, response)["extensions"]); diff != "" {
			t.Errorf("extensions (-want +got):\n%s", diff)
		}
	})
}
