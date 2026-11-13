package config

import (
	"errors"
	"fmt"
	"log/slog"
	"net/url"
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
}

// Load reads the process environment through getenv. NODE_UPSTREAM_URL is required.
func Load(getenv func(string) string) (Config, error) {
	cfg := Config{
		ListenAddr:  valueOr(getenv("LISTEN_ADDR"), ":3000"),
		DatabaseURL: getenv("PG_DATABASE_URL"),
		AppSecret:   getenv("APP_SECRET"),

		EncryptionKey:         getenv("ENCRYPTION_KEY"),
		FallbackEncryptionKey: getenv("FALLBACK_ENCRYPTION_KEY"),
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
