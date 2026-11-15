package authgql_test

import (
	"bytes"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/google/go-cmp/cmp"

	"github.com/twentyhq/twenty/packages/twenty-server-go/internal/auth"
	"github.com/twentyhq/twenty/packages/twenty-server-go/internal/golden"
)

const (
	currentUserQuery  = `query GetCurrentUser { currentUser { id onboardingStatus currentWorkspace { id } availableWorkspaces { availableWorkspacesForSignIn { id loginToken } } userVars } }`
	acmeApplicationID = "20202020-0687-4c41-b707-ed1bfca972a7"
	memberDefaultRole = "d1000000-0000-4000-8000-000000000001"
)

func (h *loginHarness) asPrincipal(principal auth.Principal) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		h.handler.ServeHTTP(w, r.WithContext(auth.WithPrincipal(r.Context(), principal)))
	})
}

func (h *loginHarness) activateAcme(t *testing.T) {
	t.Helper()
	h.exec(t, `UPDATE core.application SET "universalIdentifier" = 'b2000000-0000-4000-8000-000000000001', "createdAt" = '2026-01-02T03:04:05Z', logo = 'icon.svg' WHERE id = $1`, acmeApplicationID)
	h.exec(t, `INSERT INTO core.role (id, label, "canReadAllObjectRecords", "workspaceId", "universalIdentifier", "applicationId") VALUES ($1, 'Member', true, $2, gen_random_uuid(), $3)`,
		memberDefaultRole, acmeWorkspaceID, acmeApplicationID)
	h.exec(t, `UPDATE core.workspace SET "activationStatus" = 'ACTIVE', "databaseSchema" = 'workspace_acme', "defaultRoleId" = $1 WHERE id = $2`, memberDefaultRole, acmeWorkspaceID)
	h.exec(t, `INSERT INTO core."featureFlag" (key, "workspaceId", value) VALUES ('IS_JSON_FILTER_ENABLED', $1, true), ('NOT_A_SHARED_FLAG', $1, true)`, acmeWorkspaceID)
	h.exec(t, `INSERT INTO core."keyValuePair" ("userId", "workspaceId", key, value) VALUES
		($1, $2, 'ONBOARDING_CONNECT_ACCOUNT_PENDING', 'true'),
		($1, $2, 'ONBOARDING_INVITE_TEAM_PENDING', 'true'),
		(NULL, $2, 'ACCOUNTS_TO_RECONNECT_EMAIL_ALIASES', '["workspace@example.com"]'),
		($1, $2, 'ACCOUNTS_TO_RECONNECT_EMAIL_ALIASES', '["user@example.com"]')`, memberUserID, acmeWorkspaceID)
}

func memberPrincipal(provider auth.AuthProvider) auth.Principal {
	return auth.Principal{UserID: memberUserID, WorkspaceID: acmeWorkspaceID, AuthProvider: provider}
}

func TestCurrentUser_MatchesGolden(t *testing.T) {
	t.Parallel()
	h := newPasswordHarness(t, false)
	h.activateAcme(t)
	golden.Assert(t, h.asPrincipal(memberPrincipal("password")), "testdata/golden", "current-user",
		"data.currentUser.availableWorkspaces.availableWorkspacesForSignIn.*.loginToken")
}

func TestCurrentUser(t *testing.T) {
	t.Parallel()

	t.Run("a workspace-agnostic session has no workspace, onboarding status or user vars", func(t *testing.T) {
		t.Parallel()
		h := newPasswordHarness(t, false)
		h.activateAcme(t)
		got := h.currentUserAs(t, auth.Principal{UserID: memberUserID, AuthProvider: "password"})
		user := got["data"].(map[string]any)["currentUser"].(map[string]any)
		want := map[string]any{"onboardingStatus": nil, "currentWorkspace": nil, "userVars": map[string]any{}}
		for key, wantValue := range want {
			if diff := cmp.Diff(wantValue, user[key]); diff != "" {
				t.Errorf("%s (-want +got):\n%s", key, diff)
			}
		}
	})

	t.Run("a non-password session gets no login tokens", func(t *testing.T) {
		t.Parallel()
		h := newPasswordHarness(t, false)
		got := h.currentUserAs(t, memberPrincipal("google"))
		signIn := got["data"].(map[string]any)["currentUser"].(map[string]any)["availableWorkspaces"].(map[string]any)["availableWorkspacesForSignIn"].([]any)
		for _, workspace := range signIn {
			if token := workspace.(map[string]any)["loginToken"]; token != nil {
				t.Errorf("loginToken = %v, want null", token)
			}
		}
	})

	t.Run("an API key caller is unauthenticated", func(t *testing.T) {
		t.Parallel()
		h := newPasswordHarness(t, false)
		got := h.currentUserAs(t, auth.Principal{APIKeyID: "key", WorkspaceID: acmeWorkspaceID})
		extensions := errorOf(t, got)["extensions"].(map[string]any)
		if extensions["code"] != "UNAUTHENTICATED" {
			t.Errorf("code = %v, want UNAUTHENTICATED", extensions["code"])
		}
	})

	t.Run("a user outside the principal's workspace is an internal error", func(t *testing.T) {
		t.Parallel()
		h := newPasswordHarness(t, false)
		got := h.currentUserAs(t, auth.Principal{UserID: outsiderUserID, WorkspaceID: acmeWorkspaceID, AuthProvider: "password"})
		extensions := errorOf(t, got)["extensions"].(map[string]any)
		if extensions["code"] != "INTERNAL_SERVER_ERROR" {
			t.Errorf("code = %v, want INTERNAL_SERVER_ERROR", extensions["code"])
		}
	})
}

func (h *loginHarness) currentUserAs(t *testing.T, principal auth.Principal) map[string]any {
	t.Helper()
	body, err := json.Marshal(map[string]any{"query": currentUserQuery})
	if err != nil {
		t.Fatal(err)
	}
	request := httptest.NewRequest(http.MethodPost, "/metadata", bytes.NewReader(body))
	request.Header.Set("Content-Type", "application/json")
	recorder := httptest.NewRecorder()
	h.asPrincipal(principal).ServeHTTP(recorder, request)
	var decoded map[string]any
	if err := json.Unmarshal(recorder.Body.Bytes(), &decoded); err != nil {
		t.Fatalf("decode %s: %v", recorder.Body.String(), err)
	}
	return decoded
}
