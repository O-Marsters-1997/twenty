package authgql_test

import (
	"bytes"
	"context"
	"encoding/json"
	"io"
	"log/slog"
	"net/http"
	"net/http/httptest"
	"net/url"
	"os"
	"testing"
	"time"

	"github.com/golang-jwt/jwt/v5"
	"github.com/google/go-cmp/cmp"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/twentyhq/twenty/packages/twenty-server-go/internal/auth"
	"github.com/twentyhq/twenty/packages/twenty-server-go/internal/auth/authgql"
	"github.com/twentyhq/twenty/packages/twenty-server-go/internal/golden"
	"github.com/twentyhq/twenty/packages/twenty-server-go/internal/pgtest"
)

const (
	acmeWorkspaceID   = "20202020-1c25-4d02-bf25-6aeccf7ea419"
	lockedWorkspaceID = "20202020-1c25-4d02-bf25-6aeccf7ea420"
	pitchWorkspaceID  = "20202020-1c25-4d02-bf25-6aeccf7ea421"

	memberUserID     = "a1000000-0000-4000-8000-000000000001"
	twoFactorUserID  = "a1000000-0000-4000-8000-000000000002"
	outsiderUserID   = "a1000000-0000-4000-8000-000000000003"
	invitedUserID    = "a1000000-0000-4000-8000-000000000004"
	socialUserID     = "a1000000-0000-4000-8000-000000000005"
	unverifiedUserID = "a1000000-0000-4000-8000-000000000006"

	loginPassword = "correct horse"
	acmeOrigin    = "http://acme.localhost:3001"

	getLoginTokenMutation = `mutation GetLoginTokenFromCredentials($email: String!, $password: String!, $captchaToken: String, $origin: String!) { getLoginTokenFromCredentials(email: $email, password: $password, captchaToken: $captchaToken, origin: $origin) { loginToken { token expiresAt } } }`
	signInMutation        = `mutation SignIn($email: String!, $password: String!, $captchaToken: String) { signIn(email: $email, password: $password, captchaToken: $captchaToken) { availableWorkspaces { availableWorkspacesForSignIn { id displayName loginToken personalInviteToken inviteHash workspaceUrls { subdomainUrl } logo } availableWorkspacesForSignUp { id displayName loginToken personalInviteToken inviteHash workspaceUrls { subdomainUrl } logo } } tokens { accessOrWorkspaceAgnosticToken { token expiresAt } refreshToken { token expiresAt } } } }`
)

type noCache struct{}

func (noCache) SetIfAbsent(context.Context, string, time.Duration) (bool, error) { return true, nil }
func (noCache) Delete(context.Context, ...string) error                          { return nil }

type loginHarness struct {
	pool    *pgxpool.Pool
	handler http.Handler
}

func newLoginHarness(t *testing.T, emailVerificationRequired bool) *loginHarness {
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
	pool, err := pgxpool.New(t.Context(), pgtest.New(t))
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(pool.Close)
	h := &loginHarness{pool: pool}

	issuer := auth.NewPGIssuer(pool, auth.IssuerConfig{AppSecret: node.AppSecret, EncryptionKey: node.EncryptionKey})
	frontURL, err := url.Parse("http://localhost:3001")
	if err != nil {
		t.Fatal(err)
	}
	config := auth.PasswordLoginConfig{
		FrontURL:                  frontURL,
		ServerURL:                 "http://localhost:3000",
		MultiWorkspace:            true,
		EmailVerificationRequired: emailVerificationRequired,
		FileTokenTTL:              24 * time.Hour,
	}
	origins := auth.NewOriginResolver(pool, auth.OriginConfig{MultiWorkspace: true, FrontURL: "http://localhost:3001", DefaultSubdomain: "app"})
	logger := slog.New(slog.NewTextHandler(io.Discard, nil))
	h.handler = authgql.NewHandler(&authgql.Resolver{
		PasswordLogin: auth.NewPasswordLogin(pool, auth.NewPasswordHasher(), issuer, origins, config),
		Sessions:      auth.NewUserSession(pool, noCache{}, issuer, auth.SessionConfig{ServerURL: "http://localhost:3000"}, logger),
	}, logger)

	h.exec(t, `INSERT INTO core."signingKey" (id, "publicKey", "privateKey", "isCurrent") VALUES ($1, $2, $3, true)`,
		node.SigningKey.ID, node.SigningKey.PublicKey, node.SigningKey.PrivateKey)
	h.seed(t)
	return h
}

func (h *loginHarness) exec(t *testing.T, sql string, args ...any) {
	t.Helper()
	if _, err := h.pool.Exec(t.Context(), sql, args...); err != nil {
		t.Fatalf("%s: %v", sql, err)
	}
}

func (h *loginHarness) workspace(t *testing.T, id, applicationID, subdomain, displayName string, passwordEnabled bool) {
	t.Helper()
	err := pgx.BeginFunc(t.Context(), h.pool, func(tx pgx.Tx) error {
		if _, err := tx.Exec(t.Context(), `INSERT INTO core.workspace (id, subdomain, "workspaceCustomApplicationId", "activationStatus", "displayName", "isPasswordAuthEnabled") VALUES ($1, $2, $3, 'PENDING_CREATION', $4, $5)`,
			id, subdomain, applicationID, displayName, passwordEnabled); err != nil {
			return err
		}
		_, err := tx.Exec(t.Context(), `INSERT INTO core.application (id, "universalIdentifier", name, "workspaceId") VALUES ($1, gen_random_uuid(), 'custom', $2)`, applicationID, id)
		return err
	})
	if err != nil {
		t.Fatal(err)
	}
}

func (h *loginHarness) user(t *testing.T, id, email string, verified bool, withPassword bool) {
	t.Helper()
	hash := ""
	if withPassword {
		var err error
		if hash, err = auth.NewPasswordHasher().Hash(loginPassword); err != nil {
			t.Fatal(err)
		}
	}
	h.exec(t, `INSERT INTO core."user" (id, email, "passwordHash", "isEmailVerified") VALUES ($1, $2, NULLIF($3, ''), $4)`, id, email, hash, verified)
}

func (h *loginHarness) join(t *testing.T, userID, workspaceID string) {
	t.Helper()
	h.exec(t, `INSERT INTO core."userWorkspace" ("userId", "workspaceId") VALUES ($1, $2)`, userID, workspaceID)
}

func (h *loginHarness) invite(t *testing.T, workspaceID, email, value string) {
	t.Helper()
	h.exec(t, `INSERT INTO core."appToken" ("workspaceId", type, value, context, "expiresAt") VALUES ($1, 'INVITATION_TOKEN', $2, jsonb_build_object('email', $3::text), now() + interval '1 day')`,
		workspaceID, value, email)
}

func (h *loginHarness) seed(t *testing.T) {
	t.Helper()
	h.workspace(t, acmeWorkspaceID, "20202020-0687-4c41-b707-ed1bfca972a7", "acme", "Acme", true)
	h.workspace(t, lockedWorkspaceID, "20202020-0687-4c41-b707-ed1bfca972a8", "locked", "Locked", false)
	h.workspace(t, pitchWorkspaceID, "20202020-0687-4c41-b707-ed1bfca972a9", "pitch", "Pitch", true)

	h.user(t, memberUserID, "member@example.com", true, true)
	h.user(t, twoFactorUserID, "twofactor@example.com", true, true)
	h.user(t, outsiderUserID, "outsider@example.com", true, true)
	h.user(t, invitedUserID, "invited@example.com", true, true)
	h.user(t, socialUserID, "social@example.com", true, false)
	h.user(t, unverifiedUserID, "unverified@example.com", false, true)

	h.join(t, memberUserID, acmeWorkspaceID)
	h.join(t, memberUserID, lockedWorkspaceID)
	h.join(t, twoFactorUserID, acmeWorkspaceID)
	h.join(t, socialUserID, acmeWorkspaceID)
	h.join(t, unverifiedUserID, acmeWorkspaceID)
	h.invite(t, pitchWorkspaceID, "member@example.com", "pitch-invite-token")
	h.invite(t, acmeWorkspaceID, "invited@example.com", "acme-invite-token")

	secret, err := auth.NewSecretCipher("test-key", "", "").Encrypt("JBSWY3DPEHPK3PXP", acmeWorkspaceID)
	if err != nil {
		t.Fatal(err)
	}
	h.exec(t, `INSERT INTO core."twoFactorAuthenticationMethod" ("workspaceId", "userWorkspaceId", secret, status, strategy)
		VALUES ($1, (SELECT id FROM core."userWorkspace" WHERE "userId" = $2), $3, 'VERIFIED', 'TOTP')`, acmeWorkspaceID, twoFactorUserID, secret)
}

func (h *loginHarness) send(t *testing.T, query string, variables map[string]any) (map[string]any, *httptest.ResponseRecorder) {
	t.Helper()
	body, err := json.Marshal(map[string]any{"query": query, "variables": variables})
	if err != nil {
		t.Fatal(err)
	}
	request := httptest.NewRequest(http.MethodPost, "/metadata", bytes.NewReader(body))
	request.Header.Set("Content-Type", "application/json")
	recorder := httptest.NewRecorder()
	h.handler.ServeHTTP(recorder, request)
	var decoded map[string]any
	if err := json.Unmarshal(recorder.Body.Bytes(), &decoded); err != nil {
		t.Fatalf("decode %s: %v", recorder.Body.String(), err)
	}
	return decoded, recorder
}

func credentials(email, password, origin string) map[string]any {
	return map[string]any{"email": email, "password": password, "origin": origin}
}

func errorOf(t *testing.T, response map[string]any) map[string]any {
	t.Helper()
	errs, _ := response["errors"].([]any)
	if len(errs) != 1 {
		t.Fatalf("response = %v, want exactly one error", response)
	}
	return errs[0].(map[string]any)
}

func TestLogin_MatchesGolden(t *testing.T) {
	t.Parallel()
	tests := []struct {
		name   string
		ignore []string
	}{
		{name: "get-login-token-from-credentials", ignore: []string{"data.getLoginTokenFromCredentials.loginToken.token", "data.getLoginTokenFromCredentials.loginToken.expiresAt"}},
		{name: "sign-in", ignore: []string{
			"data.signIn.availableWorkspaces.availableWorkspacesForSignIn.*.loginToken",
			"data.signIn.tokens.accessOrWorkspaceAgnosticToken.token", "data.signIn.tokens.accessOrWorkspaceAgnosticToken.expiresAt",
			"data.signIn.tokens.refreshToken.token", "data.signIn.tokens.refreshToken.expiresAt",
		}},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()
			h := newLoginHarness(t, false)
			golden.Assert(t, h.handler, "testdata/golden", tt.name, tt.ignore...)
		})
	}
}

func TestGetLoginTokenFromCredentials(t *testing.T) {
	t.Parallel()

	t.Run("issues a password login token for a workspace member", func(t *testing.T) {
		t.Parallel()
		h := newLoginHarness(t, false)
		response, _ := h.send(t, getLoginTokenMutation, credentials("member@example.com", loginPassword, acmeOrigin))
		token := response["data"].(map[string]any)["getLoginTokenFromCredentials"].(map[string]any)["loginToken"].(map[string]any)["token"].(string)
		var claims jwt.MapClaims
		if _, _, err := jwt.NewParser().ParseUnverified(token, &claims); err != nil {
			t.Fatal(err)
		}
		got := map[string]any{"type": claims["type"], "sub": claims["sub"], "workspaceId": claims["workspaceId"], "authProvider": claims["authProvider"]}
		want := map[string]any{"type": "LOGIN", "sub": "member@example.com", "workspaceId": acmeWorkspaceID, "authProvider": "password"}
		if diff := cmp.Diff(want, got); diff != "" {
			t.Errorf("login token claims (-want +got):\n%s", diff)
		}
	})

	t.Run("leaves two-factor enforcement to the login token exchange", func(t *testing.T) {
		t.Parallel()
		h := newLoginHarness(t, false)
		response, _ := h.send(t, getLoginTokenMutation, credentials("twofactor@example.com", loginPassword, acmeOrigin))
		if response["errors"] != nil {
			t.Errorf("response = %v, want a login token as Node issues it", response)
		}
	})

	t.Run("rejects with the errors Node returns", func(t *testing.T) {
		t.Parallel()
		tests := []struct {
			name      string
			variables map[string]any
			want      map[string]any
			message   string
		}{
			{"wrong password", credentials("member@example.com", "nope", acmeOrigin), map[string]any{"code": "FORBIDDEN", "subCode": "FORBIDDEN_EXCEPTION", "userFriendlyMessage": "Wrong password."}, "Wrong password"},
			{"unknown user", credentials("ghost@example.com", loginPassword, acmeOrigin), map[string]any{"code": "UNAUTHENTICATED", "subCode": "USER_NOT_FOUND", "userFriendlyMessage": "User not found."}, "User not found"},
			{"user without a password", credentials("social@example.com", loginPassword, acmeOrigin), map[string]any{"code": "BAD_USER_INPUT", "subCode": "INVALID_INPUT", "userFriendlyMessage": "User was not created with email/password"}, "Incorrect login method"},
			{"unknown workspace", credentials("member@example.com", loginPassword, "http://nope.localhost:3001"), map[string]any{"code": "UNAUTHENTICATED", "subCode": "WORKSPACE_NOT_FOUND", "userFriendlyMessage": "Workspace not found."}, "Workspace not found"},
			{"not a member", credentials("outsider@example.com", loginPassword, acmeOrigin), map[string]any{"code": "FORBIDDEN", "subCode": "FORBIDDEN_EXCEPTION", "userFriendlyMessage": "You do not have permission to perform this action."}, "User is not a member of the workspace."},
			{"password login disabled", credentials("member@example.com", loginPassword, "http://locked.localhost:3001"), map[string]any{"code": "FORBIDDEN", "subCode": "FORBIDDEN_EXCEPTION", "userFriendlyMessage": "You do not have permission to perform this action."}, "Email/Password auth is not enabled for this workspace"},
		}
		for _, tt := range tests {
			t.Run(tt.name, func(t *testing.T) {
				t.Parallel()
				h := newLoginHarness(t, false)
				response, _ := h.send(t, getLoginTokenMutation, tt.variables)
				failure := errorOf(t, response)
				if diff := cmp.Diff(tt.want, failure["extensions"]); diff != "" {
					t.Errorf("extensions (-want +got):\n%s", diff)
				}
				if failure["message"] != tt.message {
					t.Errorf("message = %v, want %q", failure["message"], tt.message)
				}
			})
		}
	})

	t.Run("refuses an unverified email when verification is required", func(t *testing.T) {
		t.Parallel()
		h := newLoginHarness(t, true)
		response, _ := h.send(t, getLoginTokenMutation, credentials("unverified@example.com", loginPassword, acmeOrigin))
		want := map[string]any{"code": "FORBIDDEN", "subCode": "EMAIL_NOT_VERIFIED", "userFriendlyMessage": "Email is not verified."}
		if diff := cmp.Diff(want, errorOf(t, response)["extensions"]); diff != "" {
			t.Errorf("extensions (-want +got):\n%s", diff)
		}
	})

	t.Run("does not serve the invitation join that Node performs at login", func(t *testing.T) {
		t.Parallel()
		h := newLoginHarness(t, false)
		response, _ := h.send(t, getLoginTokenMutation, credentials("invited@example.com", loginPassword, acmeOrigin))
		want := map[string]any{"code": "INTERNAL_SERVER_ERROR"}
		if diff := cmp.Diff(want, errorOf(t, response)["extensions"]); diff != "" {
			t.Errorf("extensions (-want +got):\n%s", diff)
		}
		var joined int
		if err := h.pool.QueryRow(t.Context(), `SELECT count(*) FROM core."userWorkspace" WHERE "userId" = $1`, invitedUserID).Scan(&joined); err != nil || joined != 0 {
			t.Errorf("invited user workspaces = %d, %v, want 0", joined, err)
		}
	})
}

func TestSignIn(t *testing.T) {
	t.Parallel()

	t.Run("issues workspace-agnostic tokens and a session cookie", func(t *testing.T) {
		t.Parallel()
		h := newLoginHarness(t, false)
		response, recorder := h.send(t, signInMutation, map[string]any{"email": "member@example.com", "password": loginPassword})
		access := response["data"].(map[string]any)["signIn"].(map[string]any)["tokens"].(map[string]any)["accessOrWorkspaceAgnosticToken"].(map[string]any)["token"].(string)
		var claims jwt.MapClaims
		if _, _, err := jwt.NewParser().ParseUnverified(access, &claims); err != nil {
			t.Fatal(err)
		}
		if claims["type"] != "WORKSPACE_AGNOSTIC" || claims["userId"] != memberUserID || claims["authProvider"] != "password" {
			t.Errorf("access token claims = %v, want a password workspace-agnostic token for the member", claims)
		}
		cookies := recorder.Result().Cookies()
		if len(cookies) != 1 || cookies[0].Name != "twenty-session" {
			t.Errorf("cookies = %+v, want one twenty-session cookie", cookies)
		}
		var sessions int
		if err := h.pool.QueryRow(t.Context(), `SELECT count(*) FROM core."userSession" WHERE "userId" = $1`, memberUserID).Scan(&sessions); err != nil || sessions != 1 {
			t.Errorf("sessions = %d, %v, want 1", sessions, err)
		}
	})

	t.Run("lists a workspace joinable by email domain once, ahead of its invitation", func(t *testing.T) {
		t.Parallel()
		h := newLoginHarness(t, true)
		h.exec(t, `INSERT INTO core."approvedAccessDomain" (domain, "isValidated", "workspaceId") VALUES ('example.com', true, $1)`, pitchWorkspaceID)
		response, _ := h.send(t, signInMutation, map[string]any{"email": "member@example.com", "password": loginPassword})
		listed := response["data"].(map[string]any)["signIn"].(map[string]any)["availableWorkspaces"].(map[string]any)["availableWorkspacesForSignUp"].([]any)
		if len(listed) != 1 {
			t.Fatalf("sign-up workspaces = %v, want pitch once", listed)
		}
		pitch := listed[0].(map[string]any)
		if pitch["id"] != pitchWorkspaceID || pitch["personalInviteToken"] != nil {
			t.Errorf("sign-up workspace = %v, want pitch from the approved domain without an invite token", pitch)
		}
	})

	t.Run("rejects a wrong password without a session", func(t *testing.T) {
		t.Parallel()
		h := newLoginHarness(t, false)
		response, recorder := h.send(t, signInMutation, map[string]any{"email": "member@example.com", "password": "nope"})
		want := map[string]any{"code": "FORBIDDEN", "subCode": "FORBIDDEN_EXCEPTION", "userFriendlyMessage": "Wrong password."}
		if diff := cmp.Diff(want, errorOf(t, response)["extensions"]); diff != "" {
			t.Errorf("extensions (-want +got):\n%s", diff)
		}
		if cookies := recorder.Result().Cookies(); len(cookies) != 0 {
			t.Errorf("cookies = %+v, want none", cookies)
		}
	})
}
