package store

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"slices"
	"strings"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgtype"
	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/twentyhq/twenty/packages/twenty-server-go/internal/model"
	"github.com/twentyhq/twenty/packages/twenty-server-go/internal/records"
	"github.com/twentyhq/twenty/packages/twenty-server-go/internal/workspace"
)

type recordSet[TRow, TRecord any] struct {
	pool    *pgxpool.Pool
	object  model.Object
	table   string
	columns string
	scan    func(pgx.Row) (TRow, error)
	convert func(TRow) (TRecord, error)
	idOf    func(TRecord) string
}

func newRecordSet[TRow, TRecord any](pool *pgxpool.Pool, nameSingular, columns string, scan func(pgx.Row) (TRow, error), convert func(TRow) (TRecord, error), idOf func(TRecord) string) recordSet[TRow, TRecord] {
	index := slices.IndexFunc(model.Objects, func(object model.Object) bool { return object.NameSingular == nameSingular })
	if index < 0 {
		panic("object model has no " + nameSingular + " object")
	}
	return recordSet[TRow, TRecord]{
		pool: pool, object: model.Objects[index], table: workspace.SchemaName() + `."` + model.Objects[index].Table + `"`,
		columns: columns, scan: scan, convert: convert, idOf: idOf,
	}
}

func (s recordSet[TRow, TRecord]) Get(ctx context.Context, id string) (TRecord, error) {
	var zero TRecord
	uuid, err := parseUUID(id)
	if err != nil {
		return zero, err
	}
	row, err := s.scan(s.pool.QueryRow(ctx, `SELECT `+s.columns+` FROM `+s.table+` WHERE "id" = $1`, uuid))
	if errors.Is(err, pgx.ErrNoRows) {
		return zero, records.ErrNotFound
	}
	if err != nil {
		return zero, fmt.Errorf("get %s: %w", s.object.NameSingular, err)
	}
	return s.convert(row)
}

func (s recordSet[TRow, TRecord]) affect(ctx context.Context, id string, run func(context.Context, pgtype.UUID) (int64, error)) error {
	uuid, err := parseUUID(id)
	if err != nil {
		return err
	}
	affected, err := run(ctx, uuid)
	if err != nil {
		return fmt.Errorf("write %s: %w", s.object.NameSingular, err)
	}
	if affected == 0 {
		return records.ErrNotFound
	}
	return nil
}

func (s recordSet[TRow, TRecord]) where(filter records.Filter) (*compiler, string, error) {
	where := &compiler{object: s.object}
	condition, err := where.filter(filter)
	if err != nil {
		return nil, "", err
	}
	if !where.mentionsDeletedAt {
		condition = joinAnd(condition, `"deletedAt" IS NULL`)
	}
	return where, condition, nil
}

func (s recordSet[TRow, TRecord]) Find(ctx context.Context, filter records.Filter, orderBy []records.OrderBy, page records.PageRequest) (records.Page[TRecord], error) {
	var none records.Page[TRecord]
	where, condition, err := s.where(filter)
	if err != nil {
		return none, err
	}
	columns, err := where.order(orderBy)
	if err != nil {
		return none, err
	}

	var total int
	if err := s.pool.QueryRow(ctx, `SELECT count(*) FROM `+s.table+` WHERE `+orElse(condition, "TRUE"), where.args...).Scan(&total); err != nil {
		return none, fmt.Errorf("count %s: %w", s.object.NameSingular, err)
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
		values, err := s.cursorValues(ctx, cursor, columns)
		if err != nil {
			return none, err
		}
		condition = joinAnd(condition, where.after(ordered, values))
	}

	orderSQL := make([]string, len(ordered))
	for i, column := range ordered {
		orderSQL[i] = column.sql()
	}
	rows, err := s.pool.Query(ctx, `SELECT `+s.columns+` FROM `+s.table+` WHERE `+orElse(condition, "TRUE")+` ORDER BY `+strings.Join(orderSQL, ", ")+` LIMIT `+fmt.Sprint(limit+1), where.args...)
	if err != nil {
		return none, fmt.Errorf("query %s: %w", s.object.NameSingular, err)
	}
	dbRows, err := pgx.CollectRows(rows, func(row pgx.CollectableRow) (TRow, error) { return s.scan(row) })
	if err != nil {
		return none, fmt.Errorf("read %s: %w", s.object.NameSingular, err)
	}

	more := len(dbRows) > limit
	if more {
		dbRows = dbRows[:limit]
	}
	if backward {
		slices.Reverse(dbRows)
	}
	result := records.Page[TRecord]{TotalCount: total, HasNext: more, HasPrevious: page.After != ""}
	if backward {
		result.HasNext, result.HasPrevious = page.Before != "", more
	}
	for _, row := range dbRows {
		record, err := s.convert(row)
		if err != nil {
			return none, err
		}
		result.Records = append(result.Records, record)
	}
	if n := len(result.Records); n > 0 {
		result.StartCursor, result.EndCursor = records.Cursor(s.idOf(result.Records[0])), records.Cursor(s.idOf(result.Records[n-1]))
	}
	return result, nil
}

func (s recordSet[TRow, TRecord]) cursorValues(ctx context.Context, cursor string, columns []orderColumn) ([]any, error) {
	id, err := records.CursorID(cursor)
	if err != nil {
		return nil, err
	}
	exprs := make([]string, len(columns))
	for i, column := range columns {
		exprs[i] = column.expr
	}
	var raw []byte
	err = s.pool.QueryRow(ctx, `SELECT jsonb_build_array(`+strings.Join(exprs, ", ")+`) FROM `+s.table+` WHERE "id" = $1`, id).Scan(&raw)
	if err != nil {
		return nil, fmt.Errorf("resolve cursor: %w", err)
	}
	var values []any
	if err := json.Unmarshal(raw, &values); err != nil {
		return nil, fmt.Errorf("decode cursor row: %w", err)
	}
	return values, nil
}

func (s recordSet[TRow, TRecord]) Aggregate(ctx context.Context, filter records.Filter, aggregates []records.Aggregate) (records.AggregateResult, error) {
	where, condition, err := s.where(filter)
	if err != nil {
		return nil, err
	}
	columns, err := where.aggregateColumns(aggregates)
	if err != nil {
		return nil, err
	}
	result := records.AggregateResult{}
	if len(columns) == 0 {
		return result, nil
	}
	exprs := make([]string, len(columns))
	values := make([]any, len(columns))
	dests := make([]any, len(columns))
	for i, column := range columns {
		exprs[i] = column.expr
		dests[i] = &values[i]
	}
	if err := s.pool.QueryRow(ctx, `SELECT `+strings.Join(exprs, ", ")+` FROM `+s.table+` WHERE `+orElse(condition, "TRUE"), where.args...).Scan(dests...); err != nil {
		return nil, fmt.Errorf("aggregate %s: %w", s.object.NameSingular, err)
	}
	for i, column := range columns {
		result[column.key] = values[i]
	}
	return result, nil
}

func (s recordSet[TRow, TRecord]) GroupBy(ctx context.Context, filter records.Filter, groupBy []records.GroupBy, orderBy []records.OrderBy, aggregates []records.Aggregate, perGroup records.PageRequest) ([]records.Group[TRecord], error) {
	if len(groupBy) == 0 {
		return nil, fmt.Errorf("%w: group by needs at least one field", records.ErrUnknownField)
	}
	where, condition, err := s.where(filter)
	if err != nil {
		return nil, err
	}
	groupExprs := make([]string, len(groupBy))
	for i, by := range groupBy {
		if groupExprs[i], _, err = where.resolve(by.Field, by.SubField); err != nil {
			return nil, err
		}
	}
	order := make([]orderColumn, 0, len(groupBy))
	for _, by := range orderBy {
		column, err := where.orderColumnFor(by)
		if err != nil {
			return nil, err
		}
		if !slices.Contains(groupExprs, column.expr) {
			return nil, fmt.Errorf("%w: %s.%s is not grouped", records.ErrUnknownField, by.Field, by.SubField)
		}
		order = append(order, column)
	}
	if len(order) == 0 {
		for _, expr := range groupExprs {
			order = append(order, orderColumn{expr: expr})
		}
	}
	orderSQL := make([]string, len(order))
	for i, column := range order {
		orderSQL[i] = column.sql()
	}
	aggregateColumns, err := where.aggregateColumns(aggregates)
	if err != nil {
		return nil, err
	}

	selects := make([]string, 0, len(groupExprs)+len(aggregateColumns))
	for _, expr := range groupExprs {
		selects = append(selects, expr+"::text")
	}
	for _, column := range aggregateColumns {
		selects = append(selects, column.expr)
	}
	rows, err := s.pool.Query(ctx, `SELECT `+strings.Join(selects, ", ")+` FROM `+s.table+` WHERE `+orElse(condition, "TRUE")+` GROUP BY `+strings.Join(groupExprs, ", ")+` ORDER BY `+strings.Join(orderSQL, ", "), where.args...)
	if err != nil {
		return nil, fmt.Errorf("group %s: %w", s.object.NameSingular, err)
	}
	defer rows.Close()

	var groups []records.Group[TRecord]
	for rows.Next() {
		keys := make([]*string, len(groupBy))
		values := make([]any, len(aggregateColumns))
		dests := make([]any, 0, len(selects))
		for i := range keys {
			dests = append(dests, &keys[i])
		}
		for i := range values {
			dests = append(dests, &values[i])
		}
		if err := rows.Scan(dests...); err != nil {
			return nil, fmt.Errorf("read %s group: %w", s.object.NameSingular, err)
		}
		group := records.Group[TRecord]{Key: make([]any, len(keys)), Aggregates: records.AggregateResult{}}
		for i, key := range keys {
			if key != nil {
				group.Key[i] = *key
			}
		}
		for i, column := range aggregateColumns {
			group.Aggregates[column.key] = values[i]
		}
		groups = append(groups, group)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("read %s groups: %w", s.object.NameSingular, err)
	}
	if perGroup == (records.PageRequest{}) {
		return groups, nil
	}
	for i := range groups {
		inGroup := records.Filter{And: []records.Filter{filter}}
		for j, by := range groupBy {
			field := records.FieldFilter{Field: by.Field, SubField: by.SubField, Operand: "eq", Value: groups[i].Key[j]}
			if groups[i].Key[j] == nil {
				field.Operand, field.Value = "is", "NULL"
			}
			inGroup.And = append(inGroup.And, records.Filter{Field: &field})
		}
		if groups[i].Records, err = s.Find(ctx, inGroup, nil, perGroup); err != nil {
			return nil, err
		}
	}
	return groups, nil
}
