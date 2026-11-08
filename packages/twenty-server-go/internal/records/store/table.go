package store

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"slices"
	"sort"
	"strconv"
	"strings"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/twentyhq/twenty/packages/twenty-server-go/internal/model"
	"github.com/twentyhq/twenty/packages/twenty-server-go/internal/records"
	"github.com/twentyhq/twenty/packages/twenty-server-go/internal/workspace"
)

type baseRow struct {
	ID                         string     `json:"id"`
	Position                   float64    `json:"position"`
	CreatedAt                  time.Time  `json:"createdAt"`
	UpdatedAt                  time.Time  `json:"updatedAt"`
	DeletedAt                  *time.Time `json:"deletedAt"`
	CreatedBySource            string     `json:"createdBySource"`
	CreatedByWorkspaceMemberID *string    `json:"createdByWorkspaceMemberId"`
	CreatedByName              string     `json:"createdByName"`
	UpdatedBySource            string     `json:"updatedBySource"`
	UpdatedByWorkspaceMemberID *string    `json:"updatedByWorkspaceMemberId"`
	UpdatedByName              string     `json:"updatedByName"`
}

func (b baseRow) createdBy() records.Actor {
	return records.Actor{Source: b.CreatedBySource, WorkspaceMemberID: deref(b.CreatedByWorkspaceMemberID), Name: b.CreatedByName}
}

func (b baseRow) updatedBy() records.Actor {
	return records.Actor{Source: b.UpdatedBySource, WorkspaceMemberID: deref(b.UpdatedByWorkspaceMemberID), Name: b.UpdatedByName}
}

func deref(value *string) string {
	if value == nil {
		return ""
	}
	return *value
}

type table[TRow, TRecord any] struct {
	pool    *pgxpool.Pool
	object  model.Object
	name    string
	convert func(TRow) TRecord
	id      func(TRecord) string
}

func newTable[TRow, TRecord any](pool *pgxpool.Pool, singular string, convert func(TRow) TRecord, id func(TRecord) string) *table[TRow, TRecord] {
	index := slices.IndexFunc(model.Objects, func(object model.Object) bool { return object.NameSingular == singular })
	if index < 0 {
		panic("object model has no " + singular + " object")
	}
	object := model.Objects[index]
	return &table[TRow, TRecord]{pool: pool, object: object, name: workspace.SchemaName() + `."` + object.Table + `"`, convert: convert, id: id}
}

func (t *table[TRow, TRecord]) decode(raw []byte) (TRecord, error) {
	var row TRow
	if err := json.Unmarshal(raw, &row); err != nil {
		var zero TRecord
		return zero, fmt.Errorf("decode %s: %w", t.object.NameSingular, err)
	}
	return t.convert(row), nil
}

func (t *table[TRow, TRecord]) Get(ctx context.Context, id string) (TRecord, error) {
	var zero TRecord
	uuid, err := parseUUID(id)
	if err != nil {
		return zero, err
	}
	var raw []byte
	err = t.pool.QueryRow(ctx, `SELECT to_jsonb(r) FROM `+t.name+` AS r WHERE "id" = $1`, uuid).Scan(&raw)
	if errors.Is(err, pgx.ErrNoRows) {
		return zero, records.ErrNotFound
	}
	if err != nil {
		return zero, fmt.Errorf("get %s: %w", t.object.NameSingular, err)
	}
	return t.decode(raw)
}

func (t *table[TRow, TRecord]) create(ctx context.Context, actor records.Actor, values map[string]any) (TRecord, error) {
	var zero TRecord
	memberID, err := optionalUUID(actor.WorkspaceMemberID)
	if err != nil {
		return zero, err
	}
	var position float64
	if err := t.pool.QueryRow(ctx, `SELECT COALESCE(MIN("position") - 1, 0) FROM `+t.name).Scan(&position); err != nil {
		return zero, fmt.Errorf("compute position: %w", err)
	}
	values["position"] = position
	values["createdBySource"], values["updatedBySource"] = actor.Source, actor.Source
	values["createdByWorkspaceMemberId"], values["updatedByWorkspaceMemberId"] = memberID, memberID
	values["createdByName"], values["updatedByName"] = actor.Name, actor.Name

	columns := sortedColumns(values)
	args := make([]any, len(columns))
	placeholders := make([]string, len(columns))
	for i, column := range columns {
		args[i], placeholders[i] = values[column], "$"+strconv.Itoa(i+1)
	}
	var raw []byte
	err = t.pool.QueryRow(ctx, `INSERT INTO `+t.name+` AS r ("`+strings.Join(columns, `", "`)+`") VALUES (`+strings.Join(placeholders, ", ")+`) RETURNING to_jsonb(r)`, args...).Scan(&raw)
	if err != nil {
		return zero, fmt.Errorf("create %s: %w", t.object.NameSingular, err)
	}
	return t.decode(raw)
}

func (t *table[TRow, TRecord]) update(ctx context.Context, actor records.Actor, id string, values map[string]any) (TRecord, error) {
	var zero TRecord
	uuid, err := parseUUID(id)
	if err != nil {
		return zero, err
	}
	memberID, err := optionalUUID(actor.WorkspaceMemberID)
	if err != nil {
		return zero, err
	}
	values["updatedBySource"], values["updatedByWorkspaceMemberId"], values["updatedByName"] = actor.Source, memberID, actor.Name

	columns := sortedColumns(values)
	args := make([]any, 0, len(columns)+1)
	assignments := make([]string, len(columns))
	for i, column := range columns {
		args = append(args, values[column])
		assignments[i] = `"` + column + `" = $` + strconv.Itoa(i+1)
	}
	args = append(args, uuid)
	var raw []byte
	err = t.pool.QueryRow(ctx, `UPDATE `+t.name+` AS r SET `+strings.Join(assignments, ", ")+`, "updatedAt" = now() WHERE "id" = $`+strconv.Itoa(len(args))+` RETURNING to_jsonb(r)`, args...).Scan(&raw)
	if errors.Is(err, pgx.ErrNoRows) {
		return zero, records.ErrNotFound
	}
	if err != nil {
		return zero, fmt.Errorf("update %s: %w", t.object.NameSingular, err)
	}
	return t.decode(raw)
}

func sortedColumns(values map[string]any) []string {
	columns := make([]string, 0, len(values))
	for column := range values {
		columns = append(columns, column)
	}
	sort.Strings(columns)
	return columns
}

func (t *table[TRow, TRecord]) SoftDelete(ctx context.Context, id string) error {
	return t.affect(ctx, id, `SET "deletedAt" = now(), "updatedAt" = now() WHERE "id" = $1 AND "deletedAt" IS NULL`)
}

func (t *table[TRow, TRecord]) Restore(ctx context.Context, id string) error {
	return t.affect(ctx, id, `SET "deletedAt" = NULL, "updatedAt" = now() WHERE "id" = $1 AND "deletedAt" IS NOT NULL`)
}

func (t *table[TRow, TRecord]) Destroy(ctx context.Context, id string) error {
	uuid, err := parseUUID(id)
	if err != nil {
		return err
	}
	tag, err := t.pool.Exec(ctx, `DELETE FROM `+t.name+` WHERE "id" = $1`, uuid)
	return affected(tag.RowsAffected(), err, t.object.NameSingular)
}

func (t *table[TRow, TRecord]) affect(ctx context.Context, id, statement string) error {
	uuid, err := parseUUID(id)
	if err != nil {
		return err
	}
	tag, err := t.pool.Exec(ctx, `UPDATE `+t.name+` `+statement, uuid)
	return affected(tag.RowsAffected(), err, t.object.NameSingular)
}

func affected(rows int64, err error, singular string) error {
	if err != nil {
		return fmt.Errorf("write %s: %w", singular, err)
	}
	if rows == 0 {
		return records.ErrNotFound
	}
	return nil
}

func (t *table[TRow, TRecord]) Find(ctx context.Context, filter records.Filter, orderBy []records.OrderBy, page records.PageRequest) (records.Page[TRecord], error) {
	var zero records.Page[TRecord]
	where, condition, err := t.where(filter)
	if err != nil {
		return zero, err
	}
	columns, err := where.order(orderBy)
	if err != nil {
		return zero, err
	}

	var total int
	if err := t.pool.QueryRow(ctx, `SELECT count(*) FROM `+t.name+` WHERE `+orElse(condition, "TRUE"), where.args...).Scan(&total); err != nil {
		return zero, fmt.Errorf("count %s: %w", t.object.NamePlural, err)
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
			return zero, err
		}
		condition = joinAnd(condition, where.after(ordered, values))
	}

	orderSQL := make([]string, len(ordered))
	for i, column := range ordered {
		orderSQL[i] = column.sql()
	}
	rows, err := t.pool.Query(ctx, `SELECT to_jsonb(r) FROM `+t.name+` AS r WHERE `+orElse(condition, "TRUE")+` ORDER BY `+strings.Join(orderSQL, ", ")+` LIMIT `+strconv.Itoa(limit+1), where.args...)
	if err != nil {
		return zero, fmt.Errorf("query %s: %w", t.object.NamePlural, err)
	}
	raws, err := pgx.CollectRows(rows, pgx.RowTo[[]byte])
	if err != nil {
		return zero, fmt.Errorf("read %s: %w", t.object.NamePlural, err)
	}

	more := len(raws) > limit
	if more {
		raws = raws[:limit]
	}
	if backward {
		slices.Reverse(raws)
	}
	result := records.Page[TRecord]{TotalCount: total, HasNext: more, HasPrevious: page.After != ""}
	if backward {
		result.HasNext, result.HasPrevious = page.Before != "", more
	}
	for _, raw := range raws {
		record, err := t.decode(raw)
		if err != nil {
			return zero, err
		}
		result.Records = append(result.Records, record)
	}
	if n := len(result.Records); n > 0 {
		result.StartCursor, result.EndCursor = records.Cursor(t.id(result.Records[0])), records.Cursor(t.id(result.Records[n-1]))
	}
	return result, nil
}

func (t *table[TRow, TRecord]) cursorValues(ctx context.Context, cursor string, columns []orderColumn) ([]any, error) {
	id, err := records.CursorID(cursor)
	if err != nil {
		return nil, err
	}
	exprs := make([]string, len(columns))
	for i, column := range columns {
		exprs[i] = column.expr
	}
	var raw []byte
	err = t.pool.QueryRow(ctx, `SELECT jsonb_build_array(`+strings.Join(exprs, ", ")+`) FROM `+t.name+` WHERE "id" = $1`, id).Scan(&raw)
	if err != nil {
		return nil, fmt.Errorf("resolve cursor: %w", err)
	}
	var values []any
	if err := json.Unmarshal(raw, &values); err != nil {
		return nil, fmt.Errorf("decode cursor row: %w", err)
	}
	return values, nil
}

func (t *table[TRow, TRecord]) where(filter records.Filter) (*compiler, string, error) {
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

func (t *table[TRow, TRecord]) Aggregate(ctx context.Context, filter records.Filter, aggregates []records.Aggregate) (records.AggregateResult, error) {
	where, condition, err := t.where(filter)
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
	if err := t.pool.QueryRow(ctx, `SELECT `+strings.Join(exprs, ", ")+` FROM `+t.name+` WHERE `+orElse(condition, "TRUE"), where.args...).Scan(dests...); err != nil {
		return nil, fmt.Errorf("aggregate %s: %w", t.object.NamePlural, err)
	}
	for i, column := range columns {
		result[column.key] = values[i]
	}
	return result, nil
}

func (t *table[TRow, TRecord]) GroupBy(ctx context.Context, filter records.Filter, groupBy []records.GroupBy, orderBy []records.OrderBy, aggregates []records.Aggregate, perGroup records.PageRequest) ([]records.Group[TRecord], error) {
	if len(groupBy) == 0 {
		return nil, fmt.Errorf("%w: group by needs at least one field", records.ErrUnknownField)
	}
	where, condition, err := t.where(filter)
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
	rows, err := t.pool.Query(ctx, `SELECT `+strings.Join(selects, ", ")+` FROM `+t.name+` WHERE `+orElse(condition, "TRUE")+` GROUP BY `+strings.Join(groupExprs, ", ")+` ORDER BY `+strings.Join(orderSQL, ", "), where.args...)
	if err != nil {
		return nil, fmt.Errorf("group %s: %w", t.object.NamePlural, err)
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
			return nil, fmt.Errorf("read %s group: %w", t.object.NamePlural, err)
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
		return nil, fmt.Errorf("read %s groups: %w", t.object.NamePlural, err)
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
		if groups[i].Records, err = t.Find(ctx, inGroup, nil, perGroup); err != nil {
			return nil, err
		}
	}
	return groups, nil
}
