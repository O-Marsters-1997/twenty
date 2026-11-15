package main

import (
	"errors"
	"log/slog"
	"net/http"
	"net/url"
	"os"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/twentyhq/twenty/packages/twenty-server-go/internal/auth"
	"github.com/twentyhq/twenty/packages/twenty-server-go/internal/auth/googleauth"
)

func googleRoutes(pool *pgxpool.Pool, appSecret string, next http.Handler, logger *slog.Logger) (http.Handler, error) {
	if os.Getenv("AUTH_GOOGLE_ENABLED") != "true" {
		return next, nil
	}
	frontURL, err := url.Parse(os.Getenv("FRONTEND_URL"))
	if err != nil || frontURL.Scheme == "" || frontURL.Host == "" {
		return nil, errors.New("FRONTEND_URL needs a scheme and host when AUTH_GOOGLE_ENABLED is true")
	}
	config := googleauth.Config{
		ClientID:     os.Getenv("AUTH_GOOGLE_CLIENT_ID"),
		ClientSecret: os.Getenv("AUTH_GOOGLE_CLIENT_SECRET"),
		CallbackURL:  os.Getenv("AUTH_GOOGLE_CALLBACK_URL"),
		FrontURL:     frontURL,
	}
	if config.ClientID == "" || config.ClientSecret == "" || config.CallbackURL == "" {
		return nil, errors.New("AUTH_GOOGLE_CLIENT_ID, AUTH_GOOGLE_CLIENT_SECRET and AUTH_GOOGLE_CALLBACK_URL are required when AUTH_GOOGLE_ENABLED is true")
	}
	issuer := auth.NewPGIssuer(pool, auth.IssuerConfig{
		AppSecret:             appSecret,
		EncryptionKey:         os.Getenv("ENCRYPTION_KEY"),
		FallbackEncryptionKey: os.Getenv("FALLBACK_ENCRYPTION_KEY"),
	})

	mux := http.NewServeMux()
	googleauth.NewHandler(config, issuer, &http.Client{Timeout: 10 * time.Second}, logger).Register(mux)
	mux.Handle("/", next)
	return mux, nil
}
