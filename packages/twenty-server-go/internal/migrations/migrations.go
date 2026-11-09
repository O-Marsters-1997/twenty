package migrations

import (
	"context"
	"database/sql"
	"embed"
	"fmt"
	"io"
	"io/fs"

	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/pressly/goose/v3"
	"github.com/riverqueue/river/riverdriver/riverpgxv5"
	"github.com/riverqueue/river/rivermigrate"

	_ "github.com/jackc/pgx/v5/stdlib"
)

//go:embed sql/*.sql
var embedded embed.FS

var FS fs.FS = embedded

func Up(ctx context.Context, dsn string) error {
	return Run(ctx, dsn, "up", io.Discard)
}

func migrateRiver(ctx context.Context, dsn string) error {
	pool, err := pgxpool.New(ctx, dsn)
	if err != nil {
		return fmt.Errorf("open river pool: %w", err)
	}
	defer pool.Close()
	migrator, err := rivermigrate.New(riverpgxv5.New(pool), nil)
	if err != nil {
		return fmt.Errorf("create river migrator: %w", err)
	}
	if _, err := migrator.Migrate(ctx, rivermigrate.DirectionUp, nil); err != nil {
		return fmt.Errorf("migrate river: %w", err)
	}
	return nil
}

func Run(ctx context.Context, dsn, command string, out io.Writer) error {
	db, err := sql.Open("pgx", dsn)
	if err != nil {
		return fmt.Errorf("open database: %w", err)
	}
	defer db.Close()

	files, err := fs.Sub(FS, "sql")
	if err != nil {
		return fmt.Errorf("open migration files: %w", err)
	}
	provider, err := goose.NewProvider(goose.DialectPostgres, db, files)
	if err != nil {
		return fmt.Errorf("create provider: %w", err)
	}

	switch command {
	case "up":
		if _, err = provider.Up(ctx); err != nil {
			return fmt.Errorf("migrate %s: %w", command, err)
		}
		err = migrateRiver(ctx, dsn)
	case "down":
		_, err = provider.Down(ctx)
	case "status":
		var statuses []*goose.MigrationStatus
		statuses, err = provider.Status(ctx)
		if err == nil {
			for _, status := range statuses {
				fmt.Fprintf(out, "%s %s\n", status.State, status.Source.Path)
			}
		}
	default:
		return fmt.Errorf("unknown command %q, want up, down or status", command)
	}
	if err != nil {
		return fmt.Errorf("migrate %s: %w", command, err)
	}
	return nil
}
