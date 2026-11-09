package messaging

import (
	"context"
	"errors"
	"fmt"
	"slices"
	"strings"
	"time"
)

type SyncCursor string // Gmail historyId or Calendar syncToken

type ImportedEvent struct {
	ExternalID, Title, Description, Location, ConferenceLink string
	StartsAt, EndsAt                                         time.Time
	IsCanceled, IsFullDay                                    bool
	Participants                                             []string
}

type CalendarSource interface {
	ListChanges(ctx context.Context, account ConnectedAccount, since SyncCursor) ([]ImportedEvent, SyncCursor, error)
}

type CalendarChannel struct {
	ID, ConnectedAccountID string
	Cursor                 SyncCursor
}

type CalendarChannels interface {
	Get(ctx context.Context, id string) (CalendarChannel, error)
	ActiveIDs(ctx context.Context) ([]string, error)
	Apply(ctx context.Context, channelID string, events []ImportedEvent, cursor SyncCursor) error
}

type CalendarSyncer struct {
	Channels CalendarChannels
	Accounts Accounts
	Source   CalendarSource
}

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

type ImportedMessage struct {
	ExternalID, ThreadExternalID, Subject, Text, HTML string
	From                                              string
	To, Cc, Bcc                                       []string
	ReceivedAt                                        time.Time
	Direction                                         string // INCOMING, OUTGOING
	Labels                                            []string
}

// MailSource reads a mailbox through the Gmail history API. An empty since lists the whole mailbox.
type MailSource interface {
	ListChanges(ctx context.Context, account ConnectedAccount, since SyncCursor) (ids []string, next SyncCursor, err error)
	FetchMessages(ctx context.Context, account ConnectedAccount, ids []string) ([]ImportedMessage, error)
}

var ErrSyncCursorExpired = errors.New("sync cursor expired") // full resync required

var ErrChannelNotFound = errors.New("message channel not found")

type Channel struct {
	ID, ConnectedAccountID string
	SyncCursor             SyncCursor
}

// SyncStore is the persistence message sync needs.
type SyncStore interface {
	Channel(ctx context.Context, id string) (Channel, error)
	ActiveChannelIDs(ctx context.Context) ([]string, error)
	// Blocklist returns blocked handles: full addresses or "@domain" suffixes.
	Blocklist(ctx context.Context) ([]string, error)
	// Import stores the messages the channel has not seen and advances its cursor in one transaction.
	Import(ctx context.Context, channelID string, messages []ImportedMessage, cursor SyncCursor) error
}

type Syncer struct {
	Source   MailSource
	Accounts Accounts
	Store    SyncStore
}

// Sync imports the channel's new messages and advances its cursor, restarting from an empty cursor when Gmail has expired it.
func (s *Syncer) Sync(ctx context.Context, channelID string) error {
	channel, err := s.Store.Channel(ctx, channelID)
	if err != nil {
		return fmt.Errorf("load channel: %w", err)
	}
	account, err := s.Accounts.Get(ctx, channel.ConnectedAccountID)
	if err != nil {
		return fmt.Errorf("load connected account: %w", err)
	}
	if account.AuthFailedAt != nil {
		return ErrAccountAuthFailed
	}
	ids, next, err := s.Source.ListChanges(ctx, account, channel.SyncCursor)
	if errors.Is(err, ErrSyncCursorExpired) {
		ids, next, err = s.Source.ListChanges(ctx, account, "")
	}
	if err != nil {
		return fmt.Errorf("list changes: %w", err)
	}
	var messages []ImportedMessage
	if len(ids) > 0 {
		if messages, err = s.Source.FetchMessages(ctx, account, ids); err != nil {
			return fmt.Errorf("fetch messages: %w", err)
		}
	}
	blocklist, err := s.Store.Blocklist(ctx)
	if err != nil {
		return fmt.Errorf("load blocklist: %w", err)
	}
	messages = slices.DeleteFunc(messages, func(message ImportedMessage) bool {
		return isBlocked(message, account.Handle, blocklist)
	})
	if err := s.Store.Import(ctx, channelID, messages, next); err != nil {
		return fmt.Errorf("import messages: %w", err)
	}
	return nil
}

func isBlocked(message ImportedMessage, own string, blocklist []string) bool {
	participants := append(append(append([]string{message.From}, message.To...), message.Cc...), message.Bcc...)
	for _, participant := range participants {
		handle := strings.ToLower(participant)
		if handle == "" || handle == strings.ToLower(own) {
			continue
		}
		for _, blocked := range blocklist {
			blocked = strings.ToLower(blocked)
			if handle == blocked || strings.HasPrefix(blocked, "@") && strings.HasSuffix(handle, blocked) {
				return true
			}
		}
	}
	return false
}
