package auth

import (
	"context"
	"crypto/rand"
	"crypto/sha256"
	"encoding/hex"
	"errors"
	"fmt"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/twentyhq/twenty/packages/twenty-server-go/internal/systemmail"
)

const (
	emailVerificationTokenType = "EMAIL_VERIFICATION_TOKEN"
	passwordResetTokenType     = "PASSWORD_RESET_TOKEN"
)

var (
	ErrTokenInvalid         = errors.New("token is invalid")
	ErrTokenExpired         = errors.New("token expired")
	ErrTokenEmailMismatch   = errors.New("token was issued for another email")
	ErrEmailAlreadyVerified = errors.New("email already verified")
)

type IssuedToken struct {
	Token     string
	ExpiresAt time.Time
}

type AppTokenStore struct{ pool *pgxpool.Pool }

func NewAppTokenStore(pool *pgxpool.Pool) *AppTokenStore { return &AppTokenStore{pool: pool} }

func HashAppToken(token string) string {
	sum := sha256.Sum256([]byte(token))
	return hex.EncodeToString(sum[:])
}

func newOpaqueToken(ttl time.Duration) (IssuedToken, error) {
	raw := make([]byte, 32)
	if _, err := rand.Read(raw); err != nil {
		return IssuedToken{}, fmt.Errorf("generate token: %w", err)
	}
	return IssuedToken{Token: hex.EncodeToString(raw), ExpiresAt: time.Now().Add(ttl)}, nil
}

func (s *AppTokenStore) IssueEmailVerification(ctx context.Context, userID, email string, ttl time.Duration) (IssuedToken, error) {
	issued, err := newOpaqueToken(ttl)
	if err != nil {
		return IssuedToken{}, err
	}
	_, err = s.pool.Exec(ctx,
		`INSERT INTO core."appToken" ("userId", type, value, "expiresAt", context) VALUES ($1, $2, $3, $4, jsonb_build_object('email', $5::text))`,
		userID, emailVerificationTokenType, HashAppToken(issued.Token), issued.ExpiresAt, email)
	if err != nil {
		return IssuedToken{}, fmt.Errorf("insert email verification token: %w", err)
	}
	return issued, nil
}

func (s *AppTokenStore) ValidateEmailVerification(ctx context.Context, token, email string) (userID string, err error) {
	var verified bool
	err = s.pool.QueryRow(ctx, `SELECT EXISTS (SELECT 1 FROM core."user" WHERE email = $1 AND "isEmailVerified" AND "deletedAt" IS NULL)`, email).Scan(&verified)
	if err != nil {
		return "", fmt.Errorf("check email verified: %w", err)
	}
	if verified {
		return "", ErrEmailAlreadyVerified
	}

	var expiresAt time.Time
	var tokenEmail *string
	err = s.pool.QueryRow(ctx,
		`SELECT "userId", "expiresAt", context->>'email' FROM core."appToken" WHERE value = $1 AND type = $2 AND "deletedAt" IS NULL`,
		HashAppToken(token), emailVerificationTokenType).Scan(&userID, &expiresAt, &tokenEmail)
	switch {
	case errors.Is(err, pgx.ErrNoRows):
		return "", ErrTokenInvalid
	case err != nil:
		return "", fmt.Errorf("find email verification token: %w", err)
	case time.Now().After(expiresAt):
		return "", ErrTokenExpired
	case tokenEmail == nil || *tokenEmail != email:
		return "", ErrTokenEmailMismatch
	}
	return userID, nil
}

func (s *AppTokenStore) RotatePasswordReset(ctx context.Context, userID, workspaceID string, ttl time.Duration) (IssuedToken, error) {
	issued, err := newOpaqueToken(ttl)
	if err != nil {
		return IssuedToken{}, err
	}
	tx, err := s.pool.Begin(ctx)
	if err != nil {
		return IssuedToken{}, fmt.Errorf("begin password reset rotation: %w", err)
	}
	defer func() { _ = tx.Rollback(ctx) }()
	if _, err := tx.Exec(ctx,
		`UPDATE core."appToken" SET "revokedAt" = now() WHERE "userId" = $1 AND type = $2 AND "revokedAt" IS NULL`,
		userID, passwordResetTokenType); err != nil {
		return IssuedToken{}, fmt.Errorf("revoke password reset tokens: %w", err)
	}
	if _, err := tx.Exec(ctx,
		`INSERT INTO core."appToken" ("userId", "workspaceId", type, value, "expiresAt") VALUES ($1, $2, $3, $4, $5)`,
		userID, workspaceID, passwordResetTokenType, HashAppToken(issued.Token), issued.ExpiresAt); err != nil {
		return IssuedToken{}, fmt.Errorf("insert password reset token: %w", err)
	}
	if err := tx.Commit(ctx); err != nil {
		return IssuedToken{}, fmt.Errorf("commit password reset rotation: %w", err)
	}
	return issued, nil
}

func (s *AppTokenStore) ValidatePasswordReset(ctx context.Context, token string) (userID string, err error) {
	err = s.pool.QueryRow(ctx,
		`SELECT "userId" FROM core."appToken" WHERE value = $1 AND type = $2 AND "expiresAt" > now() AND "revokedAt" IS NULL AND "deletedAt" IS NULL AND "userId" IS NOT NULL`,
		HashAppToken(token), passwordResetTokenType).Scan(&userID)
	switch {
	case errors.Is(err, pgx.ErrNoRows):
		return "", ErrTokenInvalid
	case err != nil:
		return "", fmt.Errorf("find password reset token: %w", err)
	}
	return userID, nil
}

func (s *AppTokenStore) InvalidatePasswordReset(ctx context.Context, userID string) error {
	if _, err := s.pool.Exec(ctx,
		`UPDATE core."appToken" SET "revokedAt" = now() WHERE "userId" = $1 AND type = $2 AND "revokedAt" IS NULL`,
		userID, passwordResetTokenType); err != nil {
		return fmt.Errorf("revoke password reset tokens: %w", err)
	}
	return nil
}

type PasswordResetRequester struct {
	Tokens    *AppTokenStore
	Sender    systemmail.Sender
	TTL       time.Duration
	BuildLink func(ctx context.Context, workspaceID, token string) (string, error)
}

func (r PasswordResetRequester) Request(ctx context.Context, email, preferredWorkspaceID string) error {
	var userID string
	var hasPassword bool
	err := r.Tokens.pool.QueryRow(ctx,
		`SELECT id, "passwordHash" IS NOT NULL FROM core."user" WHERE email = $1 AND "deletedAt" IS NULL`, email).Scan(&userID, &hasPassword)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil
	}
	if err != nil {
		return fmt.Errorf("find user for password reset: %w", err)
	}

	var workspaceID string
	err = r.Tokens.pool.QueryRow(ctx,
		`SELECT w.id FROM core.workspace w JOIN core."userWorkspace" uw ON uw."workspaceId" = w.id
		 WHERE uw."userId" = $1 AND uw."deletedAt" IS NULL AND w."deletedAt" IS NULL AND w."isPasswordAuthEnabled"
		 ORDER BY (w.id = NULLIF($2, '')::uuid) DESC, w."createdAt" ASC LIMIT 1`, userID, preferredWorkspaceID).Scan(&workspaceID)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil
	}
	if err != nil {
		return fmt.Errorf("find password reset workspace: %w", err)
	}

	issued, err := r.Tokens.RotatePasswordReset(ctx, userID, workspaceID, r.TTL)
	if err != nil {
		return err
	}
	link, err := r.BuildLink(ctx, workspaceID, issued.Token)
	if err != nil {
		return fmt.Errorf("build password reset link: %w", err)
	}
	message := systemmail.PasswordReset(link, r.TTL, hasPassword)
	message.To = email
	if err := r.Sender.Send(ctx, message); err != nil {
		return fmt.Errorf("send password reset email: %w", err)
	}
	return nil
}
