package ai_test

import (
	"context"
	"encoding/json"
	"sync"
	"testing"
	"time"

	"github.com/google/go-cmp/cmp"

	"github.com/twentyhq/twenty/packages/twenty-server-go/internal/ai"
)

var _ ai.Broker = (*ai.MemoryBroker)(nil)

func chunk(threadID, kind string) ai.ChatEvent {
	return ai.ChatEvent{ThreadID: threadID, Event: json.RawMessage(`{"type":"` + kind + `"}`)}
}

func receive(t *testing.T, ch <-chan ai.ChatEvent) ai.ChatEvent {
	t.Helper()
	select {
	case ev, ok := <-ch:
		if !ok {
			t.Fatal("channel closed, want event")
		}
		return ev
	case <-time.After(2 * time.Second):
		t.Fatal("timed out waiting for event")
	}
	return ai.ChatEvent{}
}

func TestMemoryBroker_Publish(t *testing.T) {
	t.Parallel()

	t.Run("fans out to every subscriber of the thread only", func(t *testing.T) {
		t.Parallel()
		b := ai.NewMemoryBroker()
		first, second := b.Subscribe(t.Context(), "t1"), b.Subscribe(t.Context(), "t1")
		other := b.Subscribe(t.Context(), "t2")

		want := chunk("t1", "text-delta")
		b.Publish("t1", want)

		for _, ch := range []<-chan ai.ChatEvent{first, second} {
			if diff := cmp.Diff(want, receive(t, ch)); diff != "" {
				t.Errorf("event (-want +got):\n%s", diff)
			}
		}
		select {
		case ev := <-other:
			t.Errorf("other thread received %v", ev)
		default:
		}
	})

	t.Run("concurrent with subscribe and unsubscribe", func(t *testing.T) {
		t.Parallel()
		b := ai.NewMemoryBroker()
		stop := make(chan struct{})
		var publishers, subscribers sync.WaitGroup
		for range 4 {
			publishers.Add(1)
			go func() {
				defer publishers.Done()
				for {
					select {
					case <-stop:
						return
					default:
						b.Publish("t1", chunk("t1", "text-delta"))
						b.Catchup("t1")
					}
				}
			}()
		}
		for range 8 {
			subscribers.Add(1)
			go func() {
				defer subscribers.Done()
				ctx, cancel := context.WithTimeout(t.Context(), 2*time.Second)
				defer cancel()
				ch := b.Subscribe(ctx, "t1")
				select {
				case <-ch:
				case <-ctx.Done():
					t.Error("subscriber received no event")
				}
			}()
		}
		subscribers.Wait()
		close(stop)
		publishers.Wait()
	})
}

func TestMemoryBroker_Subscribe(t *testing.T) {
	t.Parallel()

	t.Run("closes the channel when the context ends", func(t *testing.T) {
		t.Parallel()
		b := ai.NewMemoryBroker()
		ctx, cancel := context.WithCancel(t.Context())
		ch := b.Subscribe(ctx, "t1")
		cancel()

		select {
		case _, ok := <-ch:
			if ok {
				t.Error("received event, want closed channel")
			}
		case <-time.After(2 * time.Second):
			t.Fatal("channel not closed after context end")
		}
		b.Publish("t1", chunk("t1", "text-delta"))
	})
}

func TestMemoryBroker_Catchup(t *testing.T) {
	t.Parallel()

	t.Run("empty when idle", func(t *testing.T) {
		t.Parallel()
		if got := ai.NewMemoryBroker().Catchup("t1"); len(got) != 0 {
			t.Errorf("Catchup(idle) = %v, want empty", got)
		}
	})

	t.Run("returns the turn in flight", func(t *testing.T) {
		t.Parallel()
		b := ai.NewMemoryBroker()
		events := []ai.ChatEvent{chunk("t1", "start"), chunk("t1", "text-delta")}
		for _, ev := range events {
			b.Publish("t1", ev)
		}
		if diff := cmp.Diff(events, b.Catchup("t1")); diff != "" {
			t.Errorf("Catchup (-want +got):\n%s", diff)
		}
	})

	for _, end := range []string{"finish", "error", "abort"} {
		t.Run("empty after "+end, func(t *testing.T) {
			t.Parallel()
			b := ai.NewMemoryBroker()
			b.Publish("t1", chunk("t1", "start"))
			b.Publish("t1", chunk("t1", end))
			if got := b.Catchup("t1"); len(got) != 0 {
				t.Errorf("Catchup(after %s) = %v, want empty", end, got)
			}
		})
	}
}
