package aigql

import (
	"context"
	"encoding/json"
	"fmt"
	"time"

	"github.com/twentyhq/twenty/packages/twenty-server-go/internal/ai"
	"github.com/twentyhq/twenty/packages/twenty-server-go/internal/frontdoor"
)

const keepaliveInterval = 2 * time.Second

type Subscriber struct {
	broker ai.Broker
}

var _ frontdoor.Subscriber = (*Subscriber)(nil)

func NewSubscriber(broker ai.Broker) *Subscriber {
	return &Subscriber{broker: broker}
}

func (s *Subscriber) Subscribe(ctx context.Context, _ frontdoor.Endpoint, request json.RawMessage) (<-chan json.RawMessage, error) {
	var body struct {
		Variables struct {
			ThreadID string `json:"threadId"`
		} `json:"variables"`
	}
	if err := json.Unmarshal(request, &body); err != nil {
		return nil, fmt.Errorf("decode subscription request: %w", err)
	}
	threadID := body.Variables.ThreadID

	events := s.broker.Subscribe(ctx, threadID)
	out := make(chan json.RawMessage)
	go func() {
		defer close(out)
		send := func(event json.RawMessage) bool {
			payload, err := json.Marshal(map[string]any{"data": map[string]any{
				"onAgentChatEvent": map[string]any{"threadId": threadID, "event": event},
			}})
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
		keepalive := json.RawMessage(`{"type":"keepalive"}`)
		if !send(keepalive) {
			return
		}
		ticker := time.NewTicker(keepaliveInterval)
		defer ticker.Stop()
		for {
			select {
			case <-ctx.Done():
				return
			case <-ticker.C:
				if !send(keepalive) {
					return
				}
			case event, open := <-events:
				if !open || !send(event.Event) {
					return
				}
			}
		}
	}()
	return out, nil
}
