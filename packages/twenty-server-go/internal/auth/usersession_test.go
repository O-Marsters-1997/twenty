package auth_test

import (
	"crypto/sha256"
	"encoding/hex"
	"errors"
	"io"
	"log/slog"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	"github.com/google/go-cmp/cmp"

	"github.com/twentyhq/twenty/packages/twenty-server-go/internal/auth"
)

const (
	nodeSessionToken = "sess_abc"
	nodeSessionHash  = "57c4db2f383cac904543e460b9e355bceb781431773ff1eb55b232622802d937"
)

func TestResolveSessionCookieSecrets(t *testing.T) {
	t.Parallel()

	t.Run("matches Node's derivation", func(t *testing.T) {
		t.Parallel()
		got, err := auth.ResolveSessionCookieSecrets("primary-key", "fallback-key", "app-secret")
		if err != nil {
			t.Fatalf("ResolveSessionCookieSecrets() error = %v", err)
		}
		want := []string{
			"3d262a7fedc16580788a63a96cf99b3baa1143d1d447690dc59d76144d4b178e",
			"43aea421809752aab855e96c78d3370939dc8de946fc0d98ca738b75b8bfe1db",
			"bfdccbf143a4d81669a8196ba64db908333cdd13e788b82cc9cca1c20f662c6c",
		}
		if diff := cmp.Diff(want, got); diff != "" {
			t.Errorf("ResolveSessionCookieSecrets() (-want +got):\n%s", diff)
		}
	})

	t.Run("falls back to the app secret and fails with no key", func(t *testing.T) {
		t.Parallel()
		got, err := auth.ResolveSessionCookieSecrets("", "", "app-secret")
		if err != nil || len(got) != 2 {
			t.Errorf("ResolveSessionCookieSecrets(app secret only) = %d secrets, %v, want 2, nil", len(got), err)
		}
		if _, err := auth.ResolveSessionCookieSecrets("", "fallback-key", ""); err == nil {
			t.Error("ResolveSessionCookieSecrets(no primary key) error = nil, want an error")
		}
	})
}

type sessionRow struct {
	UserID, WorkspaceID, UserWorkspaceID, AuthProvider string
	RevokedReason                                      string
	Revoked                                            bool
}

type sessionEnv struct {
	tokenEnv
	cache *fakeCache
}

func newSessionEnv(t *testing.T) sessionEnv {
	t.Helper()
	return sessionEnv{tokenEnv: newTokenEnv(t), cache: newFakeCache()}
}

func (e sessionEnv) service(config auth.SessionConfig) *auth.UserSession {
	return auth.NewUserSession(e.pool, e.cache, e.issuer, config, slog.New(slog.NewTextHandler(io.Discard, nil)))
}

func (e sessionEnv) insertNodeSession(t *testing.T, workspaceID, userWorkspaceID string) {
	t.Helper()
	e.exec(t, `INSERT INTO core."userSession" ("tokenHash", "userId", "workspaceId", "userWorkspaceId", "authProvider", "expiresAt", "lastActiveAt")
		VALUES ($1, $2, NULLIF($3, '')::uuid, NULLIF($4, '')::uuid, 'password', now() + interval '1 day', now())`,
		nodeSessionHash, e.node.UserID, workspaceID, userWorkspaceID)
}

func (e sessionEnv) row(t *testing.T, hash string) (sessionRow, bool) {
	t.Helper()
	var row sessionRow
	var workspaceID, userWorkspaceID, reason *string
	err := e.pool.QueryRow(t.Context(),
		`SELECT "userId"::text, "workspaceId"::text, "userWorkspaceId"::text, "authProvider", "revokedAt" IS NOT NULL, "revokedReason"
		 FROM core."userSession" WHERE "tokenHash" = $1`, hash,
	).Scan(&row.UserID, &workspaceID, &userWorkspaceID, &row.AuthProvider, &row.Revoked, &reason)
	if err != nil {
		return sessionRow{}, false
	}
	row.WorkspaceID, row.UserWorkspaceID, row.RevokedReason = deref(workspaceID), deref(userWorkspaceID), deref(reason)
	return row, true
}

func deref(value *string) string {
	if value == nil {
		return ""
	}
	return *value
}

func hashOf(token string) string {
	sum := sha256.Sum256([]byte(token))
	return hex.EncodeToString(sum[:])
}

func newSessionRequest(origin string, cookies ...*http.Cookie) *http.Request {
	r := httptest.NewRequest(http.MethodPost, "http://crm.example.com/graphql", nil)
	r.Header.Set("User-Agent", "test-agent")
	if origin != "" {
		r.Header.Set("Origin", origin)
	}
	for _, cookie := range cookies {
		r.AddCookie(cookie)
	}
	return r
}

func TestUserSession_IssueForTokenPair(t *testing.T) {
	t.Parallel()
	httpConfig := auth.SessionConfig{ServerURL: "http://crm.example.com"}

	t.Run("creates a session and sets the cookie", func(t *testing.T) {
		t.Parallel()
		env := newSessionEnv(t)
		w := httptest.NewRecorder()
		pair := auth.TokenPair{AccessToken: env.node.Access}

		if err := env.service(httpConfig).IssueForTokenPair(t.Context(), w, newSessionRequest("http://crm.example.com"), pair, auth.SessionOriginSignIn); err != nil {
			t.Fatalf("IssueForTokenPair() error = %v", err)
		}
		cookies := w.Result().Cookies()
		if len(cookies) != 1 {
			t.Fatalf("IssueForTokenPair() set %d cookies, want 1", len(cookies))
		}
		cookie := cookies[0]
		if cookie.Name != "twenty-session" || !strings.HasPrefix(cookie.Value, "sess_") || !cookie.HttpOnly || cookie.Secure ||
			cookie.SameSite != http.SameSiteLaxMode || cookie.Path != "/" || cookie.MaxAge != 0 {
			t.Errorf("cookie = %+v, want an HttpOnly Lax insecure session cookie on /, with Expires only", cookie)
		}
		if remaining := time.Until(cookie.Expires); remaining < 179*24*time.Hour || remaining > 180*24*time.Hour {
			t.Errorf("cookie expires in %v, want about 180 days", remaining)
		}
		want := sessionRow{UserID: env.node.UserID, WorkspaceID: env.node.WorkspaceID, UserWorkspaceID: env.node.UserWorkspaceID, AuthProvider: "password"}
		got, found := env.row(t, hashOf(cookie.Value))
		if !found {
			t.Fatal("no userSession row stored under the sha256 hex of the cookie value")
		}
		if diff := cmp.Diff(want, got); diff != "" {
			t.Errorf("userSession row (-want +got):\n%s", diff)
		}
	})

	t.Run("an https deployment uses the __Host- cookie", func(t *testing.T) {
		t.Parallel()
		env := newSessionEnv(t)
		w := httptest.NewRecorder()
		config := auth.SessionConfig{ServerURL: "https://crm.example.com"}
		if err := env.service(config).IssueForTokenPair(t.Context(), w, newSessionRequest(""), auth.TokenPair{AccessToken: env.node.Access}, auth.SessionOriginSignIn); err != nil {
			t.Fatalf("IssueForTokenPair() error = %v", err)
		}
		cookies := w.Result().Cookies()
		if len(cookies) != 1 || cookies[0].Name != "__Host-twenty-session" || !cookies[0].Secure {
			t.Errorf("cookies = %+v, want one Secure __Host-twenty-session", cookies)
		}
	})

	t.Run("origin check", func(t *testing.T) {
		t.Parallel()
		tests := []struct {
			name   string
			config auth.SessionConfig
			origin string
			want   bool
		}{
			{"no Origin header", httpConfig, "", true},
			{"the request's own origin", httpConfig, "http://crm.example.com", true},
			{"the request's own origin spelling a default port", httpConfig, "http://crm.example.com:80", true},
			{"a stranger", httpConfig, "https://evil.example.net", false},
			{"the frontend url", auth.SessionConfig{ServerURL: "http://api.example.com", FrontendURL: "http://front.example.com"}, "http://front.example.com", true},
			{"an allow-listed origin", auth.SessionConfig{CookieAllowedOrigins: []string{"https://tenant.example.net"}}, "https://tenant.example.net", true},
			{"a derived loopback origin in production", auth.SessionConfig{ServerURL: "http://localhost:3000", Production: true}, "http://localhost:3000", false},
			{"an explicit loopback origin in production", auth.SessionConfig{CookieAllowedOrigins: []string{"http://localhost:3001"}, Production: true}, "http://localhost:3001", true},
			{"an opaque origin", httpConfig, "null", false},
		}
		for _, tt := range tests {
			t.Run(tt.name, func(t *testing.T) {
				t.Parallel()
				env := newSessionEnv(t)
				w := httptest.NewRecorder()
				err := env.service(tt.config).IssueForTokenPair(t.Context(), w, newSessionRequest(tt.origin), auth.TokenPair{AccessToken: env.node.Access}, auth.SessionOriginSignIn)
				if got := err == nil; got != tt.want {
					t.Errorf("IssueForTokenPair(origin %q) error = %v, want allowed = %v", tt.origin, err, tt.want)
				}
				if !tt.want && !errors.Is(err, auth.ErrSessionOriginForbidden) {
					t.Errorf("IssueForTokenPair(origin %q) error = %v, want ErrSessionOriginForbidden", tt.origin, err)
				}
				if !tt.want && len(w.Result().Cookies()) != 0 {
					t.Errorf("IssueForTokenPair(origin %q) set a cookie despite refusing", tt.origin)
				}
			})
		}
	})

	t.Run("supersedes the presented session on sign in", func(t *testing.T) {
		t.Parallel()
		env := newSessionEnv(t)
		env.insertNodeSession(t, env.node.WorkspaceID, env.node.UserWorkspaceID)
		w := httptest.NewRecorder()
		r := newSessionRequest("", &http.Cookie{Name: "twenty-session", Value: nodeSessionToken})

		if err := env.service(httpConfig).IssueForTokenPair(t.Context(), w, r, auth.TokenPair{AccessToken: env.node.Access}, auth.SessionOriginSignIn); err != nil {
			t.Fatalf("IssueForTokenPair() error = %v", err)
		}
		if old, _ := env.row(t, nodeSessionHash); !old.Revoked || old.RevokedReason != "SUPERSEDED" {
			t.Errorf("old session revoked, reason = %v, %q, want true, SUPERSEDED", old.Revoked, old.RevokedReason)
		}
		if len(w.Result().Cookies()) != 1 {
			t.Errorf("IssueForTokenPair() set %d cookies, want 1 replacement", len(w.Result().Cookies()))
		}
	})

	t.Run("a Node-created session survives renewal through Go", func(t *testing.T) {
		t.Parallel()
		env := newSessionEnv(t)
		env.insertNodeSession(t, env.node.WorkspaceID, env.node.UserWorkspaceID)
		w := httptest.NewRecorder()
		r := newSessionRequest("", &http.Cookie{Name: "twenty-session", Value: nodeSessionToken})

		if err := env.service(httpConfig).IssueForTokenPair(t.Context(), w, r, auth.TokenPair{AccessToken: env.node.Access}, auth.SessionOriginRenewalBridge); err != nil {
			t.Fatalf("IssueForTokenPair() error = %v", err)
		}
		if len(w.Result().Cookies()) != 0 {
			t.Errorf("IssueForTokenPair() set %d cookies, want none for a matching session", len(w.Result().Cookies()))
		}
		if old, _ := env.row(t, nodeSessionHash); old.Revoked {
			t.Error("matching session revoked = true, want false")
		}
	})

	t.Run("renewal into another scope replaces the session", func(t *testing.T) {
		t.Parallel()
		env := newSessionEnv(t)
		env.insertNodeSession(t, "", "")
		w := httptest.NewRecorder()
		r := newSessionRequest("", &http.Cookie{Name: "twenty-session", Value: nodeSessionToken})

		if err := env.service(httpConfig).IssueForTokenPair(t.Context(), w, r, auth.TokenPair{AccessToken: env.node.Access}, auth.SessionOriginRenewalBridge); err != nil {
			t.Fatalf("IssueForTokenPair() error = %v", err)
		}
		if old, _ := env.row(t, nodeSessionHash); !old.Revoked {
			t.Error("workspace-agnostic session revoked = false after a workspace renewal, want true")
		}
		if len(w.Result().Cookies()) != 1 {
			t.Errorf("IssueForTokenPair() set %d cookies, want 1", len(w.Result().Cookies()))
		}
	})

	t.Run("a workspace-agnostic token pair makes a workspace-agnostic session", func(t *testing.T) {
		t.Parallel()
		env := newSessionEnv(t)
		pair, err := env.issuer.IssueWorkspaceAgnostic(t.Context(), env.node.UserID, "password")
		if err != nil {
			t.Fatal(err)
		}
		w := httptest.NewRecorder()
		if err := env.service(httpConfig).IssueForTokenPair(t.Context(), w, newSessionRequest(""), pair, auth.SessionOriginSignIn); err != nil {
			t.Fatalf("IssueForTokenPair() error = %v", err)
		}
		got, found := env.row(t, hashOf(w.Result().Cookies()[0].Value))
		if !found || got.WorkspaceID != "" || got.UserWorkspaceID != "" || got.UserID != env.node.UserID {
			t.Errorf("session row = %+v, %v, want a user-only session", got, found)
		}
	})

	t.Run("rejects tokens that cannot back a session", func(t *testing.T) {
		t.Parallel()
		env := newSessionEnv(t)
		for _, token := range []string{env.node.Refresh, env.node.Login, "not-a-token"} {
			err := env.service(httpConfig).IssueForTokenPair(t.Context(), httptest.NewRecorder(), newSessionRequest(""), auth.TokenPair{AccessToken: token}, auth.SessionOriginSignIn)
			if !errors.Is(err, auth.ErrInvalidSessionTokens) {
				t.Errorf("IssueForTokenPair(non-access token) error = %v, want ErrInvalidSessionTokens", err)
			}
		}
	})
}

func TestUserSession_SignOut(t *testing.T) {
	t.Parallel()
	env := newSessionEnv(t)
	env.insertNodeSession(t, env.node.WorkspaceID, env.node.UserWorkspaceID)
	w := httptest.NewRecorder()
	r := newSessionRequest("", &http.Cookie{Name: "twenty-session", Value: nodeSessionToken})

	if err := env.service(auth.SessionConfig{ServerURL: "http://crm.example.com"}).SignOut(t.Context(), w, r, env.node.Refresh); err != nil {
		t.Fatalf("SignOut() error = %v", err)
	}
	if got, _ := env.row(t, nodeSessionHash); !got.Revoked || got.RevokedReason != "USER_SIGN_OUT" {
		t.Errorf("session revoked, reason = %v, %q, want true, USER_SIGN_OUT", got.Revoked, got.RevokedReason)
	}
	if revoked, _ := env.revokedAt(t, env.node.RefreshJTI); !revoked {
		t.Error("refresh token revoked = false, want true")
	}
	var cleared []string
	for _, cookie := range w.Result().Cookies() {
		if cookie.MaxAge < 0 && cookie.Value == "" {
			cleared = append(cleared, cookie.Name)
		}
	}
	if diff := cmp.Diff([]string{"__Host-twenty-session", "twenty-session"}, cleared); diff != "" {
		t.Errorf("SignOut() cleared cookies (-want +got):\n%s", diff)
	}

	t.Run("tolerates an invalid refresh token and no session", func(t *testing.T) {
		if err := env.service(auth.SessionConfig{}).SignOut(t.Context(), httptest.NewRecorder(), newSessionRequest(""), "not-a-token"); err != nil {
			t.Errorf("SignOut(no session, garbage refresh token) error = %v, want nil", err)
		}
	})
}
