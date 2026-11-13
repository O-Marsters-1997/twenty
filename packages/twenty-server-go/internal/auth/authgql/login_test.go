package authgql_test

import (
	"bytes"
	"context"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"io"
	"log/slog"
	"net/http"
	"net/http/httptest"
	"sync"
	"testing"
	"time"

	"github.com/golang-jwt/jwt/v5"

	"github.com/twentyhq/twenty/packages/twenty-server-go/internal/auth"
	"github.com/twentyhq/twenty/packages/twenty-server-go/internal/auth/authgql"
	"github.com/twentyhq/twenty/packages/twenty-server-go/internal/golden"
)

const (
	loginToken   = "valid-login-token"
	recoveryCode = "ABCDE-FGHJK-MNPQR-STVWX"
	loginOrigin  = "http://acme.localhost:3001"

	otpMutation = `mutation getAuthTokensFromOTP($loginToken: String!, $otp: String!, $captchaToken: String, $origin: String!) {
  getAuthTokensFromOTP(loginToken: $loginToken, otp: $otp, captchaToken: $captchaToken, origin: $origin) {
    tokens { accessOrWorkspaceAgnosticToken { token expiresAt } refreshToken { token expiresAt } }
  }
}`
	recoveryMutation = `mutation getAuthTokensFromTwoFactorAuthenticationRecoveryCode($loginToken: String!, $recoveryCode: String!, $captchaToken: String, $origin: String!) {
  getAuthTokensFromTwoFactorAuthenticationRecoveryCode(loginToken: $loginToken, recoveryCode: $recoveryCode, captchaToken: $captchaToken, origin: $origin) {
    tokens { accessOrWorkspaceAgnosticToken { token expiresAt } refreshToken { token expiresAt } }
    provisioningUri
  }
}`
)

type fakeLoginTokens struct {
	mu       sync.Mutex
	consumed bool
}

func (f *fakeLoginTokens) VerifyLoginToken(_ context.Context, token string) (auth.LoginClaims, error) {
	if token != loginToken {
		return auth.LoginClaims{}, auth.ErrInvalidLoginToken
	}
	return auth.LoginClaims{Email: memberID[len(memberID)-1:] + "@example.com", WorkspaceID: workspaceID, AuthProvider: "password", ID: "jti"}, nil
}

func (f *fakeLoginTokens) ConsumeLoginToken(context.Context, auth.LoginClaims) error {
	f.mu.Lock()
	defer f.mu.Unlock()
	if f.consumed {
		return auth.ErrLoginTokenConsumed
	}
	f.consumed = true
	return nil
}

func (f *fakeLoginTokens) IssueForWorkspace(_ context.Context, _, workspace string, _ auth.AuthProvider) (auth.TokenPair, error) {
	expiresAt := time.Now().Add(time.Hour)
	access, err := jwt.NewWithClaims(jwt.SigningMethodHS256, jwt.MapClaims{
		"sub": memberID, "userId": memberID, "workspaceId": workspace, "userWorkspaceId": uwID(memberID), "type": "ACCESS", "authProvider": "password",
	}).SignedString([]byte("test"))
	if err != nil {
		return auth.TokenPair{}, err
	}
	return auth.TokenPair{AccessToken: access, RefreshToken: "refresh-token", ExpiresAt: expiresAt, RefreshExpiresAt: expiresAt.Add(time.Hour)}, nil
}

type memoryCache struct{}

func (memoryCache) SetIfAbsent(context.Context, string, time.Duration) (bool, error) {
	return true, nil
}

func (memoryCache) Delete(context.Context, ...string) error { return nil }

func newLoginHarness(t *testing.T) (*harness, *fakeLoginTokens) {
	t.Helper()
	h := newHarness(t)
	tokens := &fakeLoginTokens{}
	logger := slog.New(slog.NewTextHandler(io.Discard, nil))
	sessions := auth.NewUserSession(h.pool, memoryCache{}, nil, auth.SessionConfig{ServerURL: "http://localhost:3000", FrontendURL: "http://localhost:3001"}, logger)
	login := auth.NewTwoFactorLogin(h.pool, h.service, tokens, auth.NewOriginResolver(h.pool, auth.OriginConfig{}), sessions)
	h.handler = authgql.NewHandler(&authgql.Resolver{TwoFactor: h.service, Login: login}, logger)
	return h, tokens
}

func (h *harness) login(t *testing.T, query string, variables map[string]any) (*httptest.ResponseRecorder, map[string]any) {
	t.Helper()
	body, err := json.Marshal(map[string]any{"query": query, "variables": variables})
	if err != nil {
		t.Fatal(err)
	}
	request := httptest.NewRequest(http.MethodPost, "/graphql", bytes.NewReader(body))
	request.Header.Set("Content-Type", "application/json")
	recorder := httptest.NewRecorder()
	h.handler.ServeHTTP(recorder, request)
	var decoded map[string]any
	if err := json.Unmarshal(recorder.Body.Bytes(), &decoded); err != nil {
		t.Fatalf("decode %s: %v", recorder.Body.String(), err)
	}
	return recorder, decoded
}

func otpVariables(otp string) map[string]any {
	return map[string]any{"loginToken": loginToken, "otp": otp, "origin": loginOrigin}
}

func recoveryVariables(code string) map[string]any {
	return map[string]any{"loginToken": loginToken, "recoveryCode": code, "origin": loginOrigin}
}

func (h *harness) redeemableCode(t *testing.T) {
	t.Helper()
	sum := sha256.Sum256([]byte("ABCDEFGHJKMNPQRSTVWX"))
	h.exec(t, `INSERT INTO core."appToken" ("userId", "workspaceId", type, value, "expiresAt") VALUES ($1, $2, 'TWO_FACTOR_AUTHENTICATION_RECOVERY_CODE', $3, now() + interval '1 hour')`,
		memberID, workspaceID, hex.EncodeToString(sum[:]))
}

func TestLogin_MatchesGolden(t *testing.T) {
	t.Parallel()
	tokenFields := []string{
		"data.getAuthTokensFromOTP.tokens.accessOrWorkspaceAgnosticToken.token",
		"data.getAuthTokensFromOTP.tokens.accessOrWorkspaceAgnosticToken.expiresAt",
		"data.getAuthTokensFromOTP.tokens.refreshToken.token",
		"data.getAuthTokensFromOTP.tokens.refreshToken.expiresAt",
	}
	recoveryFields := []string{
		"data.getAuthTokensFromTwoFactorAuthenticationRecoveryCode.tokens.accessOrWorkspaceAgnosticToken.token",
		"data.getAuthTokensFromTwoFactorAuthenticationRecoveryCode.tokens.accessOrWorkspaceAgnosticToken.expiresAt",
		"data.getAuthTokensFromTwoFactorAuthenticationRecoveryCode.tokens.refreshToken.token",
		"data.getAuthTokensFromTwoFactorAuthenticationRecoveryCode.tokens.refreshToken.expiresAt",
	}
	tests := []struct {
		name   string
		setup  func(t *testing.T, h *harness)
		ignore []string
	}{
		{name: "get-auth-tokens-from-otp", ignore: tokenFields},
		{name: "get-auth-tokens-from-otp-wrong-code"},
		{name: "get-auth-tokens-from-recovery-code", setup: func(t *testing.T, h *harness) { h.redeemableCode(t) }, ignore: recoveryFields},
		{name: "get-auth-tokens-from-recovery-code-wrong-code"},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()
			h, _ := newLoginHarness(t)
			if tt.setup != nil {
				tt.setup(t, h)
			}
			golden.Assert(t, h.handler, "testdata/golden", tt.name, tt.ignore...)
		})
	}
}

func TestLogin_OTP(t *testing.T) {
	t.Parallel()

	t.Run("issues tokens, a session cookie and consumes the login token", func(t *testing.T) {
		t.Parallel()
		h, _ := newLoginHarness(t)
		recorder, response := h.login(t, otpMutation, otpVariables(validOTP))
		if _, failed := response["errors"]; failed {
			t.Fatalf("response = %v, want tokens", response)
		}
		if len(recorder.Result().Cookies()) != 1 {
			t.Errorf("cookies = %v, want one session cookie", recorder.Result().Cookies())
		}
		if got := h.count(t, `SELECT count(*) FROM core."userSession" WHERE "userId" = $1 AND "revokedAt" IS NULL`, memberID); got != 1 {
			t.Errorf("active sessions = %d, want 1", got)
		}
		_, replay := h.login(t, otpMutation, otpVariables(validOTP))
		if extensions := h.errorExtensions(t, replay); extensions["code"] != "UNAUTHENTICATED" {
			t.Errorf("replayed login token extensions = %v, want UNAUTHENTICATED", extensions)
		}
	})

	t.Run("a wrong code leaves the login token usable", func(t *testing.T) {
		t.Parallel()
		h, tokens := newLoginHarness(t)
		_, response := h.login(t, otpMutation, otpVariables("000000"))
		if extensions := h.errorExtensions(t, response); extensions["subCode"] != "INVALID_OTP" {
			t.Errorf("extensions = %v, want INVALID_OTP", extensions)
		}
		if tokens.consumed {
			t.Error("login token consumed by a wrong code")
		}
	})

	t.Run("errors", func(t *testing.T) {
		t.Parallel()
		tests := []struct {
			name      string
			variables map[string]any
			wantCode  string
			wantSub   string
		}{
			{"invalid login token", map[string]any{"loginToken": "garbage", "otp": validOTP, "origin": loginOrigin}, "UNAUTHENTICATED", "UNAUTHENTICATED"},
		}
		for _, tt := range tests {
			t.Run(tt.name, func(t *testing.T) {
				t.Parallel()
				h, _ := newLoginHarness(t)
				_, response := h.login(t, otpMutation, tt.variables)
				extensions := h.errorExtensions(t, response)
				if extensions["code"] != tt.wantCode || extensions["subCode"] != tt.wantSub {
					t.Errorf("extensions = %v, want %s %s", extensions, tt.wantCode, tt.wantSub)
				}
			})
		}
	})
}

func TestLogin_RecoveryCode(t *testing.T) {
	t.Parallel()

	t.Run("resets two-factor, revokes sessions and signs in", func(t *testing.T) {
		t.Parallel()
		h, _ := newLoginHarness(t)
		h.redeemableCode(t)
		h.exec(t, `INSERT INTO core."userSession" ("tokenHash", "userId", "workspaceId", "userWorkspaceId", "authProvider", "expiresAt", "lastActiveAt") VALUES ('old', $1, $2, $3, 'password', now() + interval '1 day', now())`,
			memberID, workspaceID, uwID(memberID))
		_, response := h.login(t, recoveryMutation, recoveryVariables(recoveryCode))
		if _, failed := response["errors"]; failed {
			t.Fatalf("response = %v, want tokens", response)
		}
		if got := h.count(t, `SELECT count(*) FROM core."twoFactorAuthenticationMethod" WHERE "userWorkspaceId" = $1`, uwID(memberID)); got != 0 {
			t.Errorf("methods left = %d, want 0", got)
		}
		if got := h.count(t, `SELECT count(*) FROM core."userSession" WHERE "tokenHash" = 'old' AND "revokedReason" = 'TWO_FACTOR_AUTHENTICATION_RESET'`); got != 1 {
			t.Errorf("old session revoked for reset = %d, want 1", got)
		}
		_, replay := h.login(t, recoveryMutation, recoveryVariables(recoveryCode))
		if extensions := h.errorExtensions(t, replay); extensions["subCode"] != "INVALID_RECOVERY_CODE" {
			t.Errorf("replay extensions = %v, want INVALID_RECOVERY_CODE", extensions)
		}
	})

	t.Run("an enforced workspace gets a new authenticator and no tokens", func(t *testing.T) {
		t.Parallel()
		h, tokens := newLoginHarness(t)
		h.redeemableCode(t)
		h.exec(t, `UPDATE core.workspace SET "isTwoFactorAuthenticationEnforced" = true WHERE id = $1`, workspaceID)
		_, response := h.login(t, recoveryMutation, recoveryVariables(recoveryCode))
		result := response["data"].(map[string]any)["getAuthTokensFromTwoFactorAuthenticationRecoveryCode"].(map[string]any)
		if result["tokens"] != nil || result["provisioningUri"] == nil {
			t.Errorf("result = %v, want a provisioning URI and null tokens", result)
		}
		if tokens.consumed {
			t.Error("login token consumed before enrollment finished")
		}
		if got := h.count(t, `SELECT count(*) FROM core."twoFactorAuthenticationMethod" WHERE "userWorkspaceId" = $1 AND status = 'PENDING'`, uwID(memberID)); got != 1 {
			t.Errorf("pending methods = %d, want 1", got)
		}
	})

	t.Run("a wrong code changes nothing", func(t *testing.T) {
		t.Parallel()
		h, _ := newLoginHarness(t)
		h.redeemableCode(t)
		_, response := h.login(t, recoveryMutation, recoveryVariables("AAAAA-AAAAA-AAAAA-AAAAA"))
		if extensions := h.errorExtensions(t, response); extensions["subCode"] != "INVALID_RECOVERY_CODE" {
			t.Errorf("extensions = %v, want INVALID_RECOVERY_CODE", extensions)
		}
		if got := h.count(t, `SELECT count(*) FROM core."twoFactorAuthenticationMethod" WHERE "userWorkspaceId" = $1`, uwID(memberID)); got != 1 {
			t.Errorf("methods = %d, want the original kept", got)
		}
	})
}
