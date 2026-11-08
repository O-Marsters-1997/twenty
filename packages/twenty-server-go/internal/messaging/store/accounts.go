package store

import (
	"context"
	"errors"
	"fmt"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/twentyhq/twenty/packages/twenty-server-go/internal/messaging"
)

var ErrNotFound = errors.New("connected account not found")

// Cipher encrypts and decrypts the OAuth tokens stored in core."connectedAccount".
type Cipher interface {
	Encrypt(plaintext string) (string, error)
	Decrypt(ciphertext string) (string, error)
}

type Accounts struct {
	pool   *pgxpool.Pool
	cipher Cipher
}

var _ messaging.Accounts = (*Accounts)(nil)

func NewAccounts(pool *pgxpool.Pool, cipher Cipher) *Accounts {
	return &Accounts{pool: pool, cipher: cipher}
}

func (a *Accounts) Get(ctx context.Context, id string) (messaging.ConnectedAccount, error) {
	var account messaging.ConnectedAccount
	var accessToken, refreshToken *string
	err := a.pool.QueryRow(ctx, `SELECT id::text, handle, "accessToken", "refreshToken", coalesce(scopes, '{}'), "authFailedAt"
		FROM core."connectedAccount" WHERE id = $1 AND "archivedAt" IS NULL`, id).
		Scan(&account.ID, &account.Handle, &accessToken, &refreshToken, &account.Scopes, &account.AuthFailedAt)
	if errors.Is(err, pgx.ErrNoRows) {
		return messaging.ConnectedAccount{}, fmt.Errorf("connected account %s: %w", id, ErrNotFound)
	}
	if err != nil {
		return messaging.ConnectedAccount{}, fmt.Errorf("select connected account: %w", err)
	}
	if account.AccessToken, err = a.decrypt(accessToken); err != nil {
		return messaging.ConnectedAccount{}, fmt.Errorf("decrypt access token: %w", err)
	}
	if account.RefreshToken, err = a.decrypt(refreshToken); err != nil {
		return messaging.ConnectedAccount{}, fmt.Errorf("decrypt refresh token: %w", err)
	}
	return account, nil
}

func (a *Accounts) SaveAccessToken(ctx context.Context, id, accessToken string) error {
	encrypted, err := a.cipher.Encrypt(accessToken)
	if err != nil {
		return fmt.Errorf("encrypt access token: %w", err)
	}
	return a.update(ctx, id, `"accessToken" = $2, "lastCredentialsRefreshedAt" = now()`, encrypted)
}

func (a *Accounts) MarkAuthFailed(ctx context.Context, id string) error {
	return a.update(ctx, id, `"authFailedAt" = now()`)
}

func (a *Accounts) update(ctx context.Context, id, assignments string, args ...any) error {
	result, err := a.pool.Exec(ctx, `UPDATE core."connectedAccount" SET `+assignments+`, "updatedAt" = now()
		WHERE id = $1 AND "archivedAt" IS NULL`, append([]any{id}, args...)...)
	if err != nil {
		return fmt.Errorf("update connected account: %w", err)
	}
	if result.RowsAffected() == 0 {
		return fmt.Errorf("connected account %s: %w", id, ErrNotFound)
	}
	return nil
}

func (a *Accounts) decrypt(ciphertext *string) (string, error) {
	if ciphertext == nil {
		return "", nil
	}
	return a.cipher.Decrypt(*ciphertext)
}
