package eventstream

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"time"

	"github.com/twentyhq/twenty/packages/twenty-server-go/internal/auth"
	"github.com/twentyhq/twenty/packages/twenty-server-go/internal/frontdoor"
)

const (
	RootField         = "onEventSubscription"
	keepaliveInterval = 30 * time.Second
)

type Subscriber struct {
	hub       *Hub
	keepalive time.Duration
}

var _ frontdoor.Subscriber = (*Subscriber)(nil)

func NewSubscriber(hub *Hub) *Subscriber {
	return &Subscriber{hub: hub, keepalive: keepaliveInterval}
}

func OwnerOf(principal auth.Principal) Owner {
	return Owner{UserWorkspaceID: principal.UserWorkspaceID, APIKeyID: principal.APIKeyID}
}

func (s *Subscriber) Subscribe(ctx context.Context, _ frontdoor.Endpoint, request json.RawMessage) (<-chan json.RawMessage, error) {
	var body struct {
		Variables struct {
			EventStreamID string `json:"eventStreamId"`
		} `json:"variables"`
	}
	if err := json.Unmarshal(request, &body); err != nil {
		return nil, fmt.Errorf("decode subscription request: %w", err)
	}
	principal, ok := auth.PrincipalFrom(ctx)
	if !ok {
		return nil, auth.ErrUnauthenticated
	}
	streamID := body.Variables.EventStreamID
	stream, err := s.hub.Open(principal.WorkspaceID, streamID, OwnerOf(principal))
	switch {
	case errors.Is(err, ErrStreamExists):
		return nil, &frontdoor.SubscribeError{Message: err.Error(), Code: "FORBIDDEN", SubCode: "EVENT_STREAM_ALREADY_EXISTS"}
	case err != nil:
		return nil, fmt.Errorf("open event stream: %w", err)
	}

	out := make(chan json.RawMessage)
	go func() {
		defer close(out)
		defer stream.Close()
		send := func(batch []EventWithQueryIDs) bool {
			payload, err := json.Marshal(map[string]any{"data": map[string]any{RootField: map[string]any{
				"eventStreamId":                  streamID,
				"objectRecordEventsWithQueryIds": batch,
				"metadataEvents":                 []any{},
				"queueJobEvents":                 []any{},
			}}})
			if err != nil {
				return false
			}
			select {
			case out <- payload:
				return true
			case <-ctx.Done():
				return false
			}
		}
		if !send([]EventWithQueryIDs{}) {
			return
		}
		ticker := time.NewTicker(s.keepalive)
		defer ticker.Stop()
		for {
			select {
			case <-ctx.Done():
				return
			case <-ticker.C:
				if !send([]EventWithQueryIDs{}) {
					return
				}
			case batch, open := <-stream.Events():
				if !open || !send(batch) {
					return
				}
			}
		}
	}()
	return out, nil
}
