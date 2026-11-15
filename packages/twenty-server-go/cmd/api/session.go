package main

import (
	"errors"
	"fmt"
	"log/slog"
	"net/http"
	"net/url"
	"os"

	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/redis/go-redis/v9"

	"github.com/twentyhq/twenty/packages/twenty-server-go/internal/auth"
	"github.com/twentyhq/twenty/packages/twenty-server-go/internal/auth/authgql"
	"github.com/twentyhq/twenty/packages/twenty-server-go/internal/config"
)

const seedWorkspaceID = "20202020-1c25-4d02-bf25-6aeccf7ea419"

type authStack struct {
	issuer    *auth.PGIssuer
	origins   *auth.OriginResolver
	sessions  *auth.UserSession
	frontURL  *url.URL
	serverURL string
}

func newAuthStack(pool *pgxpool.Pool, cfg config.Config, logger *slog.Logger) (authStack, error) {
	if cfg.RedisURL == "" {
		return authStack{}, errors.New("REDIS_URL is required")
	}
	redisOptions, err := redis.ParseURL(cfg.RedisURL)
	if err != nil {
		return authStack{}, fmt.Errorf("parse REDIS_URL: %w", err)
	}
	sameSite, err := parseSameSite(cfg.CookieSameSite)
	if err != nil {
		return authStack{}, err
	}
	frontURL, err := url.Parse(valueOrDefault(cfg.FrontendURL, cfg.ServerURL))
	if err != nil || frontURL.Scheme == "" || frontURL.Host == "" {
		return authStack{}, errors.New("FRONTEND_URL, or SERVER_URL when it is unset, needs a scheme and host")
	}
	sessionLifetime, err := optionalDuration("SESSION_ABSOLUTE_LIFETIME")
	if err != nil {
		return authStack{}, err
	}
	sessionIdleTimeout, err := optionalDuration("SESSION_IDLE_TIMEOUT")
	if err != nil {
		return authStack{}, err
	}
	cache := auth.NewRedisCache(redis.NewClient(redisOptions), cfg.RedisCachePrefix)

	issuer := auth.NewPGIssuer(pool, auth.IssuerConfig{
		AppSecret:             cfg.AppSecret,
		EncryptionKey:         cfg.EncryptionKey,
		FallbackEncryptionKey: cfg.FallbackEncryptionKey,
		Cache:                 cache,
	})
	sessions := auth.NewUserSession(pool, cache, issuer, auth.SessionConfig{
		ServerURL:            cfg.ServerURL,
		FrontendURL:          frontURL.String(),
		CookieAllowedOrigins: cfg.CookieAllowedOrigins,
		Production:           cfg.Production,
		SameSite:             sameSite,
		TrustProxy:           cfg.TrustProxy,
		AbsoluteLifetime:     sessionLifetime,
		IdleTimeout:          sessionIdleTimeout,
	}, logger)
	origins := auth.NewOriginResolver(pool, auth.OriginConfig{
		MultiWorkspace:   cfg.MultiWorkspace,
		FrontURL:         frontURL.String(),
		DefaultSubdomain: cfg.DefaultSubdomain,
		SeedWorkspaceID:  seedWorkspaceID,
	})
	return authStack{issuer: issuer, origins: origins, sessions: sessions, frontURL: frontURL, serverURL: cfg.ServerURL}, nil
}

func newAuthResolver(pool *pgxpool.Pool, twoFactor *auth.TwoFactor, passwordLogin *auth.PasswordLogin, stack authStack) *authgql.Resolver {
	return &authgql.Resolver{
		TwoFactor:     twoFactor,
		PasswordLogin: passwordLogin,
		Sessions:      stack.sessions,
		Login:         auth.NewTwoFactorLogin(pool, twoFactor, stack.issuer, stack.origins, stack.sessions),
		Current:       auth.NewCurrentUser(pool, passwordLogin, currentUserConfig(stack.serverURL)),
		Exchange: &auth.SignIn{
			Pool:                      pool,
			Issuer:                    stack.issuer,
			TwoFactor:                 twoFactor,
			Origins:                   stack.origins,
			EmailVerificationRequired: os.Getenv("IS_EMAIL_VERIFICATION_REQUIRED") == "true",
		},
	}
}

func currentUserConfig(serverURL string) auth.CurrentUserConfig {
	config := auth.CurrentUserConfig{
		ServerURL:           serverURL,
		PasswordAuthEnabled: os.Getenv("AUTH_PASSWORD_ENABLED") != "false",
		GoogleAuthEnabled:   os.Getenv("AUTH_GOOGLE_ENABLED") == "true",
	}
	if os.Getenv("SUPPORT_DRIVER") == "front" {
		config.SupportHMACKey = os.Getenv("SUPPORT_FRONT_HMAC_KEY")
	}
	return config
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
