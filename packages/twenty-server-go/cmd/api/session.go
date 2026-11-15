package main

import (
	"errors"
	"fmt"
	"log/slog"
	"net/http"
	"os"

	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/redis/go-redis/v9"

	"github.com/twentyhq/twenty/packages/twenty-server-go/internal/auth"
	"github.com/twentyhq/twenty/packages/twenty-server-go/internal/auth/authgql"
	"github.com/twentyhq/twenty/packages/twenty-server-go/internal/config"
)

const seedWorkspaceID = "20202020-1c25-4d02-bf25-6aeccf7ea419"

func newAuthResolver(pool *pgxpool.Pool, cfg config.Config, twoFactor *auth.TwoFactor, logger *slog.Logger) (*authgql.Resolver, error) {
	if cfg.RedisURL == "" {
		return nil, errors.New("REDIS_URL is required")
	}
	redisOptions, err := redis.ParseURL(cfg.RedisURL)
	if err != nil {
		return nil, fmt.Errorf("parse REDIS_URL: %w", err)
	}
	sameSite, err := parseSameSite(cfg.CookieSameSite)
	if err != nil {
		return nil, err
	}
	cache := auth.NewRedisCache(redis.NewClient(redisOptions), cfg.RedisCachePrefix)

	issuer := auth.NewPGIssuer(pool, auth.IssuerConfig{
		AppSecret:             cfg.AppSecret,
		EncryptionKey:         cfg.EncryptionKey,
		FallbackEncryptionKey: cfg.FallbackEncryptionKey,
		Cache:                 cache,
	})
	frontendURL := cfg.FrontendURL
	if frontendURL == "" {
		frontendURL = cfg.ServerURL
	}
	sessions := auth.NewUserSession(pool, cache, issuer, auth.SessionConfig{
		ServerURL:            cfg.ServerURL,
		FrontendURL:          frontendURL,
		CookieAllowedOrigins: cfg.CookieAllowedOrigins,
		Production:           cfg.Production,
		SameSite:             sameSite,
		TrustProxy:           cfg.TrustProxy,
	}, logger)
	origins := auth.NewOriginResolver(pool, auth.OriginConfig{
		MultiWorkspace:   cfg.MultiWorkspace,
		FrontURL:         frontendURL,
		DefaultSubdomain: cfg.DefaultSubdomain,
		SeedWorkspaceID:  seedWorkspaceID,
	})
	return &authgql.Resolver{
		TwoFactor: twoFactor,
		Sessions:  sessions,
		Login:     auth.NewTwoFactorLogin(pool, twoFactor, issuer, origins, sessions),
		SignIn: &auth.SignIn{
			Pool:                      pool,
			Issuer:                    issuer,
			TwoFactor:                 twoFactor,
			Origins:                   origins,
			EmailVerificationRequired: os.Getenv("IS_EMAIL_VERIFICATION_REQUIRED") == "true",
		},
	}, nil
}

func parseSameSite(value string) (http.SameSite, error) {
	switch value {
	case "lax":
		return http.SameSiteLaxMode, nil
	case "strict":
		return http.SameSiteStrictMode, nil
	case "none":
		return http.SameSiteNoneMode, nil
	}
	return 0, fmt.Errorf("AUTH_COOKIE_SAME_SITE %q must be lax, strict or none", value)
}
