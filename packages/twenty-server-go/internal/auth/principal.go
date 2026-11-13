package auth

import (
	"context"
	"errors"
)

type AuthProvider string // mirrors Node's AuthProviderEnum values

func (p AuthProvider) valid() bool {
	return p == passwordProvider || p == googleProvider
}

type Principal struct {
	UserID            string
	WorkspaceID       string
	UserWorkspaceID   string
	WorkspaceMemberID string
	AuthProvider      AuthProvider
	APIKeyID          string // set for MCP and API-key callers, from core."apiKey"; user fields empty
}

type Verifier interface {
	Verify(ctx context.Context, bearer string) (Principal, error) // ES256 by kid from core."signingKey", HS256 legacy
}

var ErrUnauthenticated = errors.New("unauthenticated")

type principalKey struct{}

func WithPrincipal(ctx context.Context, principal Principal) context.Context {
	return context.WithValue(ctx, principalKey{}, principal)
}

func PrincipalFrom(ctx context.Context) (Principal, bool) {
	principal, ok := ctx.Value(principalKey{}).(Principal)
	return principal, ok
}
