package records

import (
	"context"
	"encoding/json"
	"fmt"

	"github.com/jackc/pgx/v5"
	"github.com/riverqueue/river"
)

type EventKind string

const (
	EventCreated   EventKind = "created"
	EventUpdated   EventKind = "updated"
	EventDeleted   EventKind = "deleted"
	EventRestored  EventKind = "restored"
	EventDestroyed EventKind = "destroyed"
)

type RecordEvent struct {
	Object   string          `json:"object"`
	Kind     EventKind       `json:"kind"`
	RecordID string          `json:"recordId"`
	Before   json.RawMessage `json:"before,omitempty"`
	After    json.RawMessage `json:"after,omitempty"`
	Actor    Actor           `json:"actor"`
}

type RecordEventArgs struct {
	Event RecordEvent `json:"event"`
}

func (RecordEventArgs) Kind() string { return "record_event" }

type EventPublisher interface {
	Publish(ctx context.Context, tx pgx.Tx, event RecordEvent) error
}

type riverPublisher struct{ client *river.Client[pgx.Tx] }

func NewRiverPublisher(client *river.Client[pgx.Tx]) EventPublisher {
	return riverPublisher{client: client}
}

func (p riverPublisher) Publish(ctx context.Context, tx pgx.Tx, event RecordEvent) error {
	if _, err := p.client.InsertTx(ctx, tx, RecordEventArgs{Event: event}, nil); err != nil {
		return fmt.Errorf("enqueue %s.%s event: %w", event.Object, event.Kind, err)
	}
	return nil
}
