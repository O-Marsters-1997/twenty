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

	"github.com/twentyhq/twenty/packages/twenty-server-go/internal/ai"
	"github.com/twentyhq/twenty/packages/twenty-server-go/internal/ai/agentgql"
	"github.com/twentyhq/twenty/packages/twenty-server-go/internal/ai/aigql"
	aistore "github.com/twentyhq/twenty/packages/twenty-server-go/internal/ai/store"
	"github.com/twentyhq/twenty/packages/twenty-server-go/internal/auth"
	"github.com/twentyhq/twenty/packages/twenty-server-go/internal/config"
	"github.com/twentyhq/twenty/packages/twenty-server-go/internal/frontdoor"
	"github.com/twentyhq/twenty/packages/twenty-server-go/internal/metadata/metadatagql"
	"github.com/twentyhq/twenty/packages/twenty-server-go/internal/metadata/metagql"
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

	chats := aistore.New(pool)
	broker := ai.NewPersistingBroker(ai.NewMemoryBroker(), chats, logger)

	goGraphQL := http.NewServeMux()
	goGraphQL.Handle(string(frontdoor.EndpointWorkspace), recordsgql.NewHandler(&recordsgql.Resolver{
		Store:              store.NewPeople(pool),
		Companies:          store.NewCompanies(pool),
		Opportunities:      store.NewOpportunities(pool),
		WorkspaceMembers:   store.NewWorkspaceMembers(pool),
		Dashboards:         store.NewDashboards(pool),
		TimelineActivities: store.NewTimelineActivities(pool),
		Attachments:        store.NewAttachments(pool),
		Notes:              store.NewNotes(pool),
		NoteTargets:        store.NewNoteTargets(pool),
		Tasks:              store.NewTasks(pool),
		TaskTargets:        store.NewTaskTargets(pool),
	}, logger))
	recordTools := ai.NewRecordTools(
		store.NewCompanies(pool), store.NewPeople(pool), store.NewOpportunities(pool), store.NewNotes(pool), store.NewTasks(pool),
	)
	toolRegistry := ai.NewRegistry(recordTools...)
	goGraphQL.Handle(string(frontdoor.EndpointMetadata), metadataHandler(
		metadatagql.NewHandler(metadatastore.New(pool), toolRegistry, logger),
		aigql.NewHandler(chats, broker, logger),
		metagql.NewHandler(metadatastore.NewViews(pool), logger),
		agentgql.NewHandler(aistore.NewAgents(pool), logger),
		agentgql.Operations,
	))

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
