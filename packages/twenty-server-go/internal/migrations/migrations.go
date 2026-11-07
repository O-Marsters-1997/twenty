package migrations

import (
	"context"
	"embed"
	"fmt"

	"github.com/jackc/pgx/v5"
)

//go:embed *.sql
var FS embed.FS

func Up(ctx context.Context, dsn string) (err error) {
	files, err := FS.ReadDir(".")
	if err != nil {
		return fmt.Errorf("list migrations: %w", err)
	}
	conn, err := pgx.Connect(ctx, dsn)
	if err != nil {
		return fmt.Errorf("connect: %w", err)
	}
	defer func() {
		if closeErr := conn.Close(ctx); closeErr != nil && err == nil {
			err = fmt.Errorf("close connection: %w", closeErr)
		}
	}()
	for _, file := range files {
		sql, err := FS.ReadFile(file.Name())
		if err != nil {
			return fmt.Errorf("read migration %s: %w", file.Name(), err)
		}
		if _, err := conn.Exec(ctx, string(sql)); err != nil {
			return fmt.Errorf("apply migration %s: %w", file.Name(), err)
		}
	}
	return nil
}
