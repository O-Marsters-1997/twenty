package auth

import (
	"context"
	"errors"
)

type AuthProvider string // mirrors Node's AuthProviderEnum values

type Principal struct {
	UserID            string
	WorkspaceID       string
	UserWorkspaceID   string
	WorkspaceMemberID string
	AuthProvider      AuthProvider
}

type Verifier interface {
	Verify(ctx context.Context, bearer string) (Principal, error) // ES256 by kid from core."signingKey", HS256 legacy
}

var ErrUnauthenticated = errors.New("unauthenticated")
