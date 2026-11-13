package auth

import (
	"sync"
	"time"
)

type Throttle interface {
	Allow(key string, limit int, window time.Duration) bool
}

type bucket struct {
	tokens float64
	last   time.Time
}

type MemoryThrottle struct {
	mu      sync.Mutex
	buckets map[string]*bucket
	now     func() time.Time
}

func NewMemoryThrottle() *MemoryThrottle {
	return &MemoryThrottle{buckets: map[string]*bucket{}, now: time.Now}
}

func (t *MemoryThrottle) Allow(key string, limit int, window time.Duration) bool {
	t.mu.Lock()
	defer t.mu.Unlock()
	now := t.now()
	b, ok := t.buckets[key]
	if !ok {
		b = &bucket{tokens: float64(limit), last: now}
		t.buckets[key] = b
	}
	b.tokens = min(float64(limit), b.tokens+float64(limit)*now.Sub(b.last).Seconds()/window.Seconds())
	b.last = now
	if b.tokens < 1 {
		return false
	}
	b.tokens--
	return true
}
