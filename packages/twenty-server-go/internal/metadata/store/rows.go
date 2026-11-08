package store

import (
	"context"
	"encoding/json"
	"fmt"
	"slices"
	"strings"

	"github.com/jackc/pgx/v5"

	"github.com/twentyhq/twenty/packages/twenty-server-go/internal/metadata"
	"github.com/twentyhq/twenty/packages/twenty-server-go/internal/workspace"
)

type Rows[TRow any] struct {
	db       querier
	table    string
	writable []string
}

func (r Rows[TRow]) Insert(ctx context.Context, values map[string]any) (TRow, error) {
	columns, args, err := r.assignments(values)
	if err != nil {
		var zero TRow
		return zero, err
	}
	names := make([]string, 0, len(columns)+3)
	placeholders := make([]string, 0, len(columns)+3)
	for i, column := range columns {
		names = append(names, pgx.Identifier{column}.Sanitize())
		placeholders = append(placeholders, fmt.Sprintf("$%d", i+1))
	}
	workspaceParam := fmt.Sprintf("$%d::uuid", len(args)+1)
	names = append(names, `"universalIdentifier"`, `"workspaceId"`, `"applicationId"`)
	placeholders = append(placeholders, "gen_random_uuid()", workspaceParam, `(SELECT "workspaceCustomApplicationId" FROM core.workspace WHERE id = `+workspaceParam+`)`)
	statement := fmt.Sprintf(`INSERT INTO %s AS t (%s) VALUES (%s) RETURNING to_jsonb(t)`, r.table, strings.Join(names, ", "), strings.Join(placeholders, ", "))
	return one[TRow](ctx, r.db, statement, append(args, workspace.PinnedWorkspaceID)...)
}

func (r Rows[TRow]) Update(ctx context.Context, id string, patch map[string]any) (TRow, error) {
	columns, args, err := r.assignments(patch)
	if err != nil {
		var zero TRow
		return zero, err
	}
	sets := []string{`"updatedAt" = now()`}
	for i, column := range columns {
		sets = append(sets, fmt.Sprintf("%s = $%d", pgx.Identifier{column}.Sanitize(), i+2))
	}
	statement := fmt.Sprintf(`UPDATE %s AS t SET %s WHERE t.id = $1::uuid AND t."deletedAt" IS NULL RETURNING to_jsonb(t)`, r.table, strings.Join(sets, ", "))
	return one[TRow](ctx, r.db, statement, append([]any{id}, args...)...)
}

func (r Rows[TRow]) Destroy(ctx context.Context, id string) (TRow, error) {
	return one[TRow](ctx, r.db, fmt.Sprintf(`DELETE FROM %s AS t WHERE t.id = $1::uuid RETURNING to_jsonb(t)`, r.table), id)
}

func (r Rows[TRow]) assignments(values map[string]any) ([]string, []any, error) {
	columns := make([]string, 0, len(values))
	for column := range values {
		if !slices.Contains(r.writable, column) {
			return nil, nil, fmt.Errorf("%w: unknown column %q", metadata.ErrInvalidInput, column)
		}
		columns = append(columns, column)
	}
	slices.Sort(columns)
	args := make([]any, len(columns))
	for i, column := range columns {
		args[i] = values[column]
		if column == "value" {
			encoded, err := json.Marshal(values[column])
			if err != nil {
				return nil, nil, fmt.Errorf("%w: encode value: %w", metadata.ErrInvalidInput, err)
			}
			args[i] = string(encoded)
		}
	}
	return columns, args, nil
}

type querier interface {
	Query(ctx context.Context, sql string, args ...any) (pgx.Rows, error)
}

func many[TRow any](ctx context.Context, db querier, statement string, args ...any) ([]TRow, error) {
	rows, err := db.Query(ctx, statement, args...)
	if err != nil {
		return nil, fmt.Errorf("query view rows: %w", err)
	}
	documents, err := pgx.CollectRows(rows, pgx.RowTo[[]byte])
	if err != nil {
		return nil, fmt.Errorf("read view rows: %w", err)
	}
	decoded := make([]TRow, len(documents))
	for i, document := range documents {
		if err := json.Unmarshal(document, &decoded[i]); err != nil {
			return nil, fmt.Errorf("decode view row: %w", err)
		}
	}
	return decoded, nil
}

func one[TRow any](ctx context.Context, db querier, statement string, args ...any) (TRow, error) {
	var zero TRow
	found, err := many[TRow](ctx, db, statement, args...)
	switch {
	case err != nil:
		return zero, err
	case len(found) == 0:
		return zero, metadata.ErrNotFound
	}
	return found[0], nil
}
