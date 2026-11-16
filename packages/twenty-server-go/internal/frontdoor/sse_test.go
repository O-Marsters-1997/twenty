package frontdoor_test

import (
	"bufio"
	"context"
	"encoding/json"
	"io"
	"log/slog"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	"github.com/twentyhq/twenty/packages/twenty-server-go/internal/frontdoor"
)

type fakeSubscriber struct {
	events    chan json.RawMessage
	started   chan struct{}
	cancelled chan struct{}
}

func newFakeSubscriber() *fakeSubscriber {
	return &fakeSubscriber{
		events:    make(chan json.RawMessage),
		started:   make(chan struct{}),
		cancelled: make(chan struct{}),
	}
}

func (f *fakeSubscriber) Subscribe(ctx context.Context, _ frontdoor.Endpoint, _ json.RawMessage) (<-chan json.RawMessage, error) {
	go func() {
		<-ctx.Done()
		close(f.cancelled)
	}()
	close(f.started)
	return f.events, nil
}

func newSSEFront(t *testing.T, subscriber frontdoor.Subscriber) *httptest.Server {
	t.Helper()
	handler := frontdoor.NewHandler(fakeVerifier{}, http.NotFoundHandler(), slog.New(slog.DiscardHandler)).
		WithSubscriber(subscriber)
	front := httptest.NewServer(handler)
	t.Cleanup(front.Close)
	return front
}

func subscribe(t *testing.T, ctx context.Context, front *httptest.Server, operation string) *http.Response {
	t.Helper()
	body := `{"operationName":"` + operation + `","query":"subscription ` + operation + ` { x }"}`
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, front.URL+"/graphql", strings.NewReader(body))
	if err != nil {
		t.Fatal(err)
	}
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Accept", "text/event-stream")
	req.Header.Set("Authorization", "Bearer valid")
	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() { _ = resp.Body.Close() })
	return resp
}

func waitFor(t *testing.T, signal <-chan struct{}, what string) {
	t.Helper()
	select {
	case <-signal:
	case <-time.After(5 * time.Second):
		t.Fatalf("timed out waiting for %s", what)
	}
}

func TestHandler_ServesGoSubscriptionAsEventStream(t *testing.T) {
	t.Parallel()
	subscriber := newFakeSubscriber()
	front := newSSEFront(t, subscriber)

	resp := subscribe(t, t.Context(), front, "OnGo")
	if got := resp.Header.Get("Content-Type"); got != "text/event-stream" {
		t.Fatalf("Content-Type = %q, want text/event-stream", got)
	}
	subscriber.events <- json.RawMessage(`{"data":{"x":1}}`)
	close(subscriber.events)
	got, err := io.ReadAll(resp.Body)
	if err != nil {
		t.Fatal(err)
	}
	want := "event: next\ndata: {\"data\":{\"x\":1}}\n\nevent: complete\ndata:\n\n"
	if string(got) != want {
		t.Errorf("stream = %q, want %q", got, want)
	}
}

func TestHandler_RejectsUnauthenticatedGoSubscription(t *testing.T) {
	t.Parallel()
	front := newSSEFront(t, newFakeSubscriber())
	body := `{"operationName":"OnGo","query":"subscription OnGo { x }"}`
	req, err := http.NewRequestWithContext(t.Context(), http.MethodPost, front.URL+"/graphql", strings.NewReader(body))
	if err != nil {
		t.Fatal(err)
	}
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Accept", "text/event-stream")
	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		t.Fatal(err)
	}
	defer func() { _ = resp.Body.Close() }()
	got, err := io.ReadAll(resp.Body)
	if err != nil {
		t.Fatal(err)
	}
	if ct := resp.Header.Get("Content-Type"); ct != "application/json" || !strings.Contains(string(got), "UNAUTHENTICATED") {
		t.Errorf("Content-Type = %q, body = %q, want JSON UNAUTHENTICATED error", ct, got)
	}
}

func TestHandler_ClientDisconnectCancelsSubscription(t *testing.T) {
	t.Parallel()
	subscriber := newFakeSubscriber()
	front := newSSEFront(t, subscriber)
	ctx, cancel := context.WithCancel(t.Context())

	resp := subscribe(t, ctx, front, "OnGo")
	waitFor(t, subscriber.started, "subscription start")
	subscriber.events <- json.RawMessage(`{}`)
	if _, err := bufio.NewReader(resp.Body).ReadString('\n'); err != nil {
		t.Fatal(err)
	}
	cancel()
	waitFor(t, subscriber.cancelled, "subscription context cancel")
}
