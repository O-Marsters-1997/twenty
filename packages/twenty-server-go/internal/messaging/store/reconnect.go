package store

import (
	"context"
	"fmt"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

var accountsToReconnectKeys = []string{"ACCOUNTS_TO_RECONNECT_INSUFFICIENT_PERMISSIONS", "ACCOUNTS_TO_RECONNECT_EMAIL_ALIASES"}

const reconnectListScope = `type = 'USER_VARIABLE' AND "userId" = $1::uuid AND "workspaceId" = $2::uuid AND "applicationId" IS NULL
	AND key = ANY($3) AND jsonb_typeof(value) = 'array'`

type ReconnectBanners struct{ pool *pgxpool.Pool }

func NewReconnectBanners(pool *pgxpool.Pool) *ReconnectBanners { return &ReconnectBanners{pool: pool} }

// Dismiss removes the account from the user's reconnect lists and deletes a list left empty.
func (r *ReconnectBanners) Dismiss(ctx context.Context, userID, workspaceID, connectedAccountID string) error {
	err := pgx.BeginFunc(ctx, r.pool, func(tx pgx.Tx) error {
		if _, err := tx.Exec(ctx, `UPDATE core."keyValuePair" SET "updatedAt" = now(), value = coalesce(
				(SELECT jsonb_agg(entry) FROM jsonb_array_elements(value) entry WHERE entry #>> '{}' <> $4), '[]'::jsonb)
			WHERE `+reconnectListScope, userID, workspaceID, accountsToReconnectKeys, connectedAccountID); err != nil {
			return fmt.Errorf("remove account from lists: %w", err)
		}
		if _, err := tx.Exec(ctx, `DELETE FROM core."keyValuePair" WHERE `+reconnectListScope+` AND value = '[]'::jsonb`,
			userID, workspaceID, accountsToReconnectKeys); err != nil {
			return fmt.Errorf("delete empty lists: %w", err)
		}
		return nil
	})
	if err != nil {
		return fmt.Errorf("dismiss reconnect banner: %w", err)
	}
	return nil
}
