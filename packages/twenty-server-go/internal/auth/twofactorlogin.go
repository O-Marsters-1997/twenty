package auth

import (
	"context"
	"errors"
	"fmt"
	"net/http"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

type LoginTokens interface {
	VerifyLoginToken(ctx context.Context, loginToken string) (LoginClaims, error)
	ConsumeLoginToken(ctx context.Context, login LoginClaims) error
	IssueForWorkspace(ctx context.Context, email, workspaceID string, provider AuthProvider) (TokenPair, error)
}

type WorkspaceOrigins interface {
	ByOriginOrDefault(ctx context.Context, origin string) (OriginWorkspace, error)
}

type TwoFactorLogin struct {
	pool     *pgxpool.Pool
	factor   *TwoFactor
	tokens   LoginTokens
	origins  WorkspaceOrigins
	sessions *UserSession
}

func NewTwoFactorLogin(pool *pgxpool.Pool, factor *TwoFactor, tokens LoginTokens, origins WorkspaceOrigins, sessions *UserSession) *TwoFactorLogin {
	return &TwoFactorLogin{pool: pool, factor: factor, tokens: tokens, origins: origins, sessions: sessions}
}

type loginSubject struct {
	claims      LoginClaims
	userID      string
	workspaceID string
}

type RecoveryLogin struct {
	Tokens          *TokenPair
	ProvisioningURI string
}

func (l *TwoFactorLogin) WithOTP(ctx context.Context, w http.ResponseWriter, r *http.Request, loginToken, otp, origin string) (TokenPair, error) {
	subject, err := l.subject(ctx, loginToken, origin)
	if err != nil {
		return TokenPair{}, err
	}
	if err := l.factor.validateOTP(ctx, subject.userID, subject.workspaceID, otp); err != nil {
		return TokenPair{}, err
	}
	return l.signIn(ctx, w, r, subject)
}

func (l *TwoFactorLogin) WithRecoveryCode(ctx context.Context, w http.ResponseWriter, r *http.Request, loginToken, code, origin string) (RecoveryLogin, error) {
	subject, err := l.subject(ctx, loginToken, origin)
	if err != nil {
		return RecoveryLogin{}, err
	}
	provisioningURI, err := l.factor.RedeemRecoveryCode(ctx, subject.userID, subject.claims.Email, subject.workspaceID, code)
	if err != nil {
		return RecoveryLogin{}, err
	}
	if err := l.sessions.revokeAllInWorkspace(ctx, subject.userID, subject.workspaceID, sessionRevokedTwoFactorReset); err != nil {
		return RecoveryLogin{}, err
	}
	if provisioningURI != "" {
		return RecoveryLogin{ProvisioningURI: provisioningURI}, nil
	}
	pair, err := l.signIn(ctx, w, r, subject)
	if err != nil {
		return RecoveryLogin{}, err
	}
	return RecoveryLogin{Tokens: &pair}, nil
}

func (l *TwoFactorLogin) subject(ctx context.Context, loginToken, origin string) (loginSubject, error) {
	claims, err := l.tokens.VerifyLoginToken(ctx, loginToken)
	if errors.Is(err, ErrInvalidLoginToken) {
		return loginSubject{}, newTwoFactorError("UNAUTHENTICATED", "Token invalid.")
	}
	if err != nil {
		return loginSubject{}, fmt.Errorf("verify login token: %w", err)
	}
	workspace, err := l.origins.ByOriginOrDefault(ctx, origin)
	if errors.Is(err, ErrWorkspaceNotFound) {
		return loginSubject{}, newTwoFactorError("WORKSPACE_NOT_FOUND", "Workspace not found")
	}
	if err != nil {
		return loginSubject{}, fmt.Errorf("resolve workspace by origin: %w", err)
	}
	if claims.WorkspaceID != workspace.ID {
		return loginSubject{}, newTwoFactorError("FORBIDDEN_EXCEPTION", "Token is not valid for this workspace")
	}
	var userID string
	err = l.pool.QueryRow(ctx,
		`SELECT id::text FROM core."user" WHERE lower(email::text) = lower($1) AND "deletedAt" IS NULL`, claims.Email,
	).Scan(&userID)
	if errors.Is(err, pgx.ErrNoRows) {
		return loginSubject{}, newTwoFactorError("USER_NOT_FOUND", "User not found")
	}
	if err != nil {
		return loginSubject{}, fmt.Errorf("look up user by email: %w", err)
	}
	return loginSubject{claims: claims, userID: userID, workspaceID: workspace.ID}, nil
}

func (l *TwoFactorLogin) signIn(ctx context.Context, w http.ResponseWriter, r *http.Request, subject loginSubject) (TokenPair, error) {
	err := l.tokens.ConsumeLoginToken(ctx, subject.claims)
	if errors.Is(err, ErrInvalidLoginToken) || errors.Is(err, ErrLoginTokenConsumed) {
		return TokenPair{}, newTwoFactorError("UNAUTHENTICATED", "Login token already used")
	}
	if err != nil {
		return TokenPair{}, fmt.Errorf("consume login token: %w", err)
	}
	pair, err := l.tokens.IssueForWorkspace(ctx, subject.claims.Email, subject.workspaceID, subject.claims.AuthProvider)
	if err != nil {
		return TokenPair{}, fmt.Errorf("issue tokens: %w", err)
	}
	err = l.sessions.IssueForTokenPair(ctx, w, r, pair, SessionOriginSignIn)
	if errors.Is(err, ErrSessionOriginForbidden) {
		return TokenPair{}, newTwoFactorError("FORBIDDEN_EXCEPTION", "Request origin may not receive a session")
	}
	if err != nil {
		return TokenPair{}, fmt.Errorf("issue session: %w", err)
	}
	return pair, nil
}
