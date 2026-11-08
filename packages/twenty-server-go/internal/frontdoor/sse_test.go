package frontdoor_test

import (
	"bufio"
	"context"
	"encoding/json"
	"io"
	"log/slog"
	"net/http"
	"net/http/httptest"
	"net/url"
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

func newSSEFront(t *testing.T, subscriber frontdoor.Subscriber) (front *httptest.Server, nodeHits func() int) {
	t.Helper()
	hits := make(chan struct{}, 10)
	node := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
		hits <- struct{}{}
		if _, err := w.Write([]byte("node")); err != nil {
			t.Error(err)
		}
	}))
	t.Cleanup(node.Close)
	upstream, err := url.Parse(node.URL)
	if err != nil {
		t.Fatal(err)
	}
	table := frontdoor.OperationTable{frontdoor.EndpointWorkspace: {"OnGo": frontdoor.RouteGo}}
	handler := frontdoor.NewHandler(table, upstream, fakeVerifier{}, http.NotFoundHandler(), slog.New(slog.DiscardHandler)).
		WithSubscriber(subscriber)
	front = httptest.NewServer(handler)
	t.Cleanup(front.Close)
	return front, func() int { return len(hits) }
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
	front, nodeHits := newSSEFront(t, subscriber)

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
	if hits := nodeHits(); hits != 0 {
		t.Errorf("node hits = %d, want 0", hits)
	}
}

func TestHandler_ProxiesUnmarkedSubscriptionToNode(t *testing.T) {
	t.Parallel()
	front, nodeHits := newSSEFront(t, newFakeSubscriber())

	resp := subscribe(t, t.Context(), front, "OnNode")
	got, err := io.ReadAll(resp.Body)
	if err != nil {
		t.Fatal(err)
	}
	if string(got) != "node" || nodeHits() != 1 {
		t.Errorf("body = %q, node hits = %d, want node proxied once", got, nodeHits())
	}
}

func TestHandler_ClientDisconnectCancelsSubscription(t *testing.T) {
	t.Parallel()
	subscriber := newFakeSubscriber()
	front, _ := newSSEFront(t, subscriber)
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
