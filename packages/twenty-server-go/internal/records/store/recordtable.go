package store

import (
	"context"
	"encoding/json"
	"fmt"
	"slices"
	"strings"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/twentyhq/twenty/packages/twenty-server-go/internal/model"
	"github.com/twentyhq/twenty/packages/twenty-server-go/internal/records"
	"github.com/twentyhq/twenty/packages/twenty-server-go/internal/workspace"
)

type recordTable[TRecord any] struct {
	pool    *pgxpool.Pool
	object  model.Object
	table   string
	columns string
	label   string
	scan    func(pgx.Row) (TRecord, error)
	id      func(TRecord) string
}

func newRecordTable[TRecord any](pool *pgxpool.Pool, nameSingular, columns string, scan func(pgx.Row) (TRecord, error), id func(TRecord) string) *recordTable[TRecord] {
	index := slices.IndexFunc(model.Objects, func(object model.Object) bool { return object.NameSingular == nameSingular })
	if index < 0 {
		panic("object model has no " + nameSingular + " object")
	}
	object := model.Objects[index]
	return &recordTable[TRecord]{pool: pool, object: object, table: workspace.SchemaName() + `."` + object.Table + `"`, columns: columns, label: nameSingular, scan: scan, id: id}
}

func (t *recordTable[TRecord]) where(filter records.Filter) (*compiler, string, error) {
	where := &compiler{object: t.object}
	condition, err := where.filter(filter)
	if err != nil {
		return nil, "", err
	}
	if !where.mentionsDeletedAt {
		condition = joinAnd(condition, `"deletedAt" IS NULL`)
	}
	return where, condition, nil
}

func (t *recordTable[TRecord]) Find(ctx context.Context, filter records.Filter, orderBy []records.OrderBy, page records.PageRequest) (records.Page[TRecord], error) {
	where, condition, err := t.where(filter)
	if err != nil {
		return records.Page[TRecord]{}, err
	}
	columns, err := where.order(orderBy)
	if err != nil {
		return records.Page[TRecord]{}, err
	}

	var total int
	if err := t.pool.QueryRow(ctx, `SELECT count(*) FROM `+t.table+` WHERE `+orElse(condition, "TRUE"), where.args...).Scan(&total); err != nil {
		return records.Page[TRecord]{}, fmt.Errorf("count %s: %w", t.label, err)
	}

	backward := page.Last > 0 || page.Before != ""
	limit, cursor := page.First, page.After
	if backward {
		limit, cursor = page.Last, page.Before
	}
	if limit <= 0 {
		limit = defaultPageSize
	}
	ordered := columns
	if backward {
		ordered = make([]orderColumn, len(columns))
		for i, column := range columns {
			ordered[i] = column.reversed()
		}
	}
	if cursor != "" {
		values, err := t.cursorValues(ctx, cursor, columns)
		if err != nil {
			return records.Page[TRecord]{}, err
		}
		condition = joinAnd(condition, where.after(ordered, values))
	}

	orderSQL := make([]string, len(ordered))
	for i, column := range ordered {
		orderSQL[i] = column.sql()
	}
	rows, err := t.pool.Query(ctx, `SELECT `+t.columns+` FROM `+t.table+` WHERE `+orElse(condition, "TRUE")+` ORDER BY `+strings.Join(orderSQL, ", ")+` LIMIT `+fmt.Sprint(limit+1), where.args...)
	if err != nil {
		return records.Page[TRecord]{}, fmt.Errorf("query %s: %w", t.label, err)
	}
	found, err := pgx.CollectRows(rows, func(row pgx.CollectableRow) (TRecord, error) { return t.scan(row) })
	if err != nil {
		return records.Page[TRecord]{}, fmt.Errorf("read %s: %w", t.label, err)
	}

	more := len(found) > limit
	if more {
		found = found[:limit]
	}
	if backward {
		slices.Reverse(found)
	}
	result := records.Page[TRecord]{Records: found, TotalCount: total, HasNext: more, HasPrevious: page.After != ""}
	if backward {
		result.HasNext, result.HasPrevious = page.Before != "", more
	}
	if n := len(found); n > 0 {
		result.StartCursor, result.EndCursor = records.Cursor(t.id(found[0])), records.Cursor(t.id(found[n-1]))
	}
	return result, nil
}

func (t *recordTable[TRecord]) cursorValues(ctx context.Context, cursor string, columns []orderColumn) ([]any, error) {
	id, err := records.CursorID(cursor)
	if err != nil {
		return nil, err
	}
	exprs := make([]string, len(columns))
	for i, column := range columns {
		exprs[i] = column.expr
	}
	var raw []byte
	err = t.pool.QueryRow(ctx, `SELECT jsonb_build_array(`+strings.Join(exprs, ", ")+`) FROM `+t.table+` WHERE "id" = $1`, id).Scan(&raw)
	if err != nil {
		return nil, fmt.Errorf("resolve cursor: %w", err)
	}
	var values []any
	if err := json.Unmarshal(raw, &values); err != nil {
		return nil, fmt.Errorf("decode cursor row: %w", err)
	}
	return values, nil
}
