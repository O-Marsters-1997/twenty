package auth

import (
	"context"
	"errors"
	"fmt"
	"net/url"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/twentyhq/twenty/packages/twenty-server-go/internal/systemmail"
)

// PasswordResetTTL is how long a PASSWORD_RESET_TOKEN stays valid.
const PasswordResetTTL = 5 * time.Minute

// PasswordResetUser is what validatePasswordResetToken returns.
type PasswordResetUser struct {
	ID, Email   string
	HasPassword bool
}

// PasswordReset serves the three password-reset operations against core."appToken".
type PasswordReset struct {
	pool     *pgxpool.Pool
	hasher   PasswordHasher
	sender   systemmail.Sender
	frontURL *url.URL
	now      func() time.Time
}

// NewPasswordReset returns a PasswordReset that mails reset links pointing at frontURL.
func NewPasswordReset(pool *pgxpool.Pool, hasher PasswordHasher, sender systemmail.Sender, frontURL *url.URL) *PasswordReset {
	return &PasswordReset{pool: pool, hasher: hasher, sender: sender, frontURL: frontURL, now: time.Now}
}

// RequestLink mails a reset link; unknown emails succeed silently.
func (p *PasswordReset) RequestLink(ctx context.Context, email, workspaceID string) error {
	return RequestPasswordReset(ctx, p, p.now(), PasswordResetTTL, email, workspaceID)
}

func (p *PasswordReset) Resolve(ctx context.Context, email, workspaceID string) (ResetTarget, bool, error) {
	var target ResetTarget
	err := p.pool.QueryRow(ctx,
		`SELECT u.id::text, u.email::text, $2::text, u."passwordHash" IS NOT NULL AND u."passwordHash" <> ''
		 FROM core."user" u
		 WHERE lower(u.email::text) = lower($1) AND u."deletedAt" IS NULL
		   AND ($2::text = '' OR EXISTS (SELECT 1 FROM core."userWorkspace" uw WHERE uw."userId" = u.id AND uw."workspaceId"::text = $2))`,
		email, workspaceID,
	).Scan(&target.UserID, &target.Email, &target.WorkspaceID, &target.HasPassword)
	if errors.Is(err, pgx.ErrNoRows) {
		return ResetTarget{}, false, nil
	}
	if err != nil {
		return ResetTarget{}, false, fmt.Errorf("look up reset target: %w", err)
	}
	return target, true, nil
}

func (p *PasswordReset) Rotate(ctx context.Context, target ResetTarget, token IssuedAppToken) error {
	return pgx.BeginFunc(ctx, p.pool, func(tx pgx.Tx) error {
		if _, err := tx.Exec(ctx,
			`UPDATE core."appToken" SET "revokedAt" = now() WHERE "userId" = $1 AND type = $2 AND "revokedAt" IS NULL`,
			target.UserID, AppTokenPasswordReset); err != nil {
			return err
		}
		_, err := tx.Exec(ctx,
			`INSERT INTO core."appToken" ("userId", type, value, "expiresAt") VALUES ($1, $2, $3, $4)`,
			target.UserID, AppTokenPasswordReset, token.Hash, token.ExpiresAt)
		return err
	})
}

func (p *PasswordReset) Notify(ctx context.Context, target ResetTarget, token IssuedAppToken) error {
	link := p.frontURL.JoinPath("reset-password", token.Plain).String()
	message, err := systemmail.ResetEmail(target.Email, link, "5 minutes", target.HasPassword)
	if err != nil {
		return err
	}
	return p.sender.Send(ctx, message)
}

type resetToken struct {
	id     string
	user   PasswordResetUser
	stored StoredAppToken
}

func (p *PasswordReset) lookup(ctx context.Context, plain string) (resetToken, error) {
	var token resetToken
	err := p.pool.QueryRow(ctx,
		`SELECT t.id::text, u.id::text, u.email::text, u."passwordHash" IS NOT NULL AND u."passwordHash" <> '', t."expiresAt", t."revokedAt"
		 FROM core."appToken" t JOIN core."user" u ON u.id = t."userId"
		 WHERE t.value = $1 AND t.type = $2 AND t."deletedAt" IS NULL AND u."deletedAt" IS NULL`,
		HashAppToken(plain), AppTokenPasswordReset,
	).Scan(&token.id, &token.user.ID, &token.user.Email, &token.user.HasPassword, &token.stored.ExpiresAt, &token.stored.RevokedAt)
	if errors.Is(err, pgx.ErrNoRows) {
		return resetToken{}, forbidden("Token is invalid")
	}
	if err != nil {
		return resetToken{}, fmt.Errorf("look up reset token: %w", err)
	}
	if err := ValidatePasswordReset(token.stored, p.now()); err != nil {
		return resetToken{}, forbidden("Token is invalid")
	}
	return token, nil
}

// Validate returns the user a live reset token belongs to.
func (p *PasswordReset) Validate(ctx context.Context, plain string) (PasswordResetUser, error) {
	token, err := p.lookup(ctx, plain)
	return token.user, err
}

// UpdatePassword sets a new password and revokes the token.
func (p *PasswordReset) UpdatePassword(ctx context.Context, plain, newPassword string) error {
	token, err := p.lookup(ctx, plain)
	if err != nil {
		return err
	}
	hash, err := HashNewPassword(p.hasher, newPassword)
	if errors.Is(err, ErrPasswordInvalid) {
		return &LoginError{Code: "BAD_USER_INPUT", SubCode: "PASSWORD_TOO_WEAK", Message: "Password too weak", FriendlyMessage: "Password too weak."}
	}
	if err != nil {
		return err
	}
	return pgx.BeginFunc(ctx, p.pool, func(tx pgx.Tx) error {
		if _, err := tx.Exec(ctx, `UPDATE core."user" SET "passwordHash" = $2 WHERE id = $1`, token.user.ID, hash); err != nil {
			return err
		}
		_, err := tx.Exec(ctx, `UPDATE core."appToken" SET "revokedAt" = now() WHERE id = $1`, token.id)
		return err
	})
}
