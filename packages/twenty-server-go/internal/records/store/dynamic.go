package store

import (
	"context"
	"fmt"
	"maps"
	"slices"
	"strings"

	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/twentyhq/twenty/packages/twenty-server-go/internal/model"
	"github.com/twentyhq/twenty/packages/twenty-server-go/internal/records"
	"github.com/twentyhq/twenty/packages/twenty-server-go/internal/workspace"
)

type Dynamic struct {
	*table[map[string]any, map[string]any]
	pool *pgxpool.Pool
}

func NewDynamic(pool *pgxpool.Pool, object model.Object) *Dynamic {
	identity := func(row map[string]any) map[string]any { return row }
	id := func(row map[string]any) string { return fmt.Sprint(row["id"]) }
	return &Dynamic{table: newTable(pool, object.NameSingular, identity, id), pool: pool}
}

func (d *Dynamic) Create(ctx context.Context, actor records.Actor, values map[string]any) (map[string]any, error) {
	return d.create(ctx, actor, values)
}

func (d *Dynamic) Update(ctx context.Context, actor records.Actor, id string, values map[string]any) (map[string]any, error) {
	return d.update(ctx, actor, id, values)
}

func (d *Dynamic) Merge(ctx context.Context, actor records.Actor, ids []string, priorityIndex int, dryRun bool) (map[string]any, error) {
	if priorityIndex < 0 || priorityIndex >= len(ids) {
		return nil, records.ErrNotFound
	}
	found := make([]map[string]any, len(ids))
	for i, id := range ids {
		row, err := d.Get(ctx, id)
		if err != nil {
			return nil, err
		}
		found[i] = row
	}
	merged := maps.Clone(found[priorityIndex])
	patch := map[string]any{}
	for _, field := range d.object.Fields {
		for _, column := range field.Columns {
			if isSystemColumn(column.Name) || !isEmptyValue(merged[column.Name]) {
				continue
			}
			for _, row := range found {
				if !isEmptyValue(row[column.Name]) {
					merged[column.Name], patch[column.Name] = row[column.Name], row[column.Name]
					break
				}
			}
		}
	}
	if dryRun {
		return merged, nil
	}

	priorityID := ids[priorityIndex]
	others := slices.DeleteFunc(slices.Clone(ids), func(id string) bool { return id == priorityID })
	tx, err := d.pool.Begin(ctx)
	if err != nil {
		return nil, fmt.Errorf("begin merge %s: %w", d.object.NamePlural, err)
	}
	defer func() { _ = tx.Rollback(ctx) }()
	for _, other := range model.Objects {
		for _, field := range other.Fields {
			if field.Type != model.TypeRelation || len(field.Columns) != 1 || field.Name != d.object.NameSingular {
				continue
			}
			column := field.Columns[0].Name
			statement := `UPDATE ` + workspace.SchemaName() + `."` + other.Table + `" SET "` + column + `" = $1 WHERE "` + column + `" = ANY($2::uuid[])`
			if _, err := tx.Exec(ctx, statement, priorityID, others); err != nil {
				return nil, fmt.Errorf("repoint %s.%s: %w", other.NameSingular, column, err)
			}
		}
	}
	if _, err := tx.Exec(ctx, `UPDATE `+d.name+` SET "deletedAt" = now(), "updatedAt" = now() WHERE "id" = ANY($1::uuid[])`, others); err != nil {
		return nil, fmt.Errorf("delete merged %s: %w", d.object.NamePlural, err)
	}
	if err := tx.Commit(ctx); err != nil {
		return nil, fmt.Errorf("commit merge %s: %w", d.object.NamePlural, err)
	}
	if len(patch) == 0 {
		return d.Get(ctx, priorityID)
	}
	return d.update(ctx, actor, priorityID, patch)
}

func isSystemColumn(name string) bool {
	return slices.Contains([]string{"id", "position", "createdAt", "updatedAt", "deletedAt"}, name) || strings.HasPrefix(name, "createdBy") || strings.HasPrefix(name, "updatedBy")
}

func isEmptyValue(value any) bool {
	switch typed := value.(type) {
	case nil:
		return true
	case string:
		return typed == ""
	case []any:
		return len(typed) == 0
	}
	return false
}
