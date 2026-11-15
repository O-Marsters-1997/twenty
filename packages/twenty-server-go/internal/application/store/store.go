package store

import (
	"context"
	"encoding/json"
	"fmt"

	"github.com/jackc/pgx/v5"

	"github.com/twentyhq/twenty/packages/twenty-server-go/internal/metadata"
)

type queryer interface {
	Query(ctx context.Context, sql string, args ...any) (pgx.Rows, error)
}

func iso(column string) string {
	return `to_char(` + column + ` AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')`
}

func queryAll[T any](ctx context.Context, conn queryer, statement string, args ...any) ([]T, error) {
	rows, err := conn.Query(ctx, statement, args...)
	if err != nil {
		return nil, fmt.Errorf("query: %w", err)
	}
	documents, err := pgx.CollectRows(rows, pgx.RowTo[[]byte])
	if err != nil {
		return nil, fmt.Errorf("read rows: %w", err)
	}
	decoded := make([]T, len(documents))
	for i, document := range documents {
		if err := json.Unmarshal(document, &decoded[i]); err != nil {
			return nil, fmt.Errorf("decode row: %w", err)
		}
	}
	return decoded, nil
}

func queryOne[T any](ctx context.Context, conn queryer, notFound string, statement string, args ...any) (T, error) {
	var zero T
	found, err := queryAll[T](ctx, conn, statement, args...)
	switch {
	case err != nil:
		return zero, err
	case len(found) == 0:
		return zero, fmt.Errorf("%w: %s", metadata.ErrNotFound, notFound)
	}
	return found[0], nil
}
