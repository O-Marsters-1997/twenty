package main

import (
	"context"
	"errors"
	"flag"
	"fmt"
	"os"
	"os/signal"
	"path/filepath"

	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/twentyhq/twenty/packages/twenty-server-go/internal/modelgen"
	"github.com/twentyhq/twenty/packages/twenty-server-go/internal/pgtest"
	"github.com/twentyhq/twenty/packages/twenty-server-go/internal/workspace"
)

func main() {
	if err := run(); err != nil {
		fmt.Fprintln(os.Stderr, "modelgen:", err)
		os.Exit(1)
	}
}

func run() (err error) {
	root := flag.String("root", ".", "module root the generated files are written under")
	flag.Parse()

	ctx, stop := signal.NotifyContext(context.Background(), os.Interrupt)
	defer stop()

	dsn, drop, err := pgtest.Create(ctx)
	if err != nil {
		return err
	}
	defer func() { err = errors.Join(err, drop()) }()

	pool, err := pgxpool.New(ctx, dsn)
	if err != nil {
		return fmt.Errorf("connect: %w", err)
	}
	defer pool.Close()

	files, err := modelgen.Generate(ctx, pool, workspace.PinnedWorkspaceID, workspace.SchemaName())
	if err != nil {
		return err
	}

	stale, err := filepath.Glob(filepath.Join(*root, "internal/records/store/queries", "*.sql"))
	if err != nil {
		return fmt.Errorf("list stale queries: %w", err)
	}
	for _, path := range stale {
		if err := os.Remove(path); err != nil {
			return fmt.Errorf("remove stale query: %w", err)
		}
	}
	for path, content := range files {
		full := filepath.Join(*root, path)
		if err := os.MkdirAll(filepath.Dir(full), 0o755); err != nil {
			return fmt.Errorf("create directory: %w", err)
		}
		if err := os.WriteFile(full, content, 0o644); err != nil {
			return fmt.Errorf("write %s: %w", path, err)
		}
	}
	return nil
}
