package frontdoor

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"regexp"
	"strings"

	"github.com/twentyhq/twenty/packages/twenty-server-go/internal/auth"
)

type Subscriber interface {
	Subscribe(ctx context.Context, endpoint Endpoint, request json.RawMessage) (<-chan json.RawMessage, error)
}

func (h *Handler) WithSubscriber(subscriber Subscriber) *Handler {
	h.subscriber = subscriber
	return h
}

var subscriptionPattern = regexp.MustCompile(`^\s*subscription\b`)

func isSubscription(body []byte) bool {
	requests := parseRequests(body)
	return len(requests) == 1 && subscriptionPattern.MatchString(requests[0].Query)
}

func wantsEventStream(r *http.Request) bool {
	return strings.Contains(r.Header.Get("Accept"), "text/event-stream")
}

func (h *Handler) serveSubscription(w http.ResponseWriter, r *http.Request, endpoint Endpoint, body []byte) {
	principal, ok := h.authenticate(w, r)
	if !ok {
		return
	}
	flusher, ok := w.(http.Flusher)
	if !ok {
		http.Error(w, "streaming unsupported", http.StatusInternalServerError)
		return
	}
	ctx, cancel := context.WithCancel(auth.WithPrincipal(r.Context(), principal))
	defer cancel()
	events, err := h.subscriber.Subscribe(ctx, endpoint, body)
	if err != nil {
		h.logger.Error("subscribe", "err", err)
		h.writeGraphQLError(w, "Internal server error", "INTERNAL_SERVER_ERROR")
		return
	}

	w.Header().Set("Content-Type", "text/event-stream")
	w.Header().Set("Cache-Control", "no-cache")
	w.WriteHeader(http.StatusOK)
	flusher.Flush()
	for {
		select {
		case <-ctx.Done():
			return
		case event, open := <-events:
			if !open {
				if _, err := fmt.Fprint(w, "event: complete\ndata:\n\n"); err != nil {
					return
				}
				flusher.Flush()
				return
			}
			if _, err := fmt.Fprintf(w, "event: next\ndata: %s\n\n", event); err != nil {
				return
			}
			flusher.Flush()
		}
	}
}
