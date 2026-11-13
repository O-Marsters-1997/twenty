package main

import (
	"errors"
	"fmt"
	"log/slog"
	"net/http"
	"net/url"
	"os"
	"strings"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/redis/go-redis/v9"

	"github.com/twentyhq/twenty/packages/twenty-server-go/internal/auth"
)

const seedWorkspaceID = "20202020-1c25-4d02-bf25-6aeccf7ea419"

func passwordLogin(pool *pgxpool.Pool, appSecret, encryptionKey, fallbackEncryptionKey string, logger *slog.Logger) (*auth.PasswordLogin, *auth.UserSession, error) {
	if os.Getenv("CAPTCHA_DRIVER") != "" {
		return nil, nil, errors.New("CAPTCHA_DRIVER is set, but Go cannot verify captcha tokens for password login yet")
	}
	redisURL := os.Getenv("REDIS_URL")
	if redisURL == "" {
		return nil, nil, errors.New("REDIS_URL is required for password login")
	}
	redisOptions, err := redis.ParseURL(redisURL)
	if err != nil {
		return nil, nil, fmt.Errorf("parse REDIS_URL: %w", err)
	}

	serverURL := valueOrDefault(os.Getenv("SERVER_URL"), "http://localhost:3000")
	frontURL, err := url.Parse(valueOrDefault(os.Getenv("FRONTEND_URL"), serverURL))
	if err != nil || frontURL.Scheme == "" || frontURL.Host == "" {
		return nil, nil, errors.New("FRONTEND_URL, or SERVER_URL when it is unset, needs a scheme and host")
	}
	multiWorkspace := os.Getenv("IS_MULTIWORKSPACE_ENABLED") == "true"
	defaultSubdomain := valueOrDefault(os.Getenv("DEFAULT_SUBDOMAIN"), "app")

	fileTokenTTL, err := parseDuration(valueOrDefault(os.Getenv("FILE_TOKEN_EXPIRES_IN"), "1d"))
	if err != nil {
		return nil, nil, fmt.Errorf("FILE_TOKEN_EXPIRES_IN: %w", err)
	}
	sessionLifetime, err := optionalDuration("SESSION_ABSOLUTE_LIFETIME")
	if err != nil {
		return nil, nil, err
	}
	sessionIdleTimeout, err := optionalDuration("SESSION_IDLE_TIMEOUT")
	if err != nil {
		return nil, nil, err
	}

	var cookieOrigins []string
	for _, origin := range strings.Split(os.Getenv("AUTH_COOKIE_ALLOWED_ORIGINS"), ",") {
		if origin = strings.TrimSpace(origin); origin != "" {
			cookieOrigins = append(cookieOrigins, origin)
		}
	}

	cache := auth.NewRedisCache(redis.NewClient(redisOptions), os.Getenv("REDIS_CACHE_PREFIX"))
	issuer := auth.NewPGIssuer(pool, auth.IssuerConfig{
		AppSecret:             appSecret,
		EncryptionKey:         encryptionKey,
		FallbackEncryptionKey: fallbackEncryptionKey,
		Cache:                 cache,
	})
	origins := auth.NewOriginResolver(pool, auth.OriginConfig{
		MultiWorkspace:   multiWorkspace,
		FrontURL:         frontURL.String(),
		DefaultSubdomain: defaultSubdomain,
		SeedWorkspaceID:  seedWorkspaceID,
	})
	login := auth.NewPasswordLogin(pool, auth.NewPasswordHasher(), issuer, origins, auth.PasswordLoginConfig{
		FrontURL:                  frontURL,
		ServerURL:                 serverURL,
		MultiWorkspace:            multiWorkspace,
		EmailVerificationRequired: os.Getenv("IS_EMAIL_VERIFICATION_REQUIRED") == "true",
		FileTokenTTL:              fileTokenTTL,
	})
	sessions := auth.NewUserSession(pool, cache, issuer, auth.SessionConfig{
		ServerURL:            serverURL,
		FrontendURL:          frontURL.String(),
		CookieAllowedOrigins: cookieOrigins,
		Production:           os.Getenv("NODE_ENV") == "production",
		SameSite:             sameSite(os.Getenv("AUTH_COOKIE_SAME_SITE")),
		TrustProxy:           os.Getenv("TRUST_PROXY") != "false",
		AbsoluteLifetime:     sessionLifetime,
		IdleTimeout:          sessionIdleTimeout,
	}, logger)
	return login, sessions, nil
}

func sameSite(value string) http.SameSite {
	switch value {
	case "strict":
		return http.SameSiteStrictMode
	case "none":
		return http.SameSiteNoneMode
	default:
		return http.SameSiteLaxMode
	}
}

func valueOrDefault(value, fallback string) string {
	if value == "" {
		return fallback
	}
	return value
}

func optionalDuration(name string) (time.Duration, error) {
	value := os.Getenv(name)
	if value == "" {
		return 0, nil
	}
	duration, err := parseDuration(value)
	if err != nil {
		return 0, fmt.Errorf("%s: %w", name, err)
	}
	return duration, nil
}

func parseDuration(text string) (time.Duration, error) {
	days, hasDays := strings.CutSuffix(text, "d")
	if hasDays {
		text = days + "h"
	}
	duration, err := time.ParseDuration(text)
	if err != nil || duration <= 0 {
		return 0, fmt.Errorf("%q must be a positive duration like 1h or 2d", text)
	}
	if hasDays {
		duration *= 24
	}
	return duration, nil
}
