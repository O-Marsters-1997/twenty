package config

import (
	"errors"
	"fmt"
	"log/slog"
	"net/url"
)

type Config struct {
	ListenAddr      string
	DatabaseURL     string
	AppSecret       string
	NodeUpstreamURL *url.URL
	LogLevel        slog.Level
}

// Load reads the process environment through getenv. NODE_UPSTREAM_URL is required.
func Load(getenv func(string) string) (Config, error) {
	cfg := Config{
		ListenAddr:  valueOr(getenv("LISTEN_ADDR"), ":3000"),
		DatabaseURL: getenv("PG_DATABASE_URL"),
		AppSecret:   getenv("APP_SECRET"),
	}

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
