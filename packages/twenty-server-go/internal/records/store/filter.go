package store

import (
	"fmt"
	"strconv"
	"strings"

	"github.com/twentyhq/twenty/packages/twenty-server-go/internal/model"
	"github.com/twentyhq/twenty/packages/twenty-server-go/internal/records"
)

type compiler struct {
	object            model.Object
	args              []any
	mentionsDeletedAt bool
}

func (c *compiler) arg(value any) string {
	c.args = append(c.args, value)
	return "$" + strconv.Itoa(len(c.args))
}

func (c *compiler) column(field *model.Field, subField string) (string, bool) {
	if field.Type == model.TypeTSVector || len(field.Columns) == 0 {
		return "", false
	}
	for _, column := range field.Columns {
		if column.SubField == subField {
			return column.Name, true
		}
	}
	return "", false
}

func (c *compiler) resolve(name, subField string) (string, model.FieldType, error) {
	for i := range c.object.Fields {
		field := &c.object.Fields[i]
		if field.Name == name {
			if column, ok := c.column(field, subField); ok {
				return `"` + column + `"`, field.Type, nil
			}
			break
		}
		if subField == "" && len(field.Columns) == 1 && field.Columns[0].Name == name {
			return `"` + name + `"`, model.TypeUUID, nil
		}
	}
	return "", "", fmt.Errorf("%w: %s.%s on %s", records.ErrUnknownField, name, subField, c.object.NameSingular)
}

func (c *compiler) filter(filter records.Filter) (string, error) {
	var parts []string
	if filter.Field != nil {
		part, err := c.fieldFilter(*filter.Field)
		if err != nil {
			return "", err
		}
		parts = append(parts, part)
	}
	for _, group := range []struct {
		filters []records.Filter
		joiner  string
	}{{filter.And, " AND "}, {filter.Or, " OR "}} {
		var inner []string
		for _, child := range group.filters {
			part, err := c.filter(child)
			if err != nil {
				return "", err
			}
			if part != "" {
				inner = append(inner, part)
			}
		}
		if len(inner) > 0 {
			parts = append(parts, "("+strings.Join(inner, group.joiner)+")")
		}
	}
	if filter.Not != nil {
		part, err := c.filter(*filter.Not)
		if err != nil {
			return "", err
		}
		if part != "" {
			parts = append(parts, "NOT ("+part+")")
		}
	}
	return strings.Join(parts, " AND "), nil
}

func (c *compiler) fieldFilter(filter records.FieldFilter) (string, error) {
	column, fieldType, err := c.resolve(filter.Field, filter.SubField)
	if err != nil {
		return "", err
	}
	if column == `"deletedAt"` {
		c.mentionsDeletedAt = true
	}
	switch filter.Operand {
	case "eq":
		return column + " = " + c.arg(filter.Value), nil
	case "neq":
		return column + " <> " + c.arg(filter.Value), nil
	case "gt":
		return column + " > " + c.arg(filter.Value), nil
	case "gte":
		return column + " >= " + c.arg(filter.Value), nil
	case "lt":
		return column + " < " + c.arg(filter.Value), nil
	case "lte":
		return column + " <= " + c.arg(filter.Value), nil
	case "in":
		return column + " = ANY(" + c.arg(filter.Value) + ")", nil
	case "like":
		return column + " LIKE " + c.arg(filter.Value), nil
	case "ilike":
		return column + " ILIKE " + c.arg(filter.Value), nil
	case "startsWith":
		prefix, ok := filter.Value.(string)
		if !ok {
			return "", fmt.Errorf("startsWith on %s needs a string value", filter.Field)
		}
		return column + " ILIKE " + c.arg(prefix+"%"), nil
	case "containsIlike":
		return column + "::text ILIKE " + c.arg(filter.Value), nil
	case "containsAny":
		if fieldType == model.TypeMultiSelect {
			return column + "::text[] && " + c.arg(filter.Value) + "::text[]", nil
		}
		return column + " ?| " + c.arg(filter.Value) + "::text[]", nil
	case "is":
		switch filter.Value {
		case "NULL":
			return column + " IS NULL", nil
		case "NOT_NULL":
			return column + " IS NOT NULL", nil
		}
		return "", fmt.Errorf("is on %s needs NULL or NOT_NULL, got %v", filter.Field, filter.Value)
	}
	return "", fmt.Errorf("unsupported operand %q on %s", filter.Operand, filter.Field)
}

type orderColumn struct {
	expr       string
	descending bool
	nullsFirst bool
}

func (o orderColumn) reversed() orderColumn {
	return orderColumn{o.expr, !o.descending, !o.nullsFirst}
}

func (o orderColumn) sql() string {
	direction, nulls := "ASC", "NULLS LAST"
	if o.descending {
		direction = "DESC"
	}
	if o.nullsFirst {
		nulls = "NULLS FIRST"
	}
	return o.expr + " " + direction + " " + nulls
}

func (c *compiler) order(orderBy []records.OrderBy) ([]orderColumn, error) {
	var columns []orderColumn
	hasID := false
	for _, by := range orderBy {
		expr, _, err := c.resolve(by.Field, by.SubField)
		if err != nil {
			return nil, err
		}
		column := orderColumn{expr: expr}
		switch by.Direction {
		case "AscNullsFirst":
			column.nullsFirst = true
		case "AscNullsLast":
		case "DescNullsFirst":
			column.descending, column.nullsFirst = true, true
		case "DescNullsLast":
			column.descending = true
		default:
			return nil, fmt.Errorf("unknown order direction %q", by.Direction)
		}
		hasID = hasID || expr == `"id"`
		columns = append(columns, column)
	}
	if !hasID {
		columns = append(columns, orderColumn{expr: `"id"`, nullsFirst: true})
	}
	return columns, nil
}

func (c *compiler) after(columns []orderColumn, values []any) string {
	var alternatives []string
	var equal []string
	for i, column := range columns {
		value := values[i]
		var later, placeholder string
		if value != nil {
			placeholder = c.arg(value)
		}
		switch {
		case value == nil && column.nullsFirst:
			later = column.expr + " IS NOT NULL"
		case value == nil:
		default:
			operator := ">"
			if column.descending {
				operator = "<"
			}
			later = column.expr + " " + operator + " " + placeholder
			if !column.nullsFirst {
				later = "(" + later + " OR " + column.expr + " IS NULL)"
			}
		}
		if later != "" {
			alternatives = append(alternatives, "("+strings.Join(append(append([]string{}, equal...), later), " AND ")+")")
		}
		if value == nil {
			equal = append(equal, column.expr+" IS NULL")
		} else {
			equal = append(equal, column.expr+" = "+placeholder)
		}
	}
	if len(alternatives) == 0 {
		return "FALSE"
	}
	return "(" + strings.Join(alternatives, " OR ") + ")"
}
