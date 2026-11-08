package store_test

import (
	"context"
	"errors"
	"strings"
	"testing"

	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/twentyhq/twenty/packages/twenty-server-go/internal/messaging/store"
	"github.com/twentyhq/twenty/packages/twenty-server-go/internal/pgtest"
)

type prefixCipher struct{}

func (prefixCipher) Encrypt(plaintext string) (string, error) { return "enc:v2:" + plaintext, nil }
func (prefixCipher) Decrypt(ciphertext string) (string, error) {
	return strings.TrimPrefix(ciphertext, "enc:v2:"), nil
}

func seedAccount(t *testing.T, pool *pgxpool.Pool) string {
	t.Helper()
	tx, err := pool.Begin(t.Context())
	if err != nil {
		t.Fatalf("begin: %v", err)
	}
	t.Cleanup(func() { _ = tx.Rollback(context.Background()) })
	if _, err := tx.Exec(t.Context(), `SET LOCAL session_replication_role = replica`); err != nil {
		t.Fatalf("disable foreign keys: %v", err)
	}
	var id string
	err = tx.QueryRow(t.Context(), `INSERT INTO core."connectedAccount" ("workspaceId", handle, provider, "accessToken", "refreshToken", scopes, "userWorkspaceId")
		VALUES (gen_random_uuid(), 'me@example.com', 'google', 'enc:v2:old', 'enc:v2:refresh', '{gmail.send}', gen_random_uuid()) RETURNING id::text`).Scan(&id)
	if err != nil {
		t.Fatalf("seed account: %v", err)
	}
	if err := tx.Commit(t.Context()); err != nil {
		t.Fatalf("commit: %v", err)
	}
	return id
}

func TestAccounts_NotFound(t *testing.T) {
	t.Parallel()
	pool, err := pgxpool.New(t.Context(), pgtest.New(t))
	if err != nil {
		t.Fatalf("connect: %v", err)
	}
	t.Cleanup(pool.Close)
	accounts := store.NewAccounts(pool, prefixCipher{})
	missing := "00000000-0000-0000-0000-000000000000"
	if _, err := accounts.Get(t.Context(), missing); !errors.Is(err, store.ErrNotFound) {
		t.Errorf("Get(missing) error = %v, want ErrNotFound", err)
	}
	if err := accounts.MarkAuthFailed(t.Context(), missing); !errors.Is(err, store.ErrNotFound) {
		t.Errorf("MarkAuthFailed(missing) error = %v, want ErrNotFound", err)
	}
}

func TestAccounts_GetAndUpdate(t *testing.T) {
	t.Parallel()
	pool, err := pgxpool.New(t.Context(), pgtest.New(t))
	if err != nil {
		t.Fatalf("connect: %v", err)
	}
	t.Cleanup(pool.Close)
	accounts := store.NewAccounts(pool, prefixCipher{})
	id := seedAccount(t, pool)

	got, err := accounts.Get(t.Context(), id)
	if err != nil {
		t.Fatalf("Get: %v", err)
	}
	if got.Handle != "me@example.com" || got.AccessToken != "old" || got.RefreshToken != "refresh" || len(got.Scopes) != 1 || got.AuthFailedAt != nil {
		t.Fatalf("Get = %+v", got)
	}

	if err := accounts.SaveAccessToken(t.Context(), id, "fresh"); err != nil {
		t.Fatalf("SaveAccessToken: %v", err)
	}
	if err := accounts.MarkAuthFailed(t.Context(), id); err != nil {
		t.Fatalf("MarkAuthFailed: %v", err)
	}
	got, err = accounts.Get(t.Context(), id)
	if err != nil || got.AccessToken != "fresh" || got.AuthFailedAt == nil {
		t.Fatalf("Get after update = %+v, %v", got, err)
	}
}
