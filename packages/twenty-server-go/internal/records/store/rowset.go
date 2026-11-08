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
)

// rowset is the read side every object shares: filtered, ordered and paged Find, Aggregate and GroupBy.
type rowset[TRecord any] struct {
	pool    *pgxpool.Pool
	object  model.Object
	table   string
	columns string
	label   string
	scan    func(pgx.Row) (TRecord, error)
	id      func(TRecord) string
}

func (p *rowset[TRecord]) Find(ctx context.Context, filter records.Filter, orderBy []records.OrderBy, page records.PageRequest) (records.Page[TRecord], error) {
	where := &compiler{object: p.object}
	condition, err := where.filter(filter)
	if err != nil {
		return records.Page[TRecord]{}, err
	}
	if !where.mentionsDeletedAt {
		condition = joinAnd(condition, `"deletedAt" IS NULL`)
	}
	columns, err := where.order(orderBy)
	if err != nil {
		return records.Page[TRecord]{}, err
	}

	var total int
	if err := p.pool.QueryRow(ctx, `SELECT count(*) FROM `+p.table+` WHERE `+orElse(condition, "TRUE"), where.args...).Scan(&total); err != nil {
		return records.Page[TRecord]{}, fmt.Errorf("count %s: %w", p.label, err)
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
		values, err := p.cursorValues(ctx, cursor, columns)
		if err != nil {
			return records.Page[TRecord]{}, err
		}
		condition = joinAnd(condition, where.after(ordered, values))
	}

	orderSQL := make([]string, len(ordered))
	for i, column := range ordered {
		orderSQL[i] = column.sql()
	}
	rows, err := p.pool.Query(ctx, `SELECT `+p.columns+` FROM `+p.table+` WHERE `+orElse(condition, "TRUE")+` ORDER BY `+strings.Join(orderSQL, ", ")+` LIMIT `+fmt.Sprint(limit+1), where.args...)
	if err != nil {
		return records.Page[TRecord]{}, fmt.Errorf("query %s: %w", p.label, err)
	}
	found, err := pgx.CollectRows(rows, func(row pgx.CollectableRow) (TRecord, error) { return p.scan(row) })
	if err != nil {
		return records.Page[TRecord]{}, fmt.Errorf("read %s: %w", p.label, err)
	}

	more := len(found) > limit
	if more {
		found = found[:limit]
	}
	if backward {
		slices.Reverse(found)
	}
	result := records.Page[TRecord]{TotalCount: total, HasNext: more, HasPrevious: page.After != ""}
	if backward {
		result.HasNext, result.HasPrevious = page.Before != "", more
	}
	if n := len(found); n > 0 {
		result.Records = found
		result.StartCursor, result.EndCursor = records.Cursor(p.id(found[0])), records.Cursor(p.id(found[n-1]))
	}
	return result, nil
}

func (p *rowset[TRecord]) cursorValues(ctx context.Context, cursor string, columns []orderColumn) ([]any, error) {
	id, err := records.CursorID(cursor)
	if err != nil {
		return nil, err
	}
	exprs := make([]string, len(columns))
	for i, column := range columns {
		exprs[i] = column.expr
	}
	var raw []byte
	err = p.pool.QueryRow(ctx, `SELECT jsonb_build_array(`+strings.Join(exprs, ", ")+`) FROM `+p.table+` WHERE "id" = $1`, id).Scan(&raw)
	if err != nil {
		return nil, fmt.Errorf("resolve cursor: %w", err)
	}
	var values []any
	if err := json.Unmarshal(raw, &values); err != nil {
		return nil, fmt.Errorf("decode cursor row: %w", err)
	}
	return values, nil
}

func (p *rowset[TRecord]) where(filter records.Filter) (*compiler, string, error) {
	where := &compiler{object: p.object}
	condition, err := where.filter(filter)
	if err != nil {
		return nil, "", err
	}
	if !where.mentionsDeletedAt {
		condition = joinAnd(condition, `"deletedAt" IS NULL`)
	}
	return where, condition, nil
}

func (p *rowset[TRecord]) Aggregate(ctx context.Context, filter records.Filter, aggregates []records.Aggregate) (records.AggregateResult, error) {
	where, condition, err := p.where(filter)
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
	if err := p.pool.QueryRow(ctx, `SELECT `+strings.Join(exprs, ", ")+` FROM `+p.table+` WHERE `+orElse(condition, "TRUE"), where.args...).Scan(dests...); err != nil {
		return nil, fmt.Errorf("aggregate %s: %w", p.label, err)
	}
	for i, column := range columns {
		result[column.key] = values[i]
	}
	return result, nil
}

func (p *rowset[TRecord]) GroupBy(ctx context.Context, filter records.Filter, groupBy []records.GroupBy, orderBy []records.OrderBy, aggregates []records.Aggregate, perGroup records.PageRequest) ([]records.Group[TRecord], error) {
	if len(groupBy) == 0 {
		return nil, fmt.Errorf("%w: group by needs at least one field", records.ErrUnknownField)
	}
	where, condition, err := p.where(filter)
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
	rows, err := p.pool.Query(ctx, `SELECT `+strings.Join(selects, ", ")+` FROM `+p.table+` WHERE `+orElse(condition, "TRUE")+` GROUP BY `+strings.Join(groupExprs, ", ")+` ORDER BY `+strings.Join(orderSQL, ", "), where.args...)
	if err != nil {
		return nil, fmt.Errorf("group %s: %w", p.label, err)
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
			return nil, fmt.Errorf("read %s group: %w", p.label, err)
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
		return nil, fmt.Errorf("read %s groups: %w", p.label, err)
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
		if groups[i].Records, err = p.Find(ctx, inGroup, nil, perGroup); err != nil {
			return nil, err
		}
	}
	return groups, nil
}
