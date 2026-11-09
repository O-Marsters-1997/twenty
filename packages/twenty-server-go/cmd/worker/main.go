package main

import (
	"context"
	"errors"
	"fmt"
	"log/slog"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/riverqueue/river"

	"github.com/twentyhq/twenty/packages/twenty-server-go/internal/workflow"
	"github.com/twentyhq/twenty/packages/twenty-server-go/internal/workflow/store"
)

func main() {
	if err := run(); err != nil {
		fmt.Fprintln(os.Stderr, "worker:", err)
		os.Exit(1)
	}
}

func run() error {
	dsn := os.Getenv("PG_DATABASE_URL")
	if dsn == "" {
		return errors.New("PG_DATABASE_URL is required")
	}
	var level slog.Level
	if value := os.Getenv("LOG_LEVEL"); value != "" {
		if err := level.UnmarshalText([]byte(value)); err != nil {
			return fmt.Errorf("parse LOG_LEVEL: %w", err)
		}
	}
	logger := slog.New(slog.NewJSONHandler(os.Stderr, &slog.HandlerOptions{Level: level}))

	ctx, stop := signal.NotifyContext(context.Background(), os.Interrupt, syscall.SIGTERM)
	defer stop()

	pool, err := pgxpool.New(ctx, dsn)
	if err != nil {
		return fmt.Errorf("open database pool: %w", err)
	}
	defer pool.Close()

	registry, err := workflow.NewRegistry()
	if err != nil {
		return fmt.Errorf("build action registry: %w", err)
	}
	workers := river.NewWorkers()
	registerWorkflowWorkers(workers, &executor{store: store.New(pool), registry: registry})

	client, err := newClient(pool, workers, logger)
	if err != nil {
		return err
	}
	if err := client.Start(ctx); err != nil {
		return fmt.Errorf("start river client: %w", err)
	}
	logger.Info("worker started")

	<-ctx.Done()

	shutdownCtx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()
	if err := client.Stop(shutdownCtx); err != nil {
		return fmt.Errorf("stop river client: %w", err)
	}
	return nil
}
