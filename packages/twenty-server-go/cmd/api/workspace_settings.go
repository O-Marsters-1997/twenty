package main

import (
	"context"
	"log/slog"
	"net/http"
	"os"

	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/twentyhq/twenty/packages/twenty-server-go/internal/auth"
	"github.com/twentyhq/twenty/packages/twenty-server-go/internal/config"
	"github.com/twentyhq/twenty/packages/twenty-server-go/internal/workspace"
	"github.com/twentyhq/twenty/packages/twenty-server-go/internal/workspace/workspacegql"
)

func workspaceSettingsHandler(pool *pgxpool.Pool, cfg config.Config, passwordLogin *auth.PasswordLogin, logger *slog.Logger) http.Handler {
	system := workspace.SettingsConfig{
		GoogleAuthEnabled:   os.Getenv("AUTH_GOOGLE_ENABLED") == "true",
		PasswordAuthEnabled: os.Getenv("AUTH_PASSWORD_ENABLED") != "false",
	}
	public := newPublicData(pool, cfg, passwordLogin)
	checkSubdomain := func(ctx context.Context, subdomain string) (bool, bool, error) {
		availability, err := public.SubdomainAvailability(ctx, subdomain)
		return availability.IsValid, availability.Available, err
	}
	return workspacegql.NewHandler(&workspacegql.Resolver{
		Settings: workspace.NewSettings(pool, system, checkSubdomain),
		System:   system,
		LogoURL:  passwordLogin.LogoURL,
	}, logger)
}
