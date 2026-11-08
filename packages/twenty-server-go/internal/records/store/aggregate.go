package store

import (
	"context"
	"fmt"
	"slices"
	"strings"

	"github.com/twentyhq/twenty/packages/twenty-server-go/internal/model"
	"github.com/twentyhq/twenty/packages/twenty-server-go/internal/records"
)

var compositeAggregateSubFields = map[model.FieldType][]string{
	model.TypeFullName: {"firstName", "lastName"},
	model.TypeEmails:   {"primaryEmail"},
	model.TypePhones:   {"primaryPhoneNumber", "primaryPhoneCountryCode", "primaryPhoneCallingCode"},
	model.TypeLinks:    {"primaryLinkUrl"},
	model.TypeActor:    {"workspaceMemberId", "source"},
}

type aggregateColumn struct {
	key  string
	expr string
}

func (c *compiler) aggregateColumn(aggregate records.Aggregate) (aggregateColumn, error) {
	columns, fieldType, err := c.aggregateSource(aggregate.Field)
	if err != nil {
		return aggregateColumn{}, err
	}
	key := string(aggregate.Operation) + strings.ToUpper(aggregate.Field[:1]) + aggregate.Field[1:]
	if aggregate.Operation == "count" && aggregate.Field == "id" {
		key = "totalCount"
	}
	concatenated := `NULLIF(CONCAT(` + strings.Join(columns, ",") + `), '')`
	numeric := fieldType == model.TypeNumber || fieldType == model.TypeNumeric || fieldType == model.TypePosition
	date := fieldType == model.TypeDateTime
	function := strings.ToUpper(string(aggregate.Operation))

	var expr string
	switch aggregate.Operation {
	case "count":
		expr = "COUNT(" + columns[0] + ")"
	case "countEmpty":
		expr = "CASE WHEN COUNT(*) = 0 THEN NULL ELSE COUNT(*) - COUNT(" + concatenated + ") END"
	case "countNotEmpty":
		expr = "CASE WHEN COUNT(*) = 0 THEN NULL ELSE COUNT(" + concatenated + ") END"
	case "countUniqueValues":
		expr = "CASE WHEN COUNT(*) = 0 THEN NULL ELSE COUNT(DISTINCT " + concatenated + ") END"
	case "percentageEmpty":
		expr = "CASE WHEN COUNT(*) = 0 THEN NULL ELSE ((COUNT(*) - COUNT(" + concatenated + ")::decimal) / COUNT(*))::float8 END"
	case "percentageNotEmpty":
		expr = "CASE WHEN COUNT(*) = 0 THEN NULL ELSE (COUNT(" + concatenated + ")::decimal / COUNT(*))::float8 END"
	case "countTrue", "countFalse":
		if fieldType != model.TypeBoolean {
			return aggregateColumn{}, unsupported(aggregate)
		}
		wanted := "TRUE"
		if aggregate.Operation == "countFalse" {
			wanted = "FALSE"
		}
		expr = "CASE WHEN COUNT(*) = 0 THEN NULL ELSE COUNT(CASE WHEN " + columns[0] + " = " + wanted + " THEN 1 END) END"
	case "min", "max":
		switch {
		case numeric:
			expr = function + "(" + columns[0] + ")::float8"
		case date:
			expr = function + "(" + columns[0] + ")"
		default:
			return aggregateColumn{}, unsupported(aggregate)
		}
	case "sum", "avg":
		if !numeric {
			return aggregateColumn{}, unsupported(aggregate)
		}
		expr = function + "(" + columns[0] + ")::float8"
	default:
		return aggregateColumn{}, fmt.Errorf("unsupported aggregate operation %q", aggregate.Operation)
	}
	return aggregateColumn{key: key, expr: expr}, nil
}

func unsupported(aggregate records.Aggregate) error {
	return fmt.Errorf("%w: %s does not support %s", records.ErrUnknownField, aggregate.Field, aggregate.Operation)
}

func (c *compiler) aggregateSource(name string) ([]string, model.FieldType, error) {
	for i := range c.object.Fields {
		field := &c.object.Fields[i]
		if field.Name != name || field.Type == model.TypeTSVector || len(field.Columns) == 0 {
			continue
		}
		subFields, composite := compositeAggregateSubFields[field.Type]
		if !composite {
			return []string{`"` + field.Columns[0].Name + `"`}, field.Type, nil
		}
		columns := make([]string, 0, len(subFields))
		for _, subField := range subFields {
			if column, ok := c.column(field, subField); ok {
				columns = append(columns, `"`+column+`"`)
			}
		}
		return columns, field.Type, nil
	}
	expr, fieldType, err := c.resolve(name, "")
	if err != nil {
		return nil, "", err
	}
	return []string{expr}, fieldType, nil
}

func (c *compiler) aggregateColumns(aggregates []records.Aggregate) ([]aggregateColumn, error) {
	columns := make([]aggregateColumn, len(aggregates))
	for i, aggregate := range aggregates {
		column, err := c.aggregateColumn(aggregate)
		if err != nil {
			return nil, err
		}
		columns[i] = column
	}
	return columns, nil
}

func (t *recordTable[TRecord]) Aggregate(ctx context.Context, filter records.Filter, aggregates []records.Aggregate) (records.AggregateResult, error) {
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
	if err := t.pool.QueryRow(ctx, `SELECT `+strings.Join(exprs, ", ")+` FROM `+t.table+` WHERE `+orElse(condition, "TRUE"), where.args...).Scan(dests...); err != nil {
		return nil, fmt.Errorf("aggregate %s: %w", t.label, err)
	}
	for i, column := range columns {
		result[column.key] = values[i]
	}
	return result, nil
}

func (t *recordTable[TRecord]) GroupBy(ctx context.Context, filter records.Filter, groupBy []records.GroupBy, orderBy []records.OrderBy, aggregates []records.Aggregate, perGroup records.PageRequest) ([]records.Group[TRecord], error) {
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
	rows, err := t.pool.Query(ctx, `SELECT `+strings.Join(selects, ", ")+` FROM `+t.table+` WHERE `+orElse(condition, "TRUE")+` GROUP BY `+strings.Join(groupExprs, ", ")+` ORDER BY `+strings.Join(orderSQL, ", "), where.args...)
	if err != nil {
		return nil, fmt.Errorf("group %s: %w", t.label, err)
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
			return nil, fmt.Errorf("read %s group: %w", t.label, err)
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
		return nil, fmt.Errorf("read %s groups: %w", t.label, err)
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
