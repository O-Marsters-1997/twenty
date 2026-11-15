package config

import (
	"errors"
	"fmt"
	"log/slog"
	"net/url"
	"slices"
	"strconv"
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

	EmailVerificationTokenTTL time.Duration
	PasswordResetTokenTTL     time.Duration
	Email                     Email

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

type Email struct {
	Driver       string
	FromAddress  string
	FromName     string
	SMTPHost     string
	SMTPPort     int
	SMTPUser     string
	SMTPPassword string
	SMTPNoTLS    bool
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
	cfg.Email.FromAddress = valueOr(getenv("EMAIL_FROM_ADDRESS"), "noreply@yourdomain.com")
	cfg.Email.FromName = valueOr(getenv("EMAIL_FROM_NAME"), "Felix from Twenty")
	cfg.Email.SMTPHost = getenv("EMAIL_SMTP_HOST")
	cfg.Email.SMTPUser = getenv("EMAIL_SMTP_USER")
	cfg.Email.SMTPPassword = getenv("EMAIL_SMTP_PASSWORD")
	cfg.Email.SMTPNoTLS = getenv("EMAIL_SMTP_NO_TLS") == "true"
	for _, origin := range strings.Split(getenv("AUTH_COOKIE_ALLOWED_ORIGINS"), ",") {
		if origin = strings.TrimSpace(origin); origin != "" {
			cfg.CookieAllowedOrigins = append(cfg.CookieAllowedOrigins, origin)
		}
	}

	var err error
	for _, ttl := range []struct {
		name, fallback string
		into           *time.Duration
	}{
		{"TWO_FACTOR_AUTHENTICATION_RECOVERY_CODE_EXPIRES_IN", "1h", &cfg.RecoveryCodeTTL},
		{"EMAIL_VERIFICATION_TOKEN_EXPIRES_IN", "1h", &cfg.EmailVerificationTokenTTL},
		{"PASSWORD_RESET_TOKEN_EXPIRES_IN", "5m", &cfg.PasswordResetTokenTTL},
	} {
		if *ttl.into, err = parseTTL(ttl.name, valueOr(getenv(ttl.name), ttl.fallback)); err != nil {
			return Config{}, err
		}
	}

	cfg.Email.Driver = valueOr(getenv("EMAIL_DRIVER"), "logger")
	if cfg.Email.Driver != "logger" && cfg.Email.Driver != "smtp" {
		return Config{}, fmt.Errorf("EMAIL_DRIVER %q must be logger or smtp", cfg.Email.Driver)
	}
	if cfg.Email.SMTPPort, err = strconv.Atoi(valueOr(getenv("EMAIL_SMTP_PORT"), "587")); err != nil {
		return Config{}, fmt.Errorf("parse EMAIL_SMTP_PORT: %w", err)
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

func parseTTL(name, text string) (time.Duration, error) {
	days, hasDays := strings.CutSuffix(text, "d")
	if hasDays {
		text = days + "h"
	}
	ttl, err := time.ParseDuration(text)
	if err != nil || ttl <= 0 {
		return 0, fmt.Errorf("%s %q must be a positive duration like 5m, 1h or 2d", name, text)
	}
	if hasDays {
		ttl *= 24
	}
	return ttl, nil
}

func valueOr(value, fallback string) string {
	if value == "" {
		return fallback
	}
	return value
}
