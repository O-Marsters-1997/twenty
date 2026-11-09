package store

import (
	"context"
	"errors"
	"fmt"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/twentyhq/twenty/packages/twenty-server-go/internal/messaging"
	"github.com/twentyhq/twenty/packages/twenty-server-go/internal/workspace"
)

type Sync struct{ pool *pgxpool.Pool }

var _ messaging.SyncStore = (*Sync)(nil)

func NewSync(pool *pgxpool.Pool) *Sync { return &Sync{pool: pool} }

func table(name string) string {
	return pgx.Identifier{workspace.SchemaName(), name}.Sanitize()
}

func (s *Sync) Channel(ctx context.Context, id string) (messaging.Channel, error) {
	var channel messaging.Channel
	var cursor *string
	err := s.pool.QueryRow(ctx, `SELECT id::text, "connectedAccountId"::text, "syncCursor"
		FROM core."messageChannel" WHERE id = $1`, id).Scan(&channel.ID, &channel.ConnectedAccountID, &cursor)
	if errors.Is(err, pgx.ErrNoRows) {
		return messaging.Channel{}, fmt.Errorf("channel %s: %w", id, messaging.ErrChannelNotFound)
	}
	if err != nil {
		return messaging.Channel{}, fmt.Errorf("select message channel: %w", err)
	}
	if cursor != nil {
		channel.SyncCursor = messaging.SyncCursor(*cursor)
	}
	return channel, nil
}

func (s *Sync) ActiveChannelIDs(ctx context.Context) ([]string, error) {
	rows, err := s.pool.Query(ctx, `SELECT c.id::text FROM core."messageChannel" c
		JOIN core."connectedAccount" a ON a.id = c."connectedAccountId"
		WHERE c."isSyncEnabled" AND c.type = 'EMAIL' AND c."syncStatus" <> 'FAILED_INSUFFICIENT_PERMISSIONS'
			AND a."archivedAt" IS NULL AND a."authFailedAt" IS NULL AND a.provider = 'google'
		ORDER BY c.id`)
	if err != nil {
		return nil, fmt.Errorf("select active channels: %w", err)
	}
	ids, err := pgx.CollectRows(rows, pgx.RowTo[string])
	if err != nil {
		return nil, fmt.Errorf("scan active channels: %w", err)
	}
	return ids, nil
}

func (s *Sync) Blocklist(ctx context.Context) ([]string, error) {
	rows, err := s.pool.Query(ctx, `SELECT handle FROM `+table("blocklist")+` WHERE "deletedAt" IS NULL AND handle IS NOT NULL`)
	if err != nil {
		return nil, fmt.Errorf("select blocklist: %w", err)
	}
	handles, err := pgx.CollectRows(rows, pgx.RowTo[string])
	if err != nil {
		return nil, fmt.Errorf("scan blocklist: %w", err)
	}
	return handles, nil
}

// Import drops HTML and labels: the message table has no column for either.
func (s *Sync) Import(ctx context.Context, channelID string, messages []messaging.ImportedMessage, cursor messaging.SyncCursor) error {
	tx, err := s.pool.Begin(ctx)
	if err != nil {
		return fmt.Errorf("begin import: %w", err)
	}
	defer func() { _ = tx.Rollback(ctx) }()
	for _, message := range messages {
		if err := importMessage(ctx, tx, channelID, message); err != nil {
			return fmt.Errorf("import message %s: %w", message.ExternalID, err)
		}
	}
	tag, err := tx.Exec(ctx, `UPDATE core."messageChannel"
		SET "syncCursor" = coalesce(nullif($2, ''), "syncCursor"), "syncedAt" = now(), "syncStatus" = 'ACTIVE', "updatedAt" = now()
		WHERE id = $1`, channelID, string(cursor))
	if err != nil {
		return fmt.Errorf("advance sync cursor: %w", err)
	}
	if tag.RowsAffected() == 0 {
		return fmt.Errorf("channel %s: %w", channelID, messaging.ErrChannelNotFound)
	}
	return tx.Commit(ctx)
}

func importMessage(ctx context.Context, tx pgx.Tx, channelID string, message messaging.ImportedMessage) error {
	var seen bool
	if err := tx.QueryRow(ctx, `SELECT EXISTS (SELECT 1 FROM `+table("messageChannelMessageAssociation")+`
		WHERE "messageChannelId" = $1 AND "messageExternalId" = $2 AND "deletedAt" IS NULL)`, channelID, message.ExternalID).Scan(&seen); err != nil {
		return fmt.Errorf("check existing message: %w", err)
	}
	if seen {
		return nil
	}
	var threadID string
	err := tx.QueryRow(ctx, `SELECT "messageThreadId"::text FROM `+table("messageChannelMessageAssociation")+`
		WHERE "messageChannelId" = $1 AND "messageThreadExternalId" = $2 AND "deletedAt" IS NULL LIMIT 1`,
		channelID, message.ThreadExternalID).Scan(&threadID)
	if errors.Is(err, pgx.ErrNoRows) {
		err = tx.QueryRow(ctx, `INSERT INTO `+table("messageThread")+` (subject) VALUES ($1) RETURNING id::text`, message.Subject).Scan(&threadID)
	}
	if err != nil {
		return fmt.Errorf("resolve thread: %w", err)
	}
	var messageID string
	if err := tx.QueryRow(ctx, `INSERT INTO `+table("message")+` ("headerMessageId", subject, text, "receivedAt", "messageThreadId")
		VALUES ($1, $2, $3, $4, $5) RETURNING id::text`,
		message.ExternalID, message.Subject, message.Text, message.ReceivedAt, threadID).Scan(&messageID); err != nil {
		return fmt.Errorf("insert message: %w", err)
	}
	if _, err := tx.Exec(ctx, `INSERT INTO `+table("messageChannelMessageAssociation")+`
		("messageChannelId", "messageId", "messageThreadId", "messageExternalId", "messageThreadExternalId", direction)
		VALUES ($1, $2, $3, $4, $5, $6::`+pgx.Identifier{workspace.SchemaName(), "messageChannelMessageAssociation_direction_enum"}.Sanitize()+`)`,
		channelID, messageID, threadID, message.ExternalID, message.ThreadExternalID, message.Direction); err != nil {
		return fmt.Errorf("insert association: %w", err)
	}
	roles := []struct {
		role      string
		addresses []string
	}{{"FROM", []string{message.From}}, {"TO", message.To}, {"CC", message.Cc}, {"BCC", message.Bcc}}
	for _, group := range roles {
		for _, address := range group.addresses {
			if address == "" {
				continue
			}
			if _, err := tx.Exec(ctx, `INSERT INTO `+table("messageParticipant")+` ("messageId", role, handle)
				VALUES ($1, $2::`+pgx.Identifier{workspace.SchemaName(), "messageParticipant_role_enum"}.Sanitize()+`, $3)`,
				messageID, group.role, address); err != nil {
				return fmt.Errorf("insert participant: %w", err)
			}
		}
	}
	return nil
}
