package auth

import (
	"context"
	"crypto/rand"
	"crypto/sha256"
	"encoding/hex"
	"errors"
	"fmt"
	"time"
)

const (
	AppTokenEmailVerification = "EMAIL_VERIFICATION_TOKEN"
	AppTokenPasswordReset     = "PASSWORD_RESET_TOKEN"
)

// IssuedAppToken carries the plain token for the user and the hash core."appToken".value stores.
type IssuedAppToken struct {
	Plain, Hash string
	ExpiresAt   time.Time
}

// StoredAppToken is the part of a core."appToken" row the validators read.
type StoredAppToken struct {
	ExpiresAt time.Time
	RevokedAt *time.Time
	Email     string
}

var (
	ErrTokenInvalid  = errors.New("invalid token")
	ErrTokenExpired  = errors.New("token expired")
	ErrEmailMismatch = errors.New("email does not match token")
)

// HashAppToken returns the sha256 hex digest Node stores in core."appToken".value.
func HashAppToken(plain string) string {
	sum := sha256.Sum256([]byte(plain))
	return hex.EncodeToString(sum[:])
}

// IssueAppToken mints 32 random bytes as hex that expire ttl after now.
func IssueAppToken(now time.Time, ttl time.Duration) (IssuedAppToken, error) {
	raw := make([]byte, 32)
	if _, err := rand.Read(raw); err != nil {
		return IssuedAppToken{}, fmt.Errorf("generate app token: %w", err)
	}
	plain := hex.EncodeToString(raw)
	return IssuedAppToken{Plain: plain, Hash: HashAppToken(plain), ExpiresAt: now.Add(ttl)}, nil
}

// ValidateEmailVerification checks a looked-up EMAIL_VERIFICATION_TOKEN in Node's order.
func ValidateEmailVerification(token StoredAppToken, email string, now time.Time) error {
	switch {
	case now.After(token.ExpiresAt):
		return ErrTokenExpired
	case token.Email == "":
		return ErrTokenInvalid
	case token.Email != email:
		return ErrEmailMismatch
	}
	return nil
}

// ValidatePasswordReset checks a looked-up PASSWORD_RESET_TOKEN is unexpired and unrevoked.
func ValidatePasswordReset(token StoredAppToken, now time.Time) error {
	if !token.ExpiresAt.After(now) || token.RevokedAt != nil {
		return ErrTokenInvalid
	}
	return nil
}

type ResetTarget struct {
	UserID, WorkspaceID, Email string
	HasPassword                bool
}

type ResetRequests interface {
	Resolve(ctx context.Context, email, workspaceID string) (target ResetTarget, found bool, err error)
	Rotate(ctx context.Context, target ResetTarget, token IssuedAppToken) error
	Notify(ctx context.Context, target ResetTarget, token IssuedAppToken) error
}

// RequestPasswordReset returns nil for an unknown email or workspace so callers cannot enumerate
// accounts; only infrastructure errors surface.
func RequestPasswordReset(ctx context.Context, requests ResetRequests, now time.Time, ttl time.Duration, email, workspaceID string) error {
	target, found, err := requests.Resolve(ctx, email, workspaceID)
	if err != nil {
		return fmt.Errorf("resolve reset target: %w", err)
	}
	if !found {
		return nil
	}
	token, err := IssueAppToken(now, ttl)
	if err != nil {
		return err
	}
	if err := requests.Rotate(ctx, target, token); err != nil {
		return fmt.Errorf("rotate reset token: %w", err)
	}
	if err := requests.Notify(ctx, target, token); err != nil {
		return fmt.Errorf("send reset link: %w", err)
	}
	return nil
}
