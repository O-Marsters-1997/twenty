package auth_test

import (
	"encoding/json"
	"errors"
	"maps"
	"os"
	"slices"
	"testing"

	"github.com/golang-jwt/jwt/v5"
	"github.com/google/go-cmp/cmp"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/twentyhq/twenty/packages/twenty-server-go/internal/auth"
	"github.com/twentyhq/twenty/packages/twenty-server-go/internal/pgtest"
	"github.com/twentyhq/twenty/packages/twenty-server-go/internal/workspace"
)

const workspaceMemberID = "33333333-3333-4333-8333-333333333333"

type nodeFixture struct {
	EncryptionKey string `json:"encryptionKey"`
	AppSecret     string `json:"appSecret"`
	SigningKey    struct {
		ID         string `json:"id"`
		PublicKey  string `json:"publicKey"`
		PrivateKey string `json:"privateKey"`
	} `json:"signingKey"`
	UserID           string `json:"userId"`
	WorkspaceID      string `json:"workspaceId"`
	UserWorkspaceID  string `json:"userWorkspaceId"`
	RefreshJTI       string `json:"refreshJti"`
	LegacyRefreshJTI string `json:"legacyRefreshJti"`
	Access           string `json:"access"`
	Refresh          string `json:"refresh"`
	Login            string `json:"login"`
	LegacyRefresh    string `json:"legacyRefresh"`
}

type tokenEnv struct {
	node     nodeFixture
	pool     *pgxpool.Pool
	issuer   *auth.PGIssuer
	verifier *auth.JWTVerifier
}

func newTokenEnv(t *testing.T) tokenEnv {
	t.Helper()
	raw, err := os.ReadFile("testdata/node_tokens.json")
	if err != nil {
		t.Fatal(err)
	}
	var node nodeFixture
	if err := json.Unmarshal(raw, &node); err != nil {
		t.Fatal(err)
	}
	pool, err := pgxpool.New(t.Context(), pgtest.New(t))
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(pool.Close)
	env := tokenEnv{
		node:     node,
		pool:     pool,
		issuer:   auth.NewPGIssuer(pool, auth.IssuerConfig{AppSecret: node.AppSecret, EncryptionKey: node.EncryptionKey}),
		verifier: auth.NewJWTVerifier(pool, node.AppSecret),
	}
	env.exec(t, `INSERT INTO core."signingKey" (id, "publicKey", "privateKey", "isCurrent") VALUES ($1, $2, $3, true)`,
		node.SigningKey.ID, node.SigningKey.PublicKey, node.SigningKey.PrivateKey)
	env.exec(t, `INSERT INTO core."user" (id, email) VALUES ($1, 'fixture@example.com')`, node.UserID)
	env.exec(t, `INSERT INTO `+workspace.SchemaName()+`."workspaceMember" (id, "userId") VALUES ($1, $2)`, workspaceMemberID, node.UserID)
	env.exec(t, `INSERT INTO core."userWorkspace" (id, "userId", "workspaceId") VALUES ($1, $2, $3)`,
		node.UserWorkspaceID, node.UserID, node.WorkspaceID)
	for _, jti := range []string{node.RefreshJTI, node.LegacyRefreshJTI} {
		env.exec(t, `INSERT INTO core."appToken" (id, "userId", "workspaceId", type, "expiresAt") VALUES ($1, $2, $3, 'REFRESH_TOKEN', now() + interval '1 day')`,
			jti, node.UserID, node.WorkspaceID)
	}
	return env
}

func (e tokenEnv) exec(t *testing.T, sql string, args ...any) {
	t.Helper()
	if _, err := e.pool.Exec(t.Context(), sql, args...); err != nil {
		t.Fatal(err)
	}
}

func (e tokenEnv) revokedAt(t *testing.T, id string) (revoked bool, reason string) {
	t.Helper()
	var reasonPtr *string
	if err := e.pool.QueryRow(t.Context(),
		`SELECT "revokedAt" IS NOT NULL, context->>'revokedReason' FROM core."appToken" WHERE id = $1`, id,
	).Scan(&revoked, &reasonPtr); err != nil {
		t.Fatal(err)
	}
	if reasonPtr != nil {
		reason = *reasonPtr
	}
	return revoked, reason
}

func decodeClaims(t *testing.T, token string) (jwt.MapClaims, map[string]any) {
	t.Helper()
	body := jwt.MapClaims{}
	parsed, _, err := jwt.NewParser().ParseUnverified(token, body)
	if err != nil {
		t.Fatal(err)
	}
	return body, parsed.Header
}

func claimNames(t *testing.T, token string) []string {
	t.Helper()
	body, _ := decodeClaims(t, token)
	return slices.Sorted(maps.Keys(body))
}

func TestPGIssuer_IssueAccess(t *testing.T) {
	t.Parallel()
	env := newTokenEnv(t)
	principal := auth.Principal{
		UserID:            env.node.UserID,
		WorkspaceID:       env.node.WorkspaceID,
		UserWorkspaceID:   env.node.UserWorkspaceID,
		WorkspaceMemberID: workspaceMemberID,
		AuthProvider:      "password",
	}

	token, expiresAt, err := env.issuer.IssueAccess(t.Context(), principal)
	if err != nil {
		t.Fatalf("IssueAccess() error = %v", err)
	}

	got, header := decodeClaims(t, token)
	_, nodeHeader := decodeClaims(t, env.node.Access)
	if diff := cmp.Diff(nodeHeader, header); diff != "" {
		t.Errorf("IssueAccess() header (-node +go):\n%s", diff)
	}
	if diff := cmp.Diff(claimNames(t, env.node.Access), claimNames(t, token)); diff != "" {
		t.Errorf("IssueAccess() claim names (-node +go):\n%s", diff)
	}
	if got["type"] != "ACCESS" || got["sub"] != principal.UserID {
		t.Errorf("IssueAccess() type, sub = %v, %v", got["type"], got["sub"])
	}
	if exp, _ := got.GetExpirationTime(); exp.Unix() != expiresAt.Unix() {
		t.Errorf("IssueAccess() exp = %v, want returned expiry %v", exp, expiresAt)
	}
	verified, err := env.verifier.Verify(t.Context(), token)
	if err != nil {
		t.Fatalf("Verify(issued token) error = %v", err)
	}
	if diff := cmp.Diff(principal, verified); diff != "" {
		t.Errorf("Verify(issued token) principal (-want +got):\n%s", diff)
	}
}

func TestPGIssuer_IssueLogin(t *testing.T) {
	t.Parallel()
	env := newTokenEnv(t)

	token, err := env.issuer.IssueLogin(t.Context(), env.node.UserID)
	if err != nil {
		t.Fatalf("IssueLogin() error = %v", err)
	}

	got, _ := decodeClaims(t, token)
	if diff := cmp.Diff(claimNames(t, env.node.Login), claimNames(t, token)); diff != "" {
		t.Errorf("IssueLogin() claim names (-node +go):\n%s", diff)
	}
	nodeClaims, _ := decodeClaims(t, env.node.Login)
	for _, name := range []string{"type", "sub", "workspaceId", "authProvider"} {
		if got[name] != nodeClaims[name] {
			t.Errorf("IssueLogin() %s = %v, want %v", name, got[name], nodeClaims[name])
		}
	}
	if _, err := uuid.Parse(got["jti"].(string)); err != nil {
		t.Errorf("IssueLogin() jti = %v, want a uuid", got["jti"])
	}
}

func TestPGIssuer_Refresh(t *testing.T) {
	t.Parallel()

	t.Run("rotates Node-issued refresh tokens", func(t *testing.T) {
		t.Parallel()
		env := newTokenEnv(t)
		tests := []struct{ name, token, jti string }{
			{"ES256", env.node.Refresh, env.node.RefreshJTI},
			{"legacy HS256", env.node.LegacyRefresh, env.node.LegacyRefreshJTI},
		}
		for _, tt := range tests {
			t.Run(tt.name, func(t *testing.T) {
				pair, err := env.issuer.Refresh(t.Context(), tt.token)
				if err != nil {
					t.Fatalf("Refresh() error = %v", err)
				}
				if diff := cmp.Diff(claimNames(t, env.node.Refresh), claimNames(t, pair.RefreshToken)); diff != "" {
					t.Errorf("Refresh() refresh claim names (-node +go):\n%s", diff)
				}
				newClaims, _ := decodeClaims(t, pair.RefreshToken)
				if newClaims["jti"] == tt.jti || newClaims["targetedTokenType"] != "ACCESS" {
					t.Errorf("Refresh() refresh jti, targetedTokenType = %v, %v", newClaims["jti"], newClaims["targetedTokenType"])
				}
				if revoked, _ := env.revokedAt(t, tt.jti); !revoked {
					t.Errorf("Refresh() left the presented token %s unrevoked", tt.jti)
				}
				if revoked, _ := env.revokedAt(t, newClaims["jti"].(string)); revoked {
					t.Error("Refresh() issued an already revoked token")
				}
				principal, err := env.verifier.Verify(t.Context(), pair.AccessToken)
				if err != nil {
					t.Fatalf("Verify(refreshed access token) error = %v", err)
				}
				want := auth.Principal{UserID: env.node.UserID, WorkspaceID: env.node.WorkspaceID, UserWorkspaceID: env.node.UserWorkspaceID, WorkspaceMemberID: workspaceMemberID, AuthProvider: "password"}
				if diff := cmp.Diff(want, principal); diff != "" {
					t.Errorf("Verify(refreshed access token) (-want +got):\n%s", diff)
				}
				if _, err := env.issuer.Refresh(t.Context(), pair.RefreshToken); err != nil {
					t.Errorf("Refresh(issued refresh token) error = %v", err)
				}
			})
		}
	})

	t.Run("rejects", func(t *testing.T) {
		t.Parallel()
		env := newTokenEnv(t)
		env.exec(t, `UPDATE core."appToken" SET "revokedAt" = now() - interval '1 hour' WHERE id = $1`, env.node.RefreshJTI)
		env.exec(t, `UPDATE core."appToken" SET "revokedAt" = now(), context = '{"revokedReason":"PASSWORD_CHANGED"}' WHERE id = $1`, env.node.LegacyRefreshJTI)
		tests := []struct{ name, token string }{
			{"revoked past the grace period", env.node.Refresh},
			{"revoked for a security reason inside the grace period", env.node.LegacyRefresh},
			{"an access token", env.node.Access},
			{"garbage", "not-a-token"},
		}
		for _, tt := range tests {
			t.Run(tt.name, func(t *testing.T) {
				if _, err := env.issuer.Refresh(t.Context(), tt.token); !errors.Is(err, auth.ErrInvalidRefreshToken) {
					t.Errorf("Refresh() error = %v, want ErrInvalidRefreshToken", err)
				}
			})
		}
	})

	t.Run("accepts a token revoked inside the grace period", func(t *testing.T) {
		t.Parallel()
		env := newTokenEnv(t)
		env.exec(t, `UPDATE core."appToken" SET "revokedAt" = now() WHERE id = $1`, env.node.RefreshJTI)
		if _, err := env.issuer.Refresh(t.Context(), env.node.Refresh); err != nil {
			t.Errorf("Refresh() error = %v", err)
		}
	})
}

func TestPGIssuer_Revoke(t *testing.T) {
	t.Parallel()
	env := newTokenEnv(t)

	if err := env.issuer.Revoke(t.Context(), env.node.Refresh); err != nil {
		t.Fatalf("Revoke() error = %v", err)
	}

	if revoked, reason := env.revokedAt(t, env.node.RefreshJTI); !revoked || reason != "USER_SIGN_OUT" {
		t.Errorf("revoked, reason = %v, %q, want true, USER_SIGN_OUT", revoked, reason)
	}
	if _, err := env.issuer.Refresh(t.Context(), env.node.Refresh); !errors.Is(err, auth.ErrInvalidRefreshToken) {
		t.Errorf("Refresh(revoked token) error = %v, want ErrInvalidRefreshToken", err)
	}
	if err := env.issuer.Revoke(t.Context(), "not-a-token"); !errors.Is(err, auth.ErrInvalidRefreshToken) {
		t.Errorf("Revoke(garbage) error = %v, want ErrInvalidRefreshToken", err)
	}
}

var _ auth.Issuer = (*auth.PGIssuer)(nil)
