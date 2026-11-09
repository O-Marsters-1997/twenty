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

const workspaceSchema = "workspace_2abogkkt2zd45pa9aun09djpf"

type CalendarChannels struct {
	pool *pgxpool.Pool
}

var _ messaging.CalendarChannels = (*CalendarChannels)(nil)

func NewCalendarChannels(pool *pgxpool.Pool) *CalendarChannels {
	return &CalendarChannels{pool: pool}
}

func (c *CalendarChannels) Get(ctx context.Context, id string) (messaging.CalendarChannel, error) {
	var channel messaging.CalendarChannel
	var cursor *string
	err := c.pool.QueryRow(ctx, `SELECT id::text, "connectedAccountId"::text, "syncCursor"
		FROM core."calendarChannel" WHERE id = $1`, id).Scan(&channel.ID, &channel.ConnectedAccountID, &cursor)
	if errors.Is(err, pgx.ErrNoRows) {
		return messaging.CalendarChannel{}, fmt.Errorf("calendar channel %s: %w", id, ErrNotFound)
	}
	if err != nil {
		return messaging.CalendarChannel{}, fmt.Errorf("select calendar channel: %w", err)
	}
	if cursor != nil {
		channel.Cursor = messaging.SyncCursor(*cursor)
	}
	return channel, nil
}

func (c *CalendarChannels) ActiveIDs(ctx context.Context) ([]string, error) {
	rows, err := c.pool.Query(ctx, `SELECT c.id::text FROM core."calendarChannel" c
		JOIN core."connectedAccount" a ON a.id = c."connectedAccountId"
		WHERE c."isSyncEnabled" AND a."authFailedAt" IS NULL AND a."archivedAt" IS NULL
		ORDER BY c."createdAt"`)
	if err != nil {
		return nil, fmt.Errorf("select active calendar channels: %w", err)
	}
	ids, err := pgx.CollectRows(rows, pgx.RowTo[string])
	if err != nil {
		return nil, fmt.Errorf("read active calendar channels: %w", err)
	}
	return ids, nil
}

func (c *CalendarChannels) Apply(ctx context.Context, channelID string, events []messaging.ImportedEvent, cursor messaging.SyncCursor) error {
	tx, err := c.pool.Begin(ctx)
	if err != nil {
		return fmt.Errorf("begin calendar sync: %w", err)
	}
	defer func() { _ = tx.Rollback(ctx) }()
	var locked string
	err = tx.QueryRow(ctx, `SELECT id::text FROM core."calendarChannel" WHERE id = $1 FOR UPDATE`, channelID).Scan(&locked)
	if errors.Is(err, pgx.ErrNoRows) {
		return fmt.Errorf("calendar channel %s: %w", channelID, ErrNotFound)
	}
	if err != nil {
		return fmt.Errorf("lock calendar channel: %w", err)
	}
	for _, event := range events {
		if err := upsertEvent(ctx, tx, channelID, event); err != nil {
			return fmt.Errorf("store event %s: %w", event.ExternalID, err)
		}
	}
	result, err := tx.Exec(ctx, `UPDATE core."calendarChannel" SET "syncCursor" = nullif($2, ''), "syncedAt" = now(),
		"syncStatus" = 'ACTIVE', "updatedAt" = now() WHERE id = $1`, channelID, string(cursor))
	if err != nil {
		return fmt.Errorf("save sync cursor: %w", err)
	}
	if result.RowsAffected() == 0 {
		return fmt.Errorf("calendar channel %s: %w", channelID, ErrNotFound)
	}
	return tx.Commit(ctx)
}

func upsertEvent(ctx context.Context, tx pgx.Tx, channelID string, event messaging.ImportedEvent) error {
	var eventID string
	err := tx.QueryRow(ctx, `SELECT "calendarEventId"::text FROM `+workspaceSchema+`."calendarChannelEventAssociation"
		WHERE "calendarChannelId" = $1 AND "eventExternalId" = $2 AND "deletedAt" IS NULL`, channelID, event.ExternalID).Scan(&eventID)
	switch {
	case errors.Is(err, pgx.ErrNoRows):
		eventID = ""
	case err != nil:
		return fmt.Errorf("select association: %w", err)
	}

	if event.IsCanceled {
		if eventID == "" {
			return nil
		}
		if _, err := tx.Exec(ctx, `UPDATE `+workspaceSchema+`."calendarEvent" SET "isCanceled" = true, "updatedAt" = now() WHERE id = $1`, eventID); err != nil {
			return fmt.Errorf("cancel event: %w", err)
		}
		return nil
	}

	values := []any{event.Title, event.IsCanceled, event.IsFullDay, nullTime(event.StartsAt), nullTime(event.EndsAt),
		event.Description, event.Location, event.ConferenceLink}
	if eventID != "" {
		_, err = tx.Exec(ctx, `UPDATE `+workspaceSchema+`."calendarEvent" SET title = $2, "isCanceled" = $3, "isFullDay" = $4,
			"startsAt" = $5, "endsAt" = $6, description = $7, location = $8,
			"conferenceLinkPrimaryLinkLabel" = $9, "conferenceLinkPrimaryLinkUrl" = $9, "updatedAt" = now()
			WHERE id = $1`, append([]any{eventID}, values...)...)
		if err != nil {
			return fmt.Errorf("update event: %w", err)
		}
	} else {
		err = tx.QueryRow(ctx, `INSERT INTO `+workspaceSchema+`."calendarEvent" ("createdBySource", "updatedBySource", title, "isCanceled",
			"isFullDay", "startsAt", "endsAt", description, location, "conferenceLinkPrimaryLinkLabel", "conferenceLinkPrimaryLinkUrl")
			VALUES ('CALENDAR', 'CALENDAR', $1, $2, $3, $4, $5, $6, $7, $8, $8) RETURNING id::text`, values...).Scan(&eventID)
		if err != nil {
			return fmt.Errorf("insert event: %w", err)
		}
		_, err = tx.Exec(ctx, `INSERT INTO `+workspaceSchema+`."calendarChannelEventAssociation" ("createdBySource", "updatedBySource",
			"calendarChannelId", "calendarEventId", "eventExternalId") VALUES ('CALENDAR', 'CALENDAR', $1, $2, $3)`,
			channelID, eventID, event.ExternalID)
		if err != nil {
			return fmt.Errorf("insert association: %w", err)
		}
	}

	if _, err := tx.Exec(ctx, `DELETE FROM `+workspaceSchema+`."calendarEventParticipant" WHERE "calendarEventId" = $1`, eventID); err != nil {
		return fmt.Errorf("clear participants: %w", err)
	}
	for _, handle := range event.Participants {
		_, err := tx.Exec(ctx, `INSERT INTO `+workspaceSchema+`."calendarEventParticipant" ("createdBySource", "updatedBySource",
			handle, "calendarEventId") VALUES ('CALENDAR', 'CALENDAR', $1, $2)`, handle, eventID)
		if err != nil {
			return fmt.Errorf("insert participant: %w", err)
		}
	}
	return nil
}

func nullTime(t time.Time) *time.Time {
	if t.IsZero() {
		return nil
	}
	return &t
}
