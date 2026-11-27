package store

import (
	"context"
	"errors"
	"fmt"
	"slices"

	"github.com/jackc/pgx/v5"

	"github.com/twentyhq/twenty/packages/twenty-server-go/internal/model"
	"github.com/twentyhq/twenty/packages/twenty-server-go/internal/workspace"
)

const mostlyEmptyNullFraction = 0.9

type ObjectRecordCount struct {
	ObjectNamePlural string
	TotalCount       int
}

type MinimalObject struct {
	ID, NameSingular, NamePlural, LabelSingular, LabelPlural string
	Color, Icon                                              *string
	IsActive, IsSystem, IsRemote                             bool
}

type MinimalView struct {
	ID, Type, ObjectMetadataID string
	Key                        *string
}

type MinimalMetadata struct {
	ObjectMetadataItems []MinimalObject
	Views               []MinimalView
}

func (s *Store) ObjectRecordCounts(ctx context.Context) ([]ObjectRecordCount, error) {
	counts := make([]ObjectRecordCount, len(model.Objects))
	batch := &pgx.Batch{}
	for i, object := range model.Objects {
		counts[i].ObjectNamePlural = object.NamePlural
		batch.Queue(`SELECT count(*) FROM ` + workspace.SchemaName() + `.` + pgx.Identifier{object.Table}.Sanitize() + ` WHERE "deletedAt" IS NULL`)
	}
	results := s.pool.SendBatch(ctx, batch)
	for i := range counts {
		if err := results.QueryRow().Scan(&counts[i].TotalCount); err != nil {
			return nil, errors.Join(fmt.Errorf("count %s: %w", counts[i].ObjectNamePlural, err), results.Close())
		}
	}
	if err := results.Close(); err != nil {
		return nil, fmt.Errorf("count records: %w", err)
	}
	return counts, nil
}

func (s *Store) MostlyEmptyFieldMetadataIDs(ctx context.Context, objectMetadataID string) ([]string, error) {
	var nameSingular string
	err := s.pool.QueryRow(ctx, `SELECT "nameSingular" FROM core."objectMetadata" WHERE id = $1::uuid AND "workspaceId" = $2::uuid`,
		objectMetadataID, workspace.PinnedWorkspaceID).Scan(&nameSingular)
	if errors.Is(err, pgx.ErrNoRows) {
		return []string{}, nil
	}
	if err != nil {
		return nil, fmt.Errorf("find object: %w", err)
	}
	index := slices.IndexFunc(model.Objects, func(object model.Object) bool { return object.NameSingular == nameSingular })
	if index < 0 {
		return []string{}, nil
	}
	object := model.Objects[index]

	nullFraction, err := s.nullFractions(ctx, object.Table)
	if err != nil {
		return nil, err
	}
	fieldIDs, err := s.fieldIDs(ctx, objectMetadataID)
	if err != nil {
		return nil, err
	}
	ids := []string{}
	for _, field := range object.Fields {
		id, ok := fieldIDs[field.Name]
		if !ok || len(field.Columns) == 0 {
			continue
		}
		mostlyEmpty := !slices.ContainsFunc(field.Columns, func(column model.Column) bool {
			fraction, known := nullFraction[column.Name]
			return !known || fraction < mostlyEmptyNullFraction
		})
		if mostlyEmpty {
			ids = append(ids, id)
		}
	}
	slices.Sort(ids)
	return ids, nil
}

func (s *Store) nullFractions(ctx context.Context, table string) (map[string]float32, error) {
	rows, err := s.pool.Query(ctx, `SELECT attname::text, null_frac FROM pg_stats WHERE schemaname = $1 AND tablename = $2`, workspace.SchemaName(), table)
	if err != nil {
		return nil, fmt.Errorf("query planner statistics: %w", err)
	}
	fractions := map[string]float32{}
	for rows.Next() {
		var column string
		var fraction float32
		if err := rows.Scan(&column, &fraction); err != nil {
			rows.Close()
			return nil, fmt.Errorf("scan planner statistics: %w", err)
		}
		fractions[column] = fraction
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("read planner statistics: %w", err)
	}
	return fractions, nil
}

func (s *Store) fieldIDs(ctx context.Context, objectMetadataID string) (map[string]string, error) {
	rows, err := s.pool.Query(ctx, `SELECT name, id::text FROM core."fieldMetadata" WHERE "objectMetadataId" = $1::uuid`, objectMetadataID)
	if err != nil {
		return nil, fmt.Errorf("query fields: %w", err)
	}
	ids := map[string]string{}
	for rows.Next() {
		var name, id string
		if err := rows.Scan(&name, &id); err != nil {
			rows.Close()
			return nil, fmt.Errorf("scan field: %w", err)
		}
		ids[name] = id
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("read fields: %w", err)
	}
	return ids, nil
}

func (s *Store) Minimal(ctx context.Context) (MinimalMetadata, error) {
	objects, err := queryAll(ctx, s, `SELECT id::text, "nameSingular", "namePlural", "labelSingular", "labelPlural", color, icon, "isActive", "isSystem", "isRemote"
		FROM core."objectMetadata" WHERE "workspaceId" = $1::uuid ORDER BY id DESC`, func(row pgx.CollectableRow) (MinimalObject, error) {
		var o MinimalObject
		err := row.Scan(&o.ID, &o.NameSingular, &o.NamePlural, &o.LabelSingular, &o.LabelPlural, &o.Color, &o.Icon, &o.IsActive, &o.IsSystem, &o.IsRemote)
		return o, err
	})
	if err != nil {
		return MinimalMetadata{}, fmt.Errorf("query minimal objects: %w", err)
	}
	views, err := queryAll(ctx, s, `SELECT id::text, type::text, key::text, "objectMetadataId"::text
		FROM core.view WHERE "workspaceId" = $1::uuid AND "deletedAt" IS NULL ORDER BY "position", id`, func(row pgx.CollectableRow) (MinimalView, error) {
		var v MinimalView
		err := row.Scan(&v.ID, &v.Type, &v.Key, &v.ObjectMetadataID)
		return v, err
	})
	if err != nil {
		return MinimalMetadata{}, fmt.Errorf("query minimal views: %w", err)
	}
	return MinimalMetadata{ObjectMetadataItems: objects, Views: views}, nil
}

func queryAll[TRow any](ctx context.Context, s *Store, query string, scan pgx.RowToFunc[TRow]) ([]TRow, error) {
	rows, err := s.pool.Query(ctx, query, workspace.PinnedWorkspaceID)
	if err != nil {
		return nil, err
	}
	return pgx.CollectRows(rows, scan)
}
