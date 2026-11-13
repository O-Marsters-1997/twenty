package auth_test

import (
	"testing"
	"time"

	"github.com/alicebob/miniredis/v2"
	"github.com/redis/go-redis/v9"

	"github.com/twentyhq/twenty/packages/twenty-server-go/internal/auth"
)

func TestRedisCache(t *testing.T) {
	t.Parallel()
	server := miniredis.RunT(t)
	client := redis.NewClient(&redis.Options{Addr: server.Addr()})
	t.Cleanup(func() { _ = client.Close() })
	cache := auth.NewRedisCache(client, "prod")

	first, err := cache.SetIfAbsent(t.Context(), "login-token:consumed:abc", time.Minute)
	if err != nil || !first {
		t.Fatalf("SetIfAbsent() = %v, %v, want true, nil", first, err)
	}
	second, err := cache.SetIfAbsent(t.Context(), "login-token:consumed:abc", time.Minute)
	if err != nil || second {
		t.Fatalf("SetIfAbsent() again = %v, %v, want false, nil", second, err)
	}

	const nodeKey = "prod:engine:auth-session:login-token:consumed:abc"
	if got, err := server.Get(nodeKey); err != nil || got != "true" {
		t.Errorf("redis %s = %q, %v, want JSON true as Node writes it", nodeKey, got, err)
	}
	if ttl := server.TTL(nodeKey); ttl != time.Minute {
		t.Errorf("redis %s ttl = %v, want 1m", nodeKey, ttl)
	}

	if err := cache.Delete(t.Context(), "login-token:consumed:abc"); err != nil {
		t.Fatalf("Delete() error = %v", err)
	}
	if server.Exists(nodeKey) {
		t.Errorf("redis %s exists after Delete()", nodeKey)
	}
}
