package main

import (
	"context"
	"errors"
	"fmt"
	"log/slog"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/twentyhq/twenty/packages/twenty-server-go/internal/auth"
	"github.com/twentyhq/twenty/packages/twenty-server-go/internal/config"
	"github.com/twentyhq/twenty/packages/twenty-server-go/internal/frontdoor"
	"github.com/twentyhq/twenty/packages/twenty-server-go/internal/metadata/metadatagql"
	metadatastore "github.com/twentyhq/twenty/packages/twenty-server-go/internal/metadata/store"
	"github.com/twentyhq/twenty/packages/twenty-server-go/internal/records/recordsgql"
	"github.com/twentyhq/twenty/packages/twenty-server-go/internal/records/store"
)

func main() {
	if err := run(); err != nil {
		fmt.Fprintln(os.Stderr, "api:", err)
		os.Exit(1)
	}
}

func run() error {
	cfg, err := config.Load(os.Getenv)
	if err != nil {
		return fmt.Errorf("load config: %w", err)
	}
	logger := slog.New(slog.NewJSONHandler(os.Stderr, &slog.HandlerOptions{Level: cfg.LogLevel}))

	pool, err := pgxpool.New(context.Background(), cfg.DatabaseURL)
	if err != nil {
		return fmt.Errorf("open database pool: %w", err)
	}
	defer pool.Close()
	verifier := auth.NewJWTVerifier(pool, cfg.AppSecret)

	goGraphQL := http.NewServeMux()
	goGraphQL.Handle(string(frontdoor.EndpointWorkspace), recordsgql.NewHandler(store.NewPeople(pool), logger))
	goGraphQL.Handle(string(frontdoor.EndpointMetadata), metadatagql.NewHandler(metadatastore.New(pool), logger))

	server := &http.Server{
		Addr:              cfg.ListenAddr,
		Handler:           frontdoor.NewHandler(frontdoor.DefaultTable(), cfg.NodeUpstreamURL, verifier, goGraphQL, logger),
		ReadHeaderTimeout: 10 * time.Second,
	}

	ctx, stop := signal.NotifyContext(context.Background(), os.Interrupt, syscall.SIGTERM)
	defer stop()

	serveErr := make(chan error, 1)
	go func() { serveErr <- server.ListenAndServe() }()
	logger.Info("front door listening", "addr", cfg.ListenAddr, "upstream", cfg.NodeUpstreamURL.String())

	select {
	case err := <-serveErr:
		return fmt.Errorf("serve: %w", err)
	case <-ctx.Done():
	}

	shutdownCtx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()
	if err := server.Shutdown(shutdownCtx); err != nil && !errors.Is(err, http.ErrServerClosed) {
		return fmt.Errorf("shutdown: %w", err)
	}
	return nil
}
