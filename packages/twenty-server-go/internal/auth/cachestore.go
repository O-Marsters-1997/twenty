package auth

import (
	"context"
	"fmt"
	"time"

	"github.com/redis/go-redis/v9"
)

type CacheStore interface {
	SetIfAbsent(ctx context.Context, key string, ttl time.Duration) (bool, error)
	Delete(ctx context.Context, keys ...string) error
}

type RedisCache struct {
	client redis.Cmdable
	prefix string
}

func NewRedisCache(client redis.Cmdable, keyPrefix string) *RedisCache {
	if keyPrefix != "" {
		keyPrefix += ":"
	}
	return &RedisCache{client: client, prefix: keyPrefix + "engine:auth-session:"}
}

func (c *RedisCache) SetIfAbsent(ctx context.Context, key string, ttl time.Duration) (bool, error) {
	created, err := c.client.SetNX(ctx, c.prefix+key, "true", ttl).Result()
	if err != nil {
		return false, fmt.Errorf("set cache key: %w", err)
	}
	return created, nil
}

func (c *RedisCache) Delete(ctx context.Context, keys ...string) error {
	if len(keys) == 0 {
		return nil
	}
	prefixed := make([]string, len(keys))
	for i, key := range keys {
		prefixed[i] = c.prefix + key
	}
	if err := c.client.Del(ctx, prefixed...).Err(); err != nil {
		return fmt.Errorf("delete cache keys: %w", err)
	}
	return nil
}
