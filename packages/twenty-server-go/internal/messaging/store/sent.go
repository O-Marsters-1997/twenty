package store

import (
	"context"
	"errors"
	"fmt"
	"strings"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/twentyhq/twenty/packages/twenty-server-go/internal/workspace"
)

var (
	ErrAccountNotOwned = errors.New("connected account is not owned by the caller")
	ErrDraftNotFound   = errors.New("synced draft not found")
)

type SentMessage struct {
	ChannelID         string
	ExternalID        string
	InReplyTo         string
	Subject, Text     string
	From              string
	To, Cc, Bcc       []string
	ReceivedAt        time.Time
	ReplacesMessageID string
}

type Draft struct {
	ExternalID, ChannelID string
}

type Sent struct {
	pool   *pgxpool.Pool
	schema string
}

func NewSent(pool *pgxpool.Pool) *Sent {
	return &Sent{pool: pool, schema: pgx.Identifier{workspace.SchemaName()}.Sanitize()}
}

func (s *Sent) OwnedHandle(ctx context.Context, userWorkspaceID, accountID string) (handle, channelID string, err error) {
	err = s.pool.QueryRow(ctx, `SELECT a.handle, coalesce(c.id::text, '')
		FROM core."connectedAccount" a
		LEFT JOIN core."messageChannel" c ON c."connectedAccountId" = a.id AND c.type = 'EMAIL'
		WHERE a.id = $1 AND a."userWorkspaceId" = $2 AND a."archivedAt" IS NULL
		ORDER BY c."createdAt" LIMIT 1`, accountID, userWorkspaceID).Scan(&handle, &channelID)
	if errors.Is(err, pgx.ErrNoRows) {
		return "", "", ErrAccountNotOwned
	}
	if err != nil {
		return "", "", fmt.Errorf("select connected account: %w", err)
	}
	return handle, channelID, nil
}

func (s *Sent) FindDraft(ctx context.Context, accountID, draftMessageID string) (Draft, error) {
	var draft Draft
	err := s.pool.QueryRow(ctx, `SELECT a."messageExternalId", a."messageChannelId"::text
		FROM `+s.schema+`."messageChannelMessageAssociation" a
		JOIN core."messageChannel" c ON c.id = a."messageChannelId"
		WHERE a."messageId" = $1 AND c."connectedAccountId" = $2 AND coalesce(a."messageExternalId", '') <> ''
		LIMIT 1`, draftMessageID, accountID).Scan(&draft.ExternalID, &draft.ChannelID)
	if errors.Is(err, pgx.ErrNoRows) {
		return Draft{}, fmt.Errorf("draft message %s: %w", draftMessageID, ErrDraftNotFound)
	}
	if err != nil {
		return Draft{}, fmt.Errorf("select draft: %w", err)
	}
	return draft, nil
}

func (s *Sent) Persist(ctx context.Context, sent SentMessage) (threadID string, err error) {
	tx, err := s.pool.Begin(ctx)
	if err != nil {
		return "", fmt.Errorf("begin: %w", err)
	}
	defer func() { _ = tx.Rollback(ctx) }()

	if sent.InReplyTo != "" {
		err = tx.QueryRow(ctx, `SELECT "messageThreadId"::text FROM `+s.schema+`.message
			WHERE "headerMessageId" = $1 AND "messageThreadId" IS NOT NULL AND "deletedAt" IS NULL LIMIT 1`, sent.InReplyTo).Scan(&threadID)
		if err != nil && !errors.Is(err, pgx.ErrNoRows) {
			return "", fmt.Errorf("select parent thread: %w", err)
		}
	}
	if threadID == "" {
		if err := tx.QueryRow(ctx, `INSERT INTO `+s.schema+`."messageThread" (subject) VALUES ($1) RETURNING id::text`, sent.Subject).Scan(&threadID); err != nil {
			return "", fmt.Errorf("insert thread: %w", err)
		}
	}
	var messageID string
	if err := tx.QueryRow(ctx, `INSERT INTO `+s.schema+`.message ("headerMessageId", subject, text, "receivedAt", "isDraft", "messageThreadId")
		VALUES ($1, $2, $3, $4, false, $5) RETURNING id::text`, sent.ExternalID, sent.Subject, sent.Text, sent.ReceivedAt, threadID).Scan(&messageID); err != nil {
		return "", fmt.Errorf("insert message: %w", err)
	}
	if _, err := tx.Exec(ctx, `INSERT INTO `+s.schema+`."messageChannelMessageAssociation"
		("messageExternalId", "messageThreadExternalId", direction, "messageChannelId", "messageId", "messageThreadId")
		VALUES ($1, $1, 'OUTGOING', $2, $3, $4)`, sent.ExternalID, sent.ChannelID, messageID, threadID); err != nil {
		return "", fmt.Errorf("insert association: %w", err)
	}

	participants := []struct {
		role      string
		addresses []string
	}{{"FROM", []string{sent.From}}, {"TO", sent.To}, {"CC", sent.Cc}, {"BCC", sent.Bcc}}
	for _, group := range participants {
		for _, address := range group.addresses {
			if _, err := tx.Exec(ctx, `INSERT INTO `+s.schema+`."messageParticipant" (role, handle, "displayName", "messageId", "personId")
				VALUES ($1::text::`+s.schema+`."messageParticipant_role_enum", $2, $2, $3,
				(SELECT id FROM `+s.schema+`.person WHERE lower("emailsPrimaryEmail") = lower($2) AND "deletedAt" IS NULL LIMIT 1))`,
				group.role, strings.TrimSpace(address), messageID); err != nil {
				return "", fmt.Errorf("insert participant: %w", err)
			}
		}
	}
	if sent.ReplacesMessageID != "" {
		if err := s.deleteDraft(ctx, tx, sent.ReplacesMessageID); err != nil {
			return "", err
		}
	}
	if err := tx.Commit(ctx); err != nil {
		return "", fmt.Errorf("commit: %w", err)
	}
	return threadID, nil
}

func (s *Sent) deleteDraft(ctx context.Context, tx pgx.Tx, draftMessageID string) error {
	var threadID *string
	err := tx.QueryRow(ctx, `DELETE FROM `+s.schema+`."messageChannelMessageAssociation"
		WHERE "messageId" = $1 RETURNING "messageThreadId"::text`, draftMessageID).Scan(&threadID)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil
	}
	if err != nil {
		return fmt.Errorf("delete draft association: %w", err)
	}
	orphan := `AND NOT EXISTS (SELECT 1 FROM ` + s.schema + `."messageChannelMessageAssociation" WHERE "messageId" = $1)`
	for _, statement := range []string{
		`DELETE FROM ` + s.schema + `."messageParticipant" WHERE "messageId" = $1 ` + orphan,
		`DELETE FROM ` + s.schema + `.message WHERE id = $1 ` + orphan,
	} {
		if _, err := tx.Exec(ctx, statement, draftMessageID); err != nil {
			return fmt.Errorf("delete draft message: %w", err)
		}
	}
	if threadID != nil {
		if _, err := tx.Exec(ctx, `DELETE FROM `+s.schema+`."messageThread" WHERE id = $1
			AND NOT EXISTS (SELECT 1 FROM `+s.schema+`.message WHERE "messageThreadId" = $1)`, *threadID); err != nil {
			return fmt.Errorf("delete draft thread: %w", err)
		}
	}
	return nil
}
