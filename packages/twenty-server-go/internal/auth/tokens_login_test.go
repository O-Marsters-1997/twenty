package auth_test

import (
	"errors"
	"testing"
	"time"

	"github.com/google/go-cmp/cmp"

	"github.com/twentyhq/twenty/packages/twenty-server-go/internal/auth"
)

func (e tokenEnv) issuerWithCache(cache auth.CacheStore) *auth.PGIssuer {
	return auth.NewPGIssuer(e.pool, auth.IssuerConfig{
		AppSecret:     e.node.AppSecret,
		EncryptionKey: e.node.EncryptionKey,
		Cache:         cache,
	})
}

func TestPGIssuer_IssueLoginToken(t *testing.T) {
	t.Parallel()
	env := newTokenEnv(t)

	token, err := env.issuer.IssueLoginToken(t.Context(), env.node.UserID, env.node.WorkspaceID, "google")
	if err != nil {
		t.Fatalf("IssueLoginToken() error = %v", err)
	}
	got, _ := decodeClaims(t, token)
	if diff := cmp.Diff(claimNames(t, env.node.Login), claimNames(t, token)); diff != "" {
		t.Errorf("IssueLoginToken() claim names (-node +go):\n%s", diff)
	}
	if got["sub"] != "fixture@example.com" || got["workspaceId"] != env.node.WorkspaceID || got["authProvider"] != "google" {
		t.Errorf("IssueLoginToken() sub, workspaceId, authProvider = %v, %v, %v", got["sub"], got["workspaceId"], got["authProvider"])
	}

	t.Run("rejects a workspace the user does not belong to", func(t *testing.T) {
		t.Parallel()
		if _, err := env.issuer.IssueLoginToken(t.Context(), env.node.UserID, "99999999-9999-4999-8999-999999999999", "password"); err == nil {
			t.Error("IssueLoginToken(foreign workspace) error = nil, want an error")
		}
	})
	t.Run("rejects an unknown provider", func(t *testing.T) {
		t.Parallel()
		if _, err := env.issuer.IssueLoginToken(t.Context(), env.node.UserID, env.node.WorkspaceID, "microsoft"); err == nil {
			t.Error("IssueLoginToken(microsoft) error = nil, want an error")
		}
	})
}

func TestPGIssuer_VerifyLoginToken(t *testing.T) {
	t.Parallel()
	env := newTokenEnv(t)

	t.Run("accepts a Node login token", func(t *testing.T) {
		t.Parallel()
		got, err := env.issuer.VerifyLoginToken(t.Context(), env.node.Login)
		if err != nil {
			t.Fatalf("VerifyLoginToken(node) error = %v", err)
		}
		nodeClaims, _ := decodeClaims(t, env.node.Login)
		want := auth.LoginClaims{
			Email:        stringClaim(t, nodeClaims, "sub"),
			WorkspaceID:  stringClaim(t, nodeClaims, "workspaceId"),
			AuthProvider: auth.AuthProvider(stringClaim(t, nodeClaims, "authProvider")),
			ID:           stringClaim(t, nodeClaims, "jti"),
		}
		if diff := cmp.Diff(want, got); diff != "" {
			t.Errorf("VerifyLoginToken(node) (-want +got):\n%s", diff)
		}
	})

	t.Run("accepts a Go login token", func(t *testing.T) {
		t.Parallel()
		token, err := env.issuer.IssueLoginToken(t.Context(), env.node.UserID, env.node.WorkspaceID, "password")
		if err != nil {
			t.Fatal(err)
		}
		if _, err := env.issuer.VerifyLoginToken(t.Context(), token); err != nil {
			t.Errorf("VerifyLoginToken(go) error = %v", err)
		}
	})

	t.Run("rejects", func(t *testing.T) {
		t.Parallel()
		tests := []struct{ name, token string }{
			{"an access token", env.node.Access},
			{"a refresh token", env.node.Refresh},
			{"garbage", "not-a-token"},
		}
		for _, tt := range tests {
			if _, err := env.issuer.VerifyLoginToken(t.Context(), tt.token); !errors.Is(err, auth.ErrInvalidLoginToken) {
				t.Errorf("VerifyLoginToken(%s) error = %v, want ErrInvalidLoginToken", tt.name, err)
			}
		}
	})
}

func TestPGIssuer_ConsumeLoginToken(t *testing.T) {
	t.Parallel()
	env := newTokenEnv(t)

	t.Run("second use fails", func(t *testing.T) {
		t.Parallel()
		issuer := env.issuerWithCache(newFakeCache())
		login := auth.LoginClaims{ID: "11111111-1111-4111-8111-111111111111"}
		if err := issuer.ConsumeLoginToken(t.Context(), login); err != nil {
			t.Fatalf("ConsumeLoginToken() first error = %v", err)
		}
		if err := issuer.ConsumeLoginToken(t.Context(), login); !errors.Is(err, auth.ErrLoginTokenConsumed) {
			t.Errorf("ConsumeLoginToken() second error = %v, want ErrLoginTokenConsumed", err)
		}
	})

	t.Run("a marker already in the shared cache blocks Go", func(t *testing.T) {
		t.Parallel()
		cache := newFakeCache()
		if _, err := cache.SetIfAbsent(t.Context(), "login-token:consumed:jti-from-node", time.Minute); err != nil {
			t.Fatal(err)
		}
		err := env.issuerWithCache(cache).ConsumeLoginToken(t.Context(), auth.LoginClaims{ID: "jti-from-node"})
		if !errors.Is(err, auth.ErrLoginTokenConsumed) {
			t.Errorf("ConsumeLoginToken(consumed by Node) error = %v, want ErrLoginTokenConsumed", err)
		}
	})

	t.Run("writes Node's key with the login token lifetime", func(t *testing.T) {
		t.Parallel()
		cache := newFakeCache()
		if err := env.issuerWithCache(cache).ConsumeLoginToken(t.Context(), auth.LoginClaims{ID: "jti-from-go"}); err != nil {
			t.Fatal(err)
		}
		ttl, exists := cache.ttl("login-token:consumed:jti-from-go")
		if !exists || ttl != 15*time.Minute {
			t.Errorf("marker login-token:consumed:jti-from-go = ttl %v, exists %v, want 15m, true", ttl, exists)
		}
	})

	t.Run("rejects a token without an id", func(t *testing.T) {
		t.Parallel()
		err := env.issuerWithCache(newFakeCache()).ConsumeLoginToken(t.Context(), auth.LoginClaims{})
		if !errors.Is(err, auth.ErrInvalidLoginToken) {
			t.Errorf("ConsumeLoginToken(no id) error = %v, want ErrInvalidLoginToken", err)
		}
	})
}

func TestPGIssuer_IssueWorkspaceAgnostic(t *testing.T) {
	t.Parallel()
	env := newTokenEnv(t)

	pair, err := env.issuer.IssueWorkspaceAgnostic(t.Context(), env.node.UserID, "password")
	if err != nil {
		t.Fatalf("IssueWorkspaceAgnostic() error = %v", err)
	}
	wantAccess := []string{"authProvider", "exp", "iat", "sub", "type", "userId"}
	if diff := cmp.Diff(wantAccess, claimNames(t, pair.AccessToken)); diff != "" {
		t.Errorf("IssueWorkspaceAgnostic() access claim names (-want +got):\n%s", diff)
	}
	wantRefresh := []string{"authProvider", "exp", "iat", "jti", "sub", "targetedTokenType", "type", "userId"}
	if diff := cmp.Diff(wantRefresh, claimNames(t, pair.RefreshToken)); diff != "" {
		t.Errorf("IssueWorkspaceAgnostic() refresh claim names (-want +got):\n%s", diff)
	}
	access, _ := decodeClaims(t, pair.AccessToken)
	refresh, _ := decodeClaims(t, pair.RefreshToken)
	if access["type"] != "WORKSPACE_AGNOSTIC" || refresh["targetedTokenType"] != "WORKSPACE_AGNOSTIC" {
		t.Errorf("types = %v, %v, want WORKSPACE_AGNOSTIC", access["type"], refresh["targetedTokenType"])
	}
	var storedWorkspace *string
	if err := env.pool.QueryRow(t.Context(),
		`SELECT "workspaceId"::text FROM core."appToken" WHERE id = $1`, stringClaim(t, refresh, "jti"),
	).Scan(&storedWorkspace); err != nil || storedWorkspace != nil {
		t.Errorf("appToken workspaceId = %v, %v, want NULL", storedWorkspace, err)
	}

	t.Run("Refresh rotates it into another workspace-agnostic pair", func(t *testing.T) {
		rotated, err := env.issuer.Refresh(t.Context(), pair.RefreshToken)
		if err != nil {
			t.Fatalf("Refresh(workspace-agnostic) error = %v", err)
		}
		if diff := cmp.Diff(wantRefresh, claimNames(t, rotated.RefreshToken)); diff != "" {
			t.Errorf("Refresh() refresh claim names (-want +got):\n%s", diff)
		}
		rotatedAccess, _ := decodeClaims(t, rotated.AccessToken)
		if rotatedAccess["type"] != "WORKSPACE_AGNOSTIC" || rotatedAccess["sub"] != env.node.UserID {
			t.Errorf("Refresh() access type, sub = %v, %v", rotatedAccess["type"], rotatedAccess["sub"])
		}
		if revoked, _ := env.revokedAt(t, stringClaim(t, refresh, "jti")); !revoked {
			t.Error("Refresh() presented workspace-agnostic refresh token revoked = false, want true")
		}
	})

	t.Run("unknown user", func(t *testing.T) {
		t.Parallel()
		if _, err := env.issuer.IssueWorkspaceAgnostic(t.Context(), "99999999-9999-4999-8999-999999999999", "password"); !errors.Is(err, auth.ErrUnknownUser) {
			t.Errorf("IssueWorkspaceAgnostic(unknown) error = %v, want ErrUnknownUser", err)
		}
	})
}

func TestPGIssuer_IssueForWorkspace(t *testing.T) {
	t.Parallel()
	env := newTokenEnv(t)

	t.Run("matches the claims Node issues for a sign-in", func(t *testing.T) {
		t.Parallel()
		pair, err := env.issuer.IssueForWorkspace(t.Context(), "Fixture@Example.com", env.node.WorkspaceID, "password")
		if err != nil {
			t.Fatalf("IssueForWorkspace() error = %v", err)
		}
		if diff := cmp.Diff(claimNames(t, env.node.Access), claimNames(t, pair.AccessToken)); diff != "" {
			t.Errorf("IssueForWorkspace() access claim names (-node +go):\n%s", diff)
		}
		if diff := cmp.Diff(claimNames(t, env.node.Refresh), claimNames(t, pair.RefreshToken)); diff != "" {
			t.Errorf("IssueForWorkspace() refresh claim names (-node +go):\n%s", diff)
		}
		refresh, _ := decodeClaims(t, pair.RefreshToken)
		if revoked, _ := env.revokedAt(t, stringClaim(t, refresh, "jti")); revoked {
			t.Error("IssueForWorkspace() refresh token already revoked")
		}
		if !pair.RefreshExpiresAt.After(pair.ExpiresAt) {
			t.Errorf("IssueForWorkspace() refresh expiry %v, want after access expiry %v", pair.RefreshExpiresAt, pair.ExpiresAt)
		}
	})

	t.Run("rejects an unknown email", func(t *testing.T) {
		t.Parallel()
		if _, err := env.issuer.IssueForWorkspace(t.Context(), "nobody@example.com", env.node.WorkspaceID, "password"); !errors.Is(err, auth.ErrUnknownUser) {
			t.Errorf("IssueForWorkspace(unknown) error = %v, want ErrUnknownUser", err)
		}
	})
}
