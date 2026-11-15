package authgql_test

import (
	"bytes"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/golang-jwt/jwt/v5"
	"github.com/google/go-cmp/cmp"

	"github.com/twentyhq/twenty/packages/twenty-server-go/internal/auth"
	"github.com/twentyhq/twenty/packages/twenty-server-go/internal/golden"
)

const (
	firstSessionID  = "f0000000-0000-4000-8000-000000000001"
	secondSessionID = "f0000000-0000-4000-8000-000000000002"
	otherSessionID  = "f0000000-0000-4000-8000-000000000003"
	workspaceMember = "99999999-0000-4000-8000-000000000004"

	firstSessionToken  = "sess_first"
	secondSessionToken = "sess_second"
)

func (h *sessionHarness) seedSession(t *testing.T, id, userID, token string) {
	t.Helper()
	sum := sha256.Sum256([]byte(token))
	h.exec(t, `INSERT INTO core."userSession" (id, "tokenHash", "userId", "workspaceId", "userWorkspaceId", "authProvider", "userAgent", "ipAddress", "expiresAt", "lastActiveAt")
		VALUES ($1, $2, $3, $4, $5, 'password', 'Mozilla/5.0 (test)', '203.0.113.7', now() + interval '1 day', now())`,
		id, hex.EncodeToString(sum[:]), userID, workspaceID, uwID(userID))
}

func (h *sessionHarness) asPrincipal(principal auth.Principal) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		h.handler.ServeHTTP(w, r.WithContext(auth.WithPrincipal(r.Context(), principal)))
	})
}

func (h *sessionHarness) sendAs(t *testing.T, principal auth.Principal, query string, variables map[string]any, cookies ...*http.Cookie) (map[string]any, *httptest.ResponseRecorder) {
	t.Helper()
	body, err := json.Marshal(map[string]any{"query": query, "variables": variables})
	if err != nil {
		t.Fatal(err)
	}
	request := httptest.NewRequest(http.MethodPost, "/metadata", bytes.NewReader(body))
	request.Header.Set("Content-Type", "application/json")
	for _, cookie := range cookies {
		request.AddCookie(cookie)
	}
	recorder := httptest.NewRecorder()
	h.asPrincipal(principal).ServeHTTP(recorder, request)
	var decoded map[string]any
	if err := json.Unmarshal(recorder.Body.Bytes(), &decoded); err != nil {
		t.Fatalf("decode %s: %v", recorder.Body.String(), err)
	}
	return decoded, recorder
}

func sessionMemberPrincipal(userID string) auth.Principal {
	principal := principalFor(userID)
	principal.WorkspaceMemberID = workspaceMember
	return principal
}

func TestUserSessions_MatchesGolden(t *testing.T) {
	t.Parallel()
	tests := []struct {
		name   string
		setup  func(t *testing.T, h *sessionHarness)
		ignore []string
	}{
		{
			name: "current-user-sessions",
			setup: func(t *testing.T, h *sessionHarness) {
				h.seedSession(t, firstSessionID, freshID, firstSessionToken)
				h.seedSession(t, otherSessionID, memberID, "sess_other")
			},
			ignore: []string{"data.currentUserSessions.*.createdAt", "data.currentUserSessions.*.lastActiveAt", "data.currentUserSessions.*.expiresAt"},
		},
		{
			name:  "revoke-user-session",
			setup: func(t *testing.T, h *sessionHarness) { h.seedSession(t, firstSessionID, freshID, firstSessionToken) },
		},
		{
			name: "revoke-all-other-user-sessions",
			setup: func(t *testing.T, h *sessionHarness) {
				h.seedSession(t, firstSessionID, freshID, firstSessionToken)
				h.seedSession(t, secondSessionID, freshID, secondSessionToken)
			},
		},
		{name: "generate-transient-token", ignore: []string{"data.generateTransientToken.transientToken.token"}},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()
			h := newSessionHarness(t)
			if tt.setup != nil {
				tt.setup(t, h)
			}
			golden.Assert(t, h.asPrincipal(sessionMemberPrincipal(freshID)), "testdata/golden", tt.name, tt.ignore...)
		})
	}
}

func TestInitiateOTPProvisioning_MatchesGolden(t *testing.T) {
	t.Parallel()
	h, _ := newLoginHarness(t)
	h.exec(t, `DELETE FROM core."twoFactorAuthenticationMethod" WHERE id = $1`, memberMethodID)
	golden.Assert(t, h.handler, "testdata/golden", "initiate-otp-provisioning")
}

func TestInitiateOTPProvisioning(t *testing.T) {
	t.Parallel()
	const mutation = `mutation($loginToken: String!, $origin: String!) { initiateOTPProvisioning(loginToken: $loginToken, origin: $origin) { uri } }`

	tests := []struct {
		name      string
		variables map[string]any
		setup     func(t *testing.T, h *harness)
		wantSub   string
	}{
		{
			name:      "rejects an invalid login token",
			variables: map[string]any{"loginToken": "garbage", "origin": loginOrigin},
			wantSub:   "UNAUTHENTICATED",
		},
		{
			name:      "refuses a user whose method is already verified",
			variables: map[string]any{"loginToken": loginToken, "origin": loginOrigin},
			wantSub:   "TWO_FACTOR_AUTHENTICATION_METHOD_ALREADY_PROVISIONED",
		},
		{
			name:      "refuses enrollment reserved for a recovery code",
			variables: map[string]any{"loginToken": loginToken, "origin": loginOrigin},
			setup: func(t *testing.T, h *harness) {
				h.exec(t, `DELETE FROM core."twoFactorAuthenticationMethod" WHERE id = $1`, memberMethodID)
				h.recoveryCode(t, memberID, true)
			},
			wantSub: "RECOVERY_ENROLLMENT_RESTRICTED",
		},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()
			h, _ := newLoginHarness(t)
			if tt.setup != nil {
				tt.setup(t, h)
			}
			_, response := h.login(t, mutation, tt.variables)
			if got := h.errorExtensions(t, response)["subCode"]; got != tt.wantSub {
				t.Errorf("subCode = %v, want %v", got, tt.wantSub)
			}
		})
	}
}

func TestCurrentUserSessions(t *testing.T) {
	t.Parallel()
	const query = `query { currentUserSessions { id isCurrent } }`

	t.Run("marks the presented session and hides revoked and foreign ones", func(t *testing.T) {
		t.Parallel()
		h := newSessionHarness(t)
		h.seedSession(t, firstSessionID, freshID, firstSessionToken)
		h.seedSession(t, secondSessionID, freshID, secondSessionToken)
		h.seedSession(t, otherSessionID, memberID, "sess_other")
		h.exec(t, `UPDATE core."userSession" SET "revokedAt" = now() WHERE id = $1`, secondSessionID)

		response, _ := h.sendAs(t, sessionMemberPrincipal(freshID), query, nil, &http.Cookie{Name: sessionCookie, Value: firstSessionToken})
		want := map[string]any{"data": map[string]any{"currentUserSessions": []any{
			map[string]any{"id": firstSessionID, "isCurrent": true},
		}}}
		if diff := cmp.Diff(want, response); diff != "" {
			t.Errorf("response (-want +got):\n%s", diff)
		}
	})

	t.Run("lists nothing for a workspace-agnostic token", func(t *testing.T) {
		t.Parallel()
		h := newSessionHarness(t)
		h.seedSession(t, firstSessionID, freshID, firstSessionToken)
		response, _ := h.sendAs(t, auth.Principal{UserID: freshID}, query, nil)
		want := map[string]any{"data": map[string]any{"currentUserSessions": []any{}}}
		if diff := cmp.Diff(want, response); diff != "" {
			t.Errorf("response (-want +got):\n%s", diff)
		}
	})

	t.Run("refuses an API key caller", func(t *testing.T) {
		t.Parallel()
		h := newSessionHarness(t)
		response, _ := h.sendAs(t, auth.Principal{WorkspaceID: workspaceID, APIKeyID: "key"}, query, nil)
		if got := h.errorExtensions(t, response)["subCode"]; got != "FORBIDDEN_EXCEPTION" {
			t.Errorf("subCode = %v, want FORBIDDEN_EXCEPTION", got)
		}
	})
}

func TestRevokeUserSession(t *testing.T) {
	t.Parallel()
	const mutation = `mutation($id: UUID!) { revokeUserSession(userSessionId: $id) }`

	t.Run("revokes another session and keeps the cookie", func(t *testing.T) {
		t.Parallel()
		h := newSessionHarness(t)
		h.seedSession(t, firstSessionID, freshID, firstSessionToken)
		h.seedSession(t, secondSessionID, freshID, secondSessionToken)

		response, recorder := h.sendAs(t, sessionMemberPrincipal(freshID), mutation, map[string]any{"id": secondSessionID}, &http.Cookie{Name: sessionCookie, Value: firstSessionToken})
		if diff := cmp.Diff(map[string]any{"data": map[string]any{"revokeUserSession": true}}, response); diff != "" {
			t.Errorf("response (-want +got):\n%s", diff)
		}
		if got := h.count(t, `SELECT count(*) FROM core."userSession" WHERE id = $1 AND "revokedReason" = 'USER_REVOKED'`, secondSessionID); got != 1 {
			t.Errorf("revoked sessions = %d, want 1", got)
		}
		if len(recorder.Result().Cookies()) != 0 {
			t.Errorf("cookies = %v, want none", recorder.Result().Cookies())
		}
	})

	t.Run("clears the cookie when revoking the current session", func(t *testing.T) {
		t.Parallel()
		h := newSessionHarness(t)
		h.seedSession(t, firstSessionID, freshID, firstSessionToken)

		_, recorder := h.sendAs(t, sessionMemberPrincipal(freshID), mutation, map[string]any{"id": firstSessionID}, &http.Cookie{Name: sessionCookie, Value: firstSessionToken})
		if cleared := cookieNamed(recorder, sessionCookie); cleared == nil || cleared.MaxAge >= 0 {
			t.Errorf("session cookie = %+v, want it cleared", cleared)
		}
	})

	t.Run("answers false for a session that is already revoked", func(t *testing.T) {
		t.Parallel()
		h := newSessionHarness(t)
		h.seedSession(t, firstSessionID, freshID, firstSessionToken)
		h.exec(t, `UPDATE core."userSession" SET "revokedAt" = now(), "revokedReason" = 'USER_SIGN_OUT' WHERE id = $1`, firstSessionID)

		response, _ := h.sendAs(t, sessionMemberPrincipal(freshID), mutation, map[string]any{"id": firstSessionID})
		if diff := cmp.Diff(map[string]any{"data": map[string]any{"revokeUserSession": false}}, response); diff != "" {
			t.Errorf("response (-want +got):\n%s", diff)
		}
	})

	t.Run("refuses another user's session", func(t *testing.T) {
		t.Parallel()
		h := newSessionHarness(t)
		h.seedSession(t, otherSessionID, memberID, "sess_other")

		response, _ := h.sendAs(t, sessionMemberPrincipal(freshID), mutation, map[string]any{"id": otherSessionID})
		if got := h.errorExtensions(t, response)["subCode"]; got != "FORBIDDEN_EXCEPTION" {
			t.Errorf("subCode = %v, want FORBIDDEN_EXCEPTION", got)
		}
		if got := h.count(t, `SELECT count(*) FROM core."userSession" WHERE id = $1 AND "revokedAt" IS NULL`, otherSessionID); got != 1 {
			t.Errorf("other user's active sessions = %d, want 1", got)
		}
	})
}

func TestRevokeAllOtherUserSessions(t *testing.T) {
	t.Parallel()
	const mutation = `mutation { revokeAllOtherUserSessions }`

	h := newSessionHarness(t)
	h.seedSession(t, firstSessionID, freshID, firstSessionToken)
	h.seedSession(t, secondSessionID, freshID, secondSessionToken)
	h.seedSession(t, otherSessionID, memberID, "sess_other")

	response, _ := h.sendAs(t, sessionMemberPrincipal(freshID), mutation, nil, &http.Cookie{Name: sessionCookie, Value: firstSessionToken})
	if diff := cmp.Diff(map[string]any{"data": map[string]any{"revokeAllOtherUserSessions": float64(1)}}, response); diff != "" {
		t.Errorf("response (-want +got):\n%s", diff)
	}
	if got := h.count(t, `SELECT count(*) FROM core."userSession" WHERE "revokedAt" IS NULL`); got != 2 {
		t.Errorf("active sessions = %d, want the caller's current and the other user's", got)
	}
}

func TestGenerateTransientToken(t *testing.T) {
	t.Parallel()
	const mutation = `mutation { generateTransientToken { transientToken { token expiresAt } } }`

	t.Run("signs a LOGIN token for the workspace member", func(t *testing.T) {
		t.Parallel()
		h := newSessionHarness(t)
		response, _ := h.sendAs(t, sessionMemberPrincipal(freshID), mutation, nil)
		data, _ := response["data"].(map[string]any)
		issued, _ := data["generateTransientToken"].(map[string]any)["transientToken"].(map[string]any)
		token, _ := issued["token"].(string)
		var claims jwt.MapClaims
		if _, _, err := jwt.NewParser().ParseUnverified(token, &claims); err != nil {
			t.Fatalf("parse %v: %v", response, err)
		}
		want := jwt.MapClaims{"sub": workspaceMember, "userId": freshID, "workspaceId": workspaceID, "workspaceMemberId": workspaceMember, "type": "LOGIN"}
		for key, value := range want {
			if claims[key] != value {
				t.Errorf("claim %s = %v, want %v", key, claims[key], value)
			}
		}
	})

	t.Run("refuses a caller without a workspace member", func(t *testing.T) {
		t.Parallel()
		h := newSessionHarness(t)
		response, _ := h.sendAs(t, principalFor(freshID), mutation, nil)
		if got := h.errorExtensions(t, response)["code"]; got != "INTERNAL_SERVER_ERROR" {
			t.Errorf("code = %v, want INTERNAL_SERVER_ERROR", got)
		}
	})
}
