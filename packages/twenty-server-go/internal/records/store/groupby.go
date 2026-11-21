package store

import (
	"context"
	"fmt"
	"slices"
	"strconv"
	"strings"

	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/twentyhq/twenty/packages/twenty-server-go/internal/model"
	"github.com/twentyhq/twenty/packages/twenty-server-go/internal/records"
	"github.com/twentyhq/twenty/packages/twenty-server-go/internal/workspace"
)

var weekdayIndex = map[string]int{"MONDAY": 0, "TUESDAY": 1, "WEDNESDAY": 2, "THURSDAY": 3, "FRIDAY": 4, "SATURDAY": 5, "SUNDAY": 6}

type GroupByEngine struct {
	pool   *pgxpool.Pool
	object model.Object
	fields map[string]records.FieldMetadata
}

func NewGroupByEngine(pool *pgxpool.Pool, object model.Object, fields []records.FieldMetadata) *GroupByEngine {
	byID := make(map[string]records.FieldMetadata, len(fields))
	for _, field := range fields {
		byID[field.ID] = field
	}
	return &GroupByEngine{pool: pool, object: object, fields: byID}
}

type dimension struct {
	join  string
	group string
	sort  func() string
}

func findField(object model.Object, name string) *model.Field {
	index := slices.IndexFunc(object.Fields, func(field model.Field) bool { return field.Name == name })
	if index < 0 {
		return nil
	}
	return &object.Fields[index]
}

func (e *GroupByEngine) metadata(id string) (records.FieldMetadata, error) {
	field, ok := e.fields[id]
	if !ok {
		return field, fmt.Errorf("%w: field id %s on %s", records.ErrUnknownField, id, e.object.NameSingular)
	}
	return field, nil
}

func (e *GroupByEngine) GroupBy(ctx context.Context, query records.GroupByQuery) ([]records.GroupRow, error) {
	if len(query.Dimensions) == 0 {
		return nil, fmt.Errorf("%w: group by needs at least one dimension", records.ErrUnknownField)
	}
	startDay, ok := weekdayIndex[orElse(query.FirstDayOfTheWeek, "MONDAY")]
	if !ok {
		return nil, fmt.Errorf("unknown first day of the week %q", query.FirstDayOfTheWeek)
	}
	where := &compiler{object: e.object}
	condition, err := where.filter(query.Filter)
	if err != nil {
		return nil, err
	}
	if !where.mentionsDeletedAt {
		condition = joinAnd(condition, `base."deletedAt" IS NULL`)
	}
	timeZone := ""
	if query.TimeZone != "" {
		timeZone = where.arg(query.TimeZone) + "::text"
	}

	dimensions := make([]dimension, len(query.Dimensions))
	for i, requested := range query.Dimensions {
		if dimensions[i], err = e.dimension(where, i, requested, timeZone, startDay); err != nil {
			return nil, err
		}
	}

	aggregateField := "id"
	if query.Aggregate.FieldID != "" {
		metadata, err := e.metadata(query.Aggregate.FieldID)
		if err != nil {
			return nil, err
		}
		aggregateField = metadata.Name
	}
	aggregate, err := where.aggregateColumn(records.Aggregate{Field: aggregateField, Operation: query.Aggregate.Operation})
	if err != nil {
		return nil, err
	}

	orders := query.OrderBy
	if len(orders) == 0 {
		for i := range dimensions {
			orders = append(orders, records.GroupOrder{Dimension: i})
		}
	}
	orderSQL := make([]string, len(orders))
	for i, order := range orders {
		expr := aggregate.expr
		if !order.ByAggregate {
			if order.Dimension < 0 || order.Dimension >= len(dimensions) {
				return nil, fmt.Errorf("%w: order by dimension %d", records.ErrUnknownField, order.Dimension)
			}
			expr = dimensions[order.Dimension].sort()
		}
		orderSQL[i] = orderColumn{expr: expr, descending: order.Descending}.sql()
	}

	selects := make([]string, 0, len(dimensions)+1)
	groups := make([]string, len(dimensions))
	joins := ""
	for i, d := range dimensions {
		selects = append(selects, d.group+"::text")
		groups[i] = d.group
		joins += d.join
	}
	selects = append(selects, aggregate.expr)
	sql := `SELECT ` + strings.Join(selects, ", ") + ` FROM ` + workspace.SchemaName() + `."` + e.object.Table + `" AS base` + joins +
		` WHERE ` + orElse(condition, "TRUE") + ` GROUP BY ` + strings.Join(groups, ", ") + ` ORDER BY ` + strings.Join(orderSQL, ", ")
	if query.Limit > 0 {
		sql += ` LIMIT ` + strconv.Itoa(query.Limit)
	}
	rows, err := e.pool.Query(ctx, sql, where.args...)
	if err != nil {
		return nil, fmt.Errorf("group %s: %w", e.object.NamePlural, err)
	}
	defer rows.Close()

	var result []records.GroupRow
	for rows.Next() {
		keys := make([]*string, len(dimensions))
		dests := make([]any, 0, len(selects))
		for i := range keys {
			dests = append(dests, &keys[i])
		}
		row := records.GroupRow{Keys: make([]any, len(keys))}
		dests = append(dests, &row.Value)
		if err := rows.Scan(dests...); err != nil {
			return nil, fmt.Errorf("read %s group: %w", e.object.NamePlural, err)
		}
		for i, key := range keys {
			if key != nil {
				row.Keys[i] = *key
			}
		}
		result = append(result, row)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("read %s groups: %w", e.object.NamePlural, err)
	}
	return result, nil
}

func (e *GroupByEngine) dimension(c *compiler, index int, requested records.GroupDimension, timeZone string, startDay int) (dimension, error) {
	metadata, err := e.metadata(requested.FieldID)
	if err != nil {
		return dimension{}, err
	}
	field := findField(e.object, metadata.Name)
	if field == nil {
		return dimension{}, fmt.Errorf("%w: %s on %s", records.ErrUnknownField, metadata.Name, e.object.NameSingular)
	}

	var d dimension
	var expr string
	var fieldType model.FieldType
	switch {
	case requested.NestedField != "":
		if metadata.Relation == nil {
			return d, fmt.Errorf("%w: %s is not a relation", records.ErrUnknownField, metadata.Name)
		}
		target := &compiler{object: metadata.Relation.Target}
		column, nestedType, err := target.resolve(requested.NestedField, requested.NestedSubField)
		if err != nil {
			return d, err
		}
		field, fieldType = findField(metadata.Relation.Target, requested.NestedField), nestedType
		if field == nil {
			return d, fmt.Errorf("%w: %s on %s", records.ErrUnknownField, requested.NestedField, metadata.Relation.Target.NameSingular)
		}
		expr = `(SELECT target.` + column + ` FROM ` + workspace.SchemaName() + `."` + metadata.Relation.Target.Table + `" AS target WHERE target."id" = base."` + metadata.Relation.JoinColumn + `")`
	case metadata.Relation != nil:
		expr, fieldType = `base."`+metadata.Relation.JoinColumn+`"`, model.TypeUUID
	default:
		column, resolvedType, err := c.resolve(metadata.Name, requested.SubField)
		if err != nil {
			return d, err
		}
		expr, fieldType = "base."+column, resolvedType
	}

	switch fieldType {
	case model.TypeMultiSelect, model.TypeArray:
		if requested.NestedField != "" {
			return d, fmt.Errorf("%w: cannot unnest %s through a relation", records.ErrUnknownField, requested.NestedField)
		}
		alias := "unnested" + strconv.Itoa(index)
		d.join = ` LEFT JOIN LATERAL unnest(` + expr + `::text[]) AS ` + alias + `(value) ON TRUE`
		d.group = alias + ".value"
		d.sort = optionOrder(c, field.Options, d.group)
	case model.TypeSelect:
		d.group = expr + "::text"
		d.sort = optionOrder(c, field.Options, d.group)
	case model.TypeDateTime:
		if !knownGranularity(requested.DateGranularity) {
			return d, fmt.Errorf("unknown date granularity %q", requested.DateGranularity)
		}
		var sort string
		d.group, sort = dateExpression(expr, requested.DateGranularity, timeZone, startDay)
		if sort != "" {
			d.sort = func() string { return sort }
		}
	}
	if d.group == "" {
		d.group = expr
	}
	if d.sort == nil {
		group := d.group
		d.sort = func() string { return group }
	}
	return d, nil
}

func optionOrder(c *compiler, options []string, group string) func() string {
	if len(options) == 0 {
		return nil
	}
	return func() string { return `array_position(` + c.arg(options) + `::text[], ` + group + `)` }
}

func dateExpression(column string, granularity records.DateGranularity, timeZone string, startDay int) (group, sort string) {
	local := column
	if timeZone != "" {
		local = "(" + column + " AT TIME ZONE " + timeZone + ")"
	}
	switch granularity {
	case records.GranularityDay, records.GranularityMonth, records.GranularityQuarter, records.GranularityYear:
		return `date_trunc('` + strings.ToLower(string(granularity)) + `', ` + local + `)::date`, ""
	case records.GranularityWeek:
		shift := `make_interval(days => ` + strconv.Itoa((7-startDay)%7) + `)`
		return `(date_trunc('week', ` + local + ` + ` + shift + `) - ` + shift + `)::date`, ""
	case records.GranularityDayOfTheWeek:
		group = `extract(isodow FROM ` + local + `)::int`
		return group, `((` + group + ` - 1 - ` + strconv.Itoa(startDay) + ` + 7) % 7)`
	case records.GranularityMonthOfYear:
		return `extract(month FROM ` + local + `)::int`, ""
	case records.GranularityQuarterOfYear:
		return `extract(quarter FROM ` + local + `)::int`, ""
	}
	return column, ""
}

func knownGranularity(granularity records.DateGranularity) bool {
	switch granularity {
	case "", records.GranularityDay, records.GranularityWeek, records.GranularityMonth, records.GranularityQuarter, records.GranularityYear,
		records.GranularityDayOfTheWeek, records.GranularityMonthOfYear, records.GranularityQuarterOfYear:
		return true
	}
	return false
}
