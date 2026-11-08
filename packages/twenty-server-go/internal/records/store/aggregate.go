package store

import (
	"fmt"
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
