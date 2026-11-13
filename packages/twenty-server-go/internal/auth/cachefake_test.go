package auth_test

import (
	"context"
	"sync"
	"time"
)

type fakeCache struct {
	mu   sync.Mutex
	keys map[string]time.Duration
}

func newFakeCache() *fakeCache {
	return &fakeCache{keys: map[string]time.Duration{}}
}

func (c *fakeCache) SetIfAbsent(_ context.Context, key string, ttl time.Duration) (bool, error) {
	c.mu.Lock()
	defer c.mu.Unlock()
	if _, exists := c.keys[key]; exists {
		return false, nil
	}
	c.keys[key] = ttl
	return true, nil
}

func (c *fakeCache) Delete(_ context.Context, keys ...string) error {
	c.mu.Lock()
	defer c.mu.Unlock()
	for _, key := range keys {
		delete(c.keys, key)
	}
	return nil
}

func (c *fakeCache) ttl(key string) (time.Duration, bool) {
	c.mu.Lock()
	defer c.mu.Unlock()
	ttl, exists := c.keys[key]
	return ttl, exists
}
