package messaging

import (
	"context"
	"errors"
	"fmt"
	"time"
)

type ImportedEvent struct {
	ExternalID, Title, Description, Location, ConferenceLink string
	StartsAt, EndsAt                                         time.Time
	IsCanceled, IsFullDay                                    bool
	Participants                                             []string
}

// CalendarSource lists the events changed since a cursor; an empty cursor lists everything.
// It returns ErrSyncCursorExpired when the provider no longer honours the cursor.
type CalendarSource interface {
	ListChanges(ctx context.Context, account ConnectedAccount, since SyncCursor) ([]ImportedEvent, SyncCursor, error)
}

type CalendarChannel struct {
	ID, ConnectedAccountID string
	Cursor                 SyncCursor
}

// CalendarChannels is the persistence calendar sync needs.
type CalendarChannels interface {
	Get(ctx context.Context, id string) (CalendarChannel, error)
	ActiveIDs(ctx context.Context) ([]string, error)
	// Apply stores the events and the new cursor in one transaction.
	Apply(ctx context.Context, channelID string, events []ImportedEvent, cursor SyncCursor) error
}

type CalendarSyncer struct {
	Channels CalendarChannels
	Accounts Accounts
	Source   CalendarSource
}

// SyncChannel imports what changed since the channel's cursor, restarting from scratch when the cursor expired.
func (s *CalendarSyncer) SyncChannel(ctx context.Context, channelID string) error {
	channel, err := s.Channels.Get(ctx, channelID)
	if err != nil {
		return fmt.Errorf("load calendar channel: %w", err)
	}
	account, err := s.Accounts.Get(ctx, channel.ConnectedAccountID)
	if err != nil {
		return fmt.Errorf("load connected account: %w", err)
	}
	if account.AuthFailedAt != nil {
		return ErrAccountAuthFailed
	}
	events, cursor, err := s.Source.ListChanges(ctx, account, channel.Cursor)
	if errors.Is(err, ErrSyncCursorExpired) {
		events, cursor, err = s.Source.ListChanges(ctx, account, "")
	}
	if err != nil {
		return fmt.Errorf("list calendar changes: %w", err)
	}
	if err := s.Channels.Apply(ctx, channelID, events, cursor); err != nil {
		return fmt.Errorf("apply calendar changes: %w", err)
	}
	return nil
}
