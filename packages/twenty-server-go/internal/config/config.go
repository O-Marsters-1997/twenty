package config

import (
	"errors"
	"fmt"
	"log/slog"
	"net/url"
	"slices"
	"strings"
	"time"
)

type Config struct {
	ListenAddr      string
	DatabaseURL     string
	AppSecret       string
	NodeUpstreamURL *url.URL
	LogLevel        slog.Level

	EncryptionKey         string
	FallbackEncryptionKey string
	RecoveryCodeTTL       time.Duration

	RedisURL             string
	RedisCachePrefix     string
	ServerURL            string
	FrontendURL          string
	CookieAllowedOrigins []string
	CookieSameSite       string
	Production           bool
	TrustProxy           bool
	MultiWorkspace       bool
	DefaultSubdomain     string
}

// Load reads the process environment through getenv. NODE_UPSTREAM_URL is required.
func Load(getenv func(string) string) (Config, error) {
	cfg := Config{
		ListenAddr:  valueOr(getenv("LISTEN_ADDR"), ":3000"),
		DatabaseURL: getenv("PG_DATABASE_URL"),
		AppSecret:   getenv("APP_SECRET"),

		EncryptionKey:         getenv("ENCRYPTION_KEY"),
		FallbackEncryptionKey: getenv("FALLBACK_ENCRYPTION_KEY"),

		RedisURL:         getenv("REDIS_URL"),
		RedisCachePrefix: getenv("REDIS_CACHE_PREFIX"),
		ServerURL:        valueOr(getenv("SERVER_URL"), "http://localhost:3000"),
		FrontendURL:      getenv("FRONTEND_URL"),
		CookieSameSite:   valueOr(getenv("AUTH_COOKIE_SAME_SITE"), "lax"),
		Production:       valueOr(getenv("NODE_ENV"), "production") == "production",
		TrustProxy:       !slices.Contains([]string{"", "false", "0"}, valueOr(getenv("TRUST_PROXY"), "loopback, linklocal, uniquelocal")),
		MultiWorkspace:   getenv("IS_MULTIWORKSPACE_ENABLED") == "true",
		DefaultSubdomain: valueOr(getenv("DEFAULT_SUBDOMAIN"), "app"),
	}
	for _, origin := range strings.Split(getenv("AUTH_COOKIE_ALLOWED_ORIGINS"), ",") {
		if origin = strings.TrimSpace(origin); origin != "" {
			cfg.CookieAllowedOrigins = append(cfg.CookieAllowedOrigins, origin)
		}
	}

	ttlText := valueOr(getenv("TWO_FACTOR_AUTHENTICATION_RECOVERY_CODE_EXPIRES_IN"), "1h")
	days, hasDays := strings.CutSuffix(ttlText, "d")
	if hasDays {
		ttlText = days + "h"
	}
	ttl, err := time.ParseDuration(ttlText)
	if err != nil || ttl <= 0 {
		return Config{}, fmt.Errorf("TWO_FACTOR_AUTHENTICATION_RECOVERY_CODE_EXPIRES_IN %q must be a positive duration like 1h or 2d", getenv("TWO_FACTOR_AUTHENTICATION_RECOVERY_CODE_EXPIRES_IN"))
	}
	if hasDays {
		ttl *= 24
	}
	cfg.RecoveryCodeTTL = ttl

	upstream := getenv("NODE_UPSTREAM_URL")
	if upstream == "" {
		return Config{}, errors.New("NODE_UPSTREAM_URL is required")
	}
	parsed, err := url.Parse(upstream)
	if err != nil {
		return Config{}, fmt.Errorf("parse NODE_UPSTREAM_URL: %w", err)
	}
	if parsed.Scheme == "" || parsed.Host == "" {
		return Config{}, fmt.Errorf("NODE_UPSTREAM_URL %q needs a scheme and host", upstream)
	}
	cfg.NodeUpstreamURL = parsed

	if level := getenv("LOG_LEVEL"); level != "" {
		if err := cfg.LogLevel.UnmarshalText([]byte(level)); err != nil {
			return Config{}, fmt.Errorf("parse LOG_LEVEL: %w", err)
		}
	}
	return cfg, nil
}

func valueOr(value, fallback string) string {
	if value == "" {
		return fallback
	}
	return value
}
