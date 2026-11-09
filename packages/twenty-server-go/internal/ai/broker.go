package ai

import (
	"context"
	"encoding/json"
	"log/slog"
	"sync"
	"time"
)

const (
	subscriberBuffer = 256
	saveTimeout      = 5 * time.Second

	chunkStart  = "start"
	chunkFinish = "finish"
	chunkError  = "error"
	chunkAbort  = "abort"
)

func chunkType(event ChatEvent) string {
	var chunk struct {
		Type string `json:"type"`
	}
	if err := json.Unmarshal(event.Event, &chunk); err != nil {
		return ""
	}
	return chunk.Type
}

// MemoryBroker is an in-process Broker. A subscriber that falls
// subscriberBuffer events behind misses events rather than blocking Publish.
type MemoryBroker struct {
	mu   sync.Mutex
	subs map[string]map[chan ChatEvent]struct{}
	turn map[string][]ChatEvent
}

func NewMemoryBroker() *MemoryBroker {
	return &MemoryBroker{
		subs: map[string]map[chan ChatEvent]struct{}{},
		turn: map[string][]ChatEvent{},
	}
}

// Publish records the event in the thread's turn: "start" opens a turn and
// "finish", "error" or "abort" close it.
func (b *MemoryBroker) Publish(threadID string, event ChatEvent) {
	b.mu.Lock()
	defer b.mu.Unlock()

	switch chunkType(event) {
	case chunkStart:
		b.turn[threadID] = []ChatEvent{event}
	case chunkFinish, chunkError, chunkAbort:
		delete(b.turn, threadID)
	case chunkQueueUpdated:
	default:
		if _, inFlight := b.turn[threadID]; inFlight {
			b.turn[threadID] = append(b.turn[threadID], event)
		}
	}

	for sub := range b.subs[threadID] {
		select {
		case sub <- event:
		default:
		}
	}
}

func (b *MemoryBroker) Subscribe(ctx context.Context, threadID string) <-chan ChatEvent {
	sub := make(chan ChatEvent, subscriberBuffer)

	b.mu.Lock()
	if b.subs[threadID] == nil {
		b.subs[threadID] = map[chan ChatEvent]struct{}{}
	}
	b.subs[threadID][sub] = struct{}{}
	b.mu.Unlock()

	go func() {
		<-ctx.Done()
		b.mu.Lock()
		defer b.mu.Unlock()
		delete(b.subs[threadID], sub)
		if len(b.subs[threadID]) == 0 {
			delete(b.subs, threadID)
		}
		close(sub)
	}()

	return sub
}

func (b *MemoryBroker) Catchup(threadID string) []ChatEvent {
	b.mu.Lock()
	defer b.mu.Unlock()
	return append([]ChatEvent(nil), b.turn[threadID]...)
}

type PersistingBroker struct {
	Broker
	chunks ChunkStore
	logger *slog.Logger
}

func NewPersistingBroker(inner Broker, chunks ChunkStore, logger *slog.Logger) *PersistingBroker {
	return &PersistingBroker{Broker: inner, chunks: chunks, logger: logger}
}

func (b *PersistingBroker) Publish(threadID string, event ChatEvent) {
	ctx, cancel := context.WithTimeout(context.Background(), saveTimeout)
	defer cancel()
	if err := b.chunks.SaveChunk(ctx, event); err != nil {
		b.logger.Error("save chat chunk", "thread_id", threadID, "err", err)
	}
	b.Broker.Publish(threadID, event)
}
