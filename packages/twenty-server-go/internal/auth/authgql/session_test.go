package authgql_test

import (
	"bytes"
	"context"
	"encoding/json"
	"io"
	"log/slog"
	"net/http"
	"net/http/httptest"
	"os"
	"sync"
	"testing"
	"time"

	"github.com/google/go-cmp/cmp"

	"github.com/twentyhq/twenty/packages/twenty-server-go/internal/auth"
	"github.com/twentyhq/twenty/packages/twenty-server-go/internal/auth/authgql"
	"github.com/twentyhq/twenty/packages/twenty-server-go/internal/golden"
)

const sessionCookie = "twenty-session"

type memoryCache struct {
	mu   sync.Mutex
	keys map[string]bool
}

func (c *memoryCache) SetIfAbsent(_ context.Context, key string, _ time.Duration) (bool, error) {
	c.mu.Lock()
	defer c.mu.Unlock()
	if c.keys[key] {
		return false, nil
	}
	c.keys[key] = true
	return true, nil
}

func (c *memoryCache) Delete(_ context.Context, keys ...string) error {
	c.mu.Lock()
	defer c.mu.Unlock()
	for _, key := range keys {
		delete(c.keys, key)
	}
	return nil
}

type sessionHarness struct {
	*harness
	issuer  *auth.PGIssuer
	handler http.Handler
}

func newSessionHarness(t *testing.T) *sessionHarness {
	t.Helper()
	raw, err := os.ReadFile("../testdata/node_tokens.json")
	if err != nil {
		t.Fatal(err)
	}
	var node struct {
		EncryptionKey string `json:"encryptionKey"`
		AppSecret     string `json:"appSecret"`
		SigningKey    struct {
			ID         string `json:"id"`
			PublicKey  string `json:"publicKey"`
			PrivateKey string `json:"privateKey"`
		} `json:"signingKey"`
	}
	if err := json.Unmarshal(raw, &node); err != nil {
		t.Fatal(err)
	}
	h := &sessionHarness{harness: newHarness(t)}
	h.exec(t, `INSERT INTO core."signingKey" (id, "publicKey", "privateKey", "isCurrent") VALUES ($1, $2, $3, true)`,
		node.SigningKey.ID, node.SigningKey.PublicKey, node.SigningKey.PrivateKey)
	cache := &memoryCache{keys: map[string]bool{}}
	h.issuer = auth.NewPGIssuer(h.pool, auth.IssuerConfig{AppSecret: node.AppSecret, EncryptionKey: node.EncryptionKey, Cache: cache})
	logger := slog.New(slog.NewTextHandler(io.Discard, nil))
	h.handler = authgql.NewHandler(&authgql.Resolver{
		TwoFactor: h.service,
		Sessions:  auth.NewUserSession(h.pool, cache, h.issuer, auth.SessionConfig{}, logger),
		SignIn: &auth.SignIn{
			Pool:      h.pool,
			Issuer:    h.issuer,
			TwoFactor: h.service,
			Origins:   auth.NewOriginResolver(h.pool, auth.OriginConfig{SeedWorkspaceID: workspaceID}),
		},
	}, logger)
	return h
}

func (h *sessionHarness) send(t *testing.T, query string, variables map[string]any, cookies ...*http.Cookie) (map[string]any, *httptest.ResponseRecorder) {
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
	h.handler.ServeHTTP(recorder, request)
	var decoded map[string]any
	if err := json.Unmarshal(recorder.Body.Bytes(), &decoded); err != nil {
		t.Fatalf("decode %s: %v", recorder.Body.String(), err)
	}
	return decoded, recorder
}

func (h *sessionHarness) pair(t *testing.T, userID string) auth.TokenPair {
	t.Helper()
	pair, err := h.issuer.IssueForWorkspace(t.Context(), userID, workspaceID, "password")
	if err != nil {
		t.Fatal(err)
	}
	return pair
}

func cookieNamed(recorder *httptest.ResponseRecorder, name string) *http.Cookie {
	for _, cookie := range recorder.Result().Cookies() {
		if cookie.Name == name {
			return cookie
		}
	}
	return nil
}

func tokensOf(t *testing.T, response map[string]any, operation string) map[string]any {
	t.Helper()
	data, _ := response["data"].(map[string]any)
	result, _ := data[operation].(map[string]any)
	tokens, _ := result["tokens"].(map[string]any)
	if tokens == nil {
		t.Fatalf("response = %v, want data.%s.tokens", response, operation)
	}
	return tokens
}

const tokenSelection = `tokens { accessOrWorkspaceAgnosticToken { token expiresAt } refreshToken { token expiresAt } }`

func TestSignOut_MatchesGolden(t *testing.T) {
	t.Parallel()
	h := newSessionHarness(t)
	golden.Assert(t, h.handler, "testdata/golden", "sign-out")
}

func TestSignOut(t *testing.T) {
	t.Parallel()
	h := newSessionHarness(t)
	pair := h.pair(t, freshID)

	const signOut = `mutation($refreshToken: String) { signOut(refreshToken: $refreshToken) }`
	_, anonymous := h.send(t, signOut, nil)
	if got := anonymous.Result().Cookies(); len(got) != 0 {
		t.Errorf("signOut without a session cookie set cookies %v, want none", got)
	}

	startedBody, started := h.send(t, `mutation($appToken: String!) { renewToken(appToken: $appToken) { `+tokenSelection+` } }`, map[string]any{"appToken": pair.RefreshToken})
	session := cookieNamed(started, sessionCookie)
	if session == nil {
		t.Fatal("renewToken set no session cookie")
	}
	renewed := tokensOf(t, startedBody, "renewToken")["refreshToken"].(map[string]any)["token"].(string)

	response, recorder := h.send(t, signOut, map[string]any{"refreshToken": renewed}, session)
	if diff := cmp.Diff(map[string]any{"data": map[string]any{"signOut": true}}, response); diff != "" {
		t.Errorf("signOut response (-want +got):\n%s", diff)
	}
	if got := h.count(t, `SELECT count(*) FROM core."appToken" WHERE type = 'REFRESH_TOKEN' AND "revokedAt" IS NOT NULL AND context->>'revokedReason' IS NOT NULL`); got != 1 {
		t.Errorf("revoked refresh tokens = %d, want 1", got)
	}
	if cleared := cookieNamed(recorder, sessionCookie); cleared == nil || cleared.MaxAge >= 0 {
		t.Errorf("session cookie = %+v, want it cleared", cleared)
	}

	_, renewal := h.send(t, `mutation($appToken: String!) { renewToken(appToken: $appToken) { `+tokenSelection+` } }`, map[string]any{"appToken": renewed})
	if cookieNamed(renewal, sessionCookie) != nil {
		t.Error("a signed-out refresh token still renewed a session")
	}
}

func TestRenewToken(t *testing.T) {
	t.Parallel()
	const mutation = `mutation($appToken: String!) { renewToken(appToken: $appToken) { ` + tokenSelection + ` } }`

	t.Run("rotates the pair and starts a session", func(t *testing.T) {
		t.Parallel()
		h := newSessionHarness(t)
		pair := h.pair(t, freshID)

		response, recorder := h.send(t, mutation, map[string]any{"appToken": pair.RefreshToken})
		tokens := tokensOf(t, response, "renewToken")
		refresh, _ := tokens["refreshToken"].(map[string]any)
		if refresh["token"] == pair.RefreshToken || refresh["token"] == "" {
			t.Errorf("refreshToken.token = %v, want a new token", refresh["token"])
		}
		if _, err := time.Parse(time.RFC3339, refresh["expiresAt"].(string)); err != nil {
			t.Errorf("refreshToken.expiresAt = %v, want a timestamp", refresh["expiresAt"])
		}
		if cookieNamed(recorder, sessionCookie) == nil {
			t.Error("renewToken set no session cookie")
		}
		if got := h.count(t, `SELECT count(*) FROM core."userSession" WHERE "userId" = $1`, freshID); got != 1 {
			t.Errorf("sessions for user = %d, want 1", got)
		}
	})

	t.Run("rejects an unknown token", func(t *testing.T) {
		t.Parallel()
		h := newSessionHarness(t)
		response, _ := h.send(t, mutation, map[string]any{"appToken": "not-a-token"})
		want := map[string]any{"code": "FORBIDDEN", "subCode": "FORBIDDEN_EXCEPTION", "userFriendlyMessage": "You do not have permission to perform this action."}
		if diff := cmp.Diff(want, h.errorExtensions(t, response)); diff != "" {
			t.Errorf("extensions (-want +got):\n%s", diff)
		}
	})
}

func TestGetAuthTokensFromLoginToken(t *testing.T) {
	t.Parallel()
	const mutation = `mutation($loginToken: String!, $origin: String!) { getAuthTokensFromLoginToken(loginToken: $loginToken, origin: $origin) { ` + tokenSelection + ` } }`
	variables := func(token string) map[string]any {
		return map[string]any{"loginToken": token, "origin": "http://localhost:3001"}
	}

	t.Run("exchanges a login token once", func(t *testing.T) {
		t.Parallel()
		h := newSessionHarness(t)
		login, err := h.issuer.IssueLoginToken(t.Context(), freshID, workspaceID, "password")
		if err != nil {
			t.Fatal(err)
		}
		response, recorder := h.send(t, mutation, variables(login))
		tokens := tokensOf(t, response, "getAuthTokensFromLoginToken")
		access, _ := tokens["accessOrWorkspaceAgnosticToken"].(map[string]any)
		if access["token"] == nil || access["token"] == "" {
			t.Errorf("accessOrWorkspaceAgnosticToken = %v, want a token", access)
		}
		if cookieNamed(recorder, sessionCookie) == nil {
			t.Error("sign-in set no session cookie")
		}

		replay, _ := h.send(t, mutation, variables(login))
		if got := h.errorExtensions(t, replay)["code"]; got != "UNAUTHENTICATED" {
			t.Errorf("replayed login token code = %v, want UNAUTHENTICATED", got)
		}
	})

	t.Run("demands a code from a user with a verified method", func(t *testing.T) {
		t.Parallel()
		h := newSessionHarness(t)
		login, err := h.issuer.IssueLoginToken(t.Context(), memberID, workspaceID, "password")
		if err != nil {
			t.Fatal(err)
		}
		response, recorder := h.send(t, mutation, variables(login))
		if got := h.errorExtensions(t, response)["subCode"]; got != "TWO_FACTOR_AUTHENTICATION_VERIFICATION_REQUIRED" {
			t.Errorf("subCode = %v, want TWO_FACTOR_AUTHENTICATION_VERIFICATION_REQUIRED", got)
		}
		if cookieNamed(recorder, sessionCookie) != nil {
			t.Error("a user still owing a second factor received a session cookie")
		}
	})

	t.Run("rejects a malformed login token", func(t *testing.T) {
		t.Parallel()
		h := newSessionHarness(t)
		response, _ := h.send(t, mutation, variables("garbage"))
		if got := h.errorExtensions(t, response)["code"]; got != "UNAUTHENTICATED" {
			t.Errorf("code = %v, want UNAUTHENTICATED", got)
		}
	})
}
