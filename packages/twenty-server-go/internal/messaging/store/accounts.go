package store

import (
	"context"
	"errors"
	"fmt"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/twentyhq/twenty/packages/twenty-server-go/internal/messaging"
)

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
	var authFailedAt *time.Time
	err := a.pool.QueryRow(ctx, `SELECT id::text, handle, "accessToken", "refreshToken", coalesce(scopes, '{}'), "authFailedAt"
		FROM core."connectedAccount" WHERE id = $1 AND "archivedAt" IS NULL`, id).
		Scan(&account.ID, &account.Handle, &accessToken, &refreshToken, &account.Scopes, &authFailedAt)
	if errors.Is(err, pgx.ErrNoRows) {
		return account, fmt.Errorf("connected account %s: %w", id, err)
	}
	if err != nil {
		return account, fmt.Errorf("select connected account: %w", err)
	}
	account.AuthFailedAt = authFailedAt
	if account.AccessToken, err = a.decrypt(accessToken); err != nil {
		return account, fmt.Errorf("decrypt access token: %w", err)
	}
	if account.RefreshToken, err = a.decrypt(refreshToken); err != nil {
		return account, fmt.Errorf("decrypt refresh token: %w", err)
	}
	return account, nil
}

func (a *Accounts) SaveAccessToken(ctx context.Context, id, accessToken string) error {
	encrypted, err := a.cipher.Encrypt(accessToken)
	if err != nil {
		return fmt.Errorf("encrypt access token: %w", err)
	}
	_, err = a.pool.Exec(ctx, `UPDATE core."connectedAccount"
		SET "accessToken" = $2, "lastCredentialsRefreshedAt" = now(), "updatedAt" = now() WHERE id = $1`, id, encrypted)
	if err != nil {
		return fmt.Errorf("update access token: %w", err)
	}
	return nil
}

func (a *Accounts) MarkAuthFailed(ctx context.Context, id string) error {
	_, err := a.pool.Exec(ctx, `UPDATE core."connectedAccount" SET "authFailedAt" = now(), "updatedAt" = now() WHERE id = $1`, id)
	if err != nil {
		return fmt.Errorf("update auth failed: %w", err)
	}
	return nil
}

func (a *Accounts) decrypt(ciphertext *string) (string, error) {
	if ciphertext == nil {
		return "", nil
	}
	return a.cipher.Decrypt(*ciphertext)
}
