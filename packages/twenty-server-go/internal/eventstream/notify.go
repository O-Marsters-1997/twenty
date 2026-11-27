package eventstream

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"log/slog"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/twentyhq/twenty/packages/twenty-server-go/internal/records"
	"github.com/twentyhq/twenty/packages/twenty-server-go/internal/workspace"
)

const (
	channel               = "record_events"
	maxNotifyPayloadBytes = 7900
	reconnectDelay        = time.Second
)

type notification struct {
	WorkspaceID string              `json:"workspaceId"`
	Event       records.RecordEvent `json:"event"`
}

type notifyPublisher struct{ next records.EventPublisher }

func NewNotifyPublisher(next records.EventPublisher) records.EventPublisher {
	return notifyPublisher{next: next}
}

func (p notifyPublisher) Publish(ctx context.Context, tx pgx.Tx, event records.RecordEvent) error {
	if err := p.next.Publish(ctx, tx, event); err != nil {
		return err
	}
	payload, err := json.Marshal(notification{WorkspaceID: workspace.PinnedWorkspaceID, Event: event})
	if err != nil {
		return fmt.Errorf("encode %s.%s notification: %w", event.Object, event.Kind, err)
	}
	if len(payload) > maxNotifyPayloadBytes {
		event.Before, event.After = nil, nil
		if payload, err = json.Marshal(notification{WorkspaceID: workspace.PinnedWorkspaceID, Event: event}); err != nil {
			return fmt.Errorf("encode %s.%s notification: %w", event.Object, event.Kind, err)
		}
	}
	if _, err := tx.Exec(ctx, `SELECT pg_notify($1, $2)`, channel, string(payload)); err != nil {
		return fmt.Errorf("notify %s.%s event: %w", event.Object, event.Kind, err)
	}
	return nil
}

func Listen(ctx context.Context, pool *pgxpool.Pool, hub *Hub, logger *slog.Logger) {
	for ctx.Err() == nil {
		if err := listenOnce(ctx, pool, hub, logger); err != nil && ctx.Err() == nil {
			logger.Error("listen for record events", "err", err)
		}
		select {
		case <-ctx.Done():
		case <-time.After(reconnectDelay):
		}
	}
}

func listenOnce(ctx context.Context, pool *pgxpool.Pool, hub *Hub, logger *slog.Logger) (err error) {
	acquired, err := pool.Acquire(ctx)
	if err != nil {
		return fmt.Errorf("acquire listener connection: %w", err)
	}
	listener := acquired.Hijack()
	defer func() {
		if closeErr := listener.Close(context.WithoutCancel(ctx)); closeErr != nil {
			err = errors.Join(err, fmt.Errorf("close listener connection: %w", closeErr))
		}
	}()
	if _, err := listener.Exec(ctx, "LISTEN "+channel); err != nil {
		return fmt.Errorf("listen on %s: %w", channel, err)
	}
	for {
		received, err := listener.WaitForNotification(ctx)
		if err != nil {
			return fmt.Errorf("wait for notification: %w", err)
		}
		var decoded notification
		if err := json.Unmarshal([]byte(received.Payload), &decoded); err != nil {
			logger.Warn("decode record event notification", "err", err)
			continue
		}
		hub.Publish(decoded.WorkspaceID, FromRecordEvent(decoded.Event))
	}
}
