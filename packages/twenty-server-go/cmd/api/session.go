package main

import (
	"errors"
	"fmt"
	"log/slog"
	"net/http"
	"os"
	"strings"

	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/redis/go-redis/v9"

	"github.com/twentyhq/twenty/packages/twenty-server-go/internal/auth"
	"github.com/twentyhq/twenty/packages/twenty-server-go/internal/auth/authgql"
	"github.com/twentyhq/twenty/packages/twenty-server-go/internal/config"
)

const seedWorkspaceID = "20202020-1c25-4d02-bf25-6aeccf7ea419"

func newAuthResolver(pool *pgxpool.Pool, cfg config.Config, twoFactor *auth.TwoFactor, logger *slog.Logger) (*authgql.Resolver, error) {
	redisURL := os.Getenv("REDIS_URL")
	if redisURL == "" {
		return nil, errors.New("REDIS_URL is required to serve sign-in and session renewal")
	}
	redisOptions, err := redis.ParseURL(redisURL)
	if err != nil {
		return nil, fmt.Errorf("parse REDIS_URL: %w", err)
	}
	cache := auth.NewRedisCache(redis.NewClient(redisOptions), os.Getenv("REDIS_CACHE_PREFIX"))

	issuer := auth.NewPGIssuer(pool, auth.IssuerConfig{
		AppSecret:             cfg.AppSecret,
		EncryptionKey:         cfg.EncryptionKey,
		FallbackEncryptionKey: cfg.FallbackEncryptionKey,
		Cache:                 cache,
	})
	serverURL := os.Getenv("SERVER_URL")
	frontendURL := os.Getenv("FRONTEND_URL")
	if frontendURL == "" {
		frontendURL = serverURL
	}
	sessions := auth.NewUserSession(pool, cache, issuer, auth.SessionConfig{
		ServerURL:            serverURL,
		FrontendURL:          frontendURL,
		CookieAllowedOrigins: strings.Split(os.Getenv("AUTH_COOKIE_ALLOWED_ORIGINS"), ","),
		Production:           os.Getenv("NODE_ENV") == "production",
		SameSite:             sameSite(os.Getenv("AUTH_COOKIE_SAME_SITE")),
		TrustProxy:           os.Getenv("TRUST_PROXY") != "false",
	}, logger)
	defaultSubdomain := os.Getenv("DEFAULT_SUBDOMAIN")
	if defaultSubdomain == "" {
		defaultSubdomain = "app"
	}
	return &authgql.Resolver{
		TwoFactor: twoFactor,
		Sessions:  sessions,
		SignIn: &auth.SignIn{
			Pool:      pool,
			Issuer:    issuer,
			TwoFactor: twoFactor,
			Origins: auth.NewOriginResolver(pool, auth.OriginConfig{
				MultiWorkspace:   os.Getenv("IS_MULTIWORKSPACE_ENABLED") == "true",
				FrontURL:         frontendURL,
				DefaultSubdomain: defaultSubdomain,
				SeedWorkspaceID:  seedWorkspaceID,
			}),
			EmailVerificationRequired: os.Getenv("IS_EMAIL_VERIFICATION_REQUIRED") == "true",
		},
	}, nil
}

func sameSite(value string) http.SameSite {
	switch value {
	case "strict":
		return http.SameSiteStrictMode
	case "none":
		return http.SameSiteNoneMode
	}
	return http.SameSiteLaxMode
}
