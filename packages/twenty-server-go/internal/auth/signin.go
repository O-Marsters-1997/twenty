package auth

import (
	"context"
	"errors"
	"fmt"
	"time"

	"github.com/golang-jwt/jwt/v5"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

type SignIn struct {
	Pool                      *pgxpool.Pool
	Issuer                    *PGIssuer
	Origins                   *OriginResolver
	TwoFactor                 *TwoFactor
	EmailVerificationRequired bool
}

func (s *SignIn) TokensFromLoginToken(ctx context.Context, loginToken, origin string) (TokenPair, error) {
	login, err := s.Issuer.VerifyLoginToken(ctx, loginToken)
	if errors.Is(err, ErrInvalidLoginToken) {
		return TokenPair{}, newTwoFactorError("UNAUTHENTICATED", "Invalid login token")
	}
	if err != nil {
		return TokenPair{}, err
	}
	target, err := s.Origins.ByOriginOrDefault(ctx, origin)
	if errors.Is(err, ErrWorkspaceNotFound) {
		return TokenPair{}, newTwoFactorError("WORKSPACE_NOT_FOUND", "Workspace not found")
	}
	if err != nil {
		return TokenPair{}, err
	}
	if target.ID != login.WorkspaceID {
		return TokenPair{}, newTwoFactorError("FORBIDDEN_EXCEPTION", "Token is not valid for this workspace")
	}

	var userID string
	var emailVerified bool
	err = s.Pool.QueryRow(ctx,
		`SELECT id::text, "isEmailVerified" FROM core."user" WHERE lower(email::text) = lower($1) AND "deletedAt" IS NULL`, login.Email,
	).Scan(&userID, &emailVerified)
	if errors.Is(err, pgx.ErrNoRows) {
		return TokenPair{}, newTwoFactorError("USER_NOT_FOUND", "User not found")
	}
	if err != nil {
		return TokenPair{}, fmt.Errorf("look up user by email: %w", err)
	}
	if s.EmailVerificationRequired && !emailVerified {
		return TokenPair{}, newTwoFactorError("EMAIL_NOT_VERIFIED", "Email is not verified")
	}

	requirement, err := s.TwoFactor.Requirement(ctx, userID, login.WorkspaceID)
	if errors.Is(err, errUserWorkspaceMissing) {
		return TokenPair{}, newTwoFactorError("USER_WORKSPACE_NOT_FOUND", "User workspace not found")
	}
	if err != nil {
		return TokenPair{}, err
	}
	switch requirement {
	case TwoFactorVerifyRequired:
		return TokenPair{}, newTwoFactorError("TWO_FACTOR_AUTHENTICATION_VERIFICATION_REQUIRED", "Two factor authentication verification required")
	case TwoFactorProvisionRequired:
		return TokenPair{}, newTwoFactorError("TWO_FACTOR_AUTHENTICATION_PROVISION_REQUIRED", "Two factor authentication setup required")
	}

	err = s.Issuer.ConsumeLoginToken(ctx, login)
	if errors.Is(err, ErrInvalidLoginToken) || errors.Is(err, ErrLoginTokenConsumed) {
		return TokenPair{}, newTwoFactorError("UNAUTHENTICATED", "Login token already used")
	}
	if err != nil {
		return TokenPair{}, err
	}
	return s.Issuer.IssueForWorkspace(ctx, userID, login.WorkspaceID, login.AuthProvider)
}

func (s *SignIn) Renew(ctx context.Context, refreshToken string) (TokenPair, error) {
	if refreshToken == "" {
		return TokenPair{}, newTwoFactorError("INVALID_INPUT", "Refresh token not found")
	}
	pair, err := s.Issuer.Refresh(ctx, refreshToken)
	if errors.Is(err, ErrInvalidRefreshToken) {
		return TokenPair{}, newTwoFactorError("FORBIDDEN_EXCEPTION", "This refresh token has been revoked.")
	}
	return pair, err
}

func SessionIssueError(err error) error {
	switch {
	case errors.Is(err, ErrSessionOriginForbidden):
		return newTwoFactorError("FORBIDDEN_EXCEPTION", "Request origin is not allowed to receive a session cookie")
	case errors.Is(err, ErrInvalidSessionTokens):
		return newTwoFactorError("UNAUTHENTICATED", "Cannot issue a session from an invalid token pair")
	}
	return err
}

func (i *PGIssuer) IssueForWorkspace(ctx context.Context, userID, workspaceID string, provider AuthProvider) (TokenPair, error) {
	var pair TokenPair
	err := pgx.BeginFunc(ctx, i.pool, func(tx pgx.Tx) error {
		principal, err := resolvePrincipal(ctx, tx, userID, workspaceID, provider)
		if err != nil {
			return err
		}
		refresh, err := i.insertRefresh(ctx, tx, userID, &workspaceID, provider, TokenTypeAccess)
		if err != nil {
			return err
		}
		access, expiresAt, err := i.IssueAccess(ctx, principal)
		if err != nil {
			return err
		}
		pair = TokenPair{AccessToken: access, RefreshToken: refresh, ExpiresAt: expiresAt}
		return nil
	})
	if err != nil {
		return TokenPair{}, err
	}
	return pair, nil
}

func UnverifiedRefreshTokenExpiry(refreshToken string) (time.Time, error) {
	var parsed jwt.RegisteredClaims
	if _, _, err := jwt.NewParser().ParseUnverified(refreshToken, &parsed); err != nil {
		return time.Time{}, fmt.Errorf("read refresh token expiry: %w", err)
	}
	if parsed.ExpiresAt == nil {
		return time.Time{}, errors.New("read refresh token expiry: no exp claim")
	}
	return parsed.ExpiresAt.Time, nil
}
