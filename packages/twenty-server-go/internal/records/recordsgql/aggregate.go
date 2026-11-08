package recordsgql

import (
	"context"
	"reflect"
	"slices"
	"strings"
	"time"

	"github.com/99designs/gqlgen/graphql"

	"github.com/twentyhq/twenty/packages/twenty-server-go/internal/records"
)

const (
	recordsPerGroup = 10
	defaultGroups   = 50
)

var aggregatableFields = []string{
	"address", "amount", "annualRevenue", "avatarFile", "avatarUrl", "closeDate", "createdAt", "createdBy", "deletedAt", "domainName", "emails", "id", "jobTitle",
	"linkedinLink", "name", "phones", "position", "stage", "updatedAt", "updatedBy",
}

var dateAggregatableFields = []string{"closeDate", "createdAt", "deletedAt", "updatedAt"}

var currencyAggregatableFields = []string{"amount", "annualRevenue"}

var aggregatesByFieldName = buildAggregatesByFieldName()

func buildAggregatesByFieldName() map[string]records.Aggregate {
	lookup := map[string]records.Aggregate{}
	for _, field := range aggregatableFields {
		operations := []records.AggregateOperation{"countUniqueValues", "countEmpty", "countNotEmpty", "percentageEmpty", "percentageNotEmpty"}
		if slices.Contains(dateAggregatableFields, field) {
			operations = append(operations, "min", "max")
		}
		for _, operation := range operations {
			lookup[string(operation)+strings.ToUpper(field[:1])+field[1:]] = records.Aggregate{Field: field, Operation: operation}
		}
		if slices.Contains(currencyAggregatableFields, field) {
			for _, operation := range []records.AggregateOperation{"min", "max", "avg", "sum"} {
				lookup[string(operation)+strings.ToUpper(field[:1])+field[1:]+"AmountMicros"] = records.Aggregate{Field: field, Operation: operation}
			}
		}
	}
	return lookup
}

func requestedAggregates(ctx context.Context) []records.Aggregate {
	var aggregates []records.Aggregate
	for _, field := range graphql.CollectAllFields(ctx) {
		if aggregate, ok := aggregatesByFieldName[field]; ok {
			aggregates = append(aggregates, aggregate)
		}
	}
	return aggregates
}

func selects(ctx context.Context, names ...string) bool {
	return slices.ContainsFunc(graphql.CollectAllFields(ctx), func(field string) bool { return slices.Contains(names, field) })
}

func fillAggregates(connection any, result records.AggregateResult) {
	target := reflect.ValueOf(connection).Elem()
	for key, value := range result {
		field := target.FieldByName(strings.ToUpper(key[:1]) + key[1:])
		if !field.IsValid() || value == nil {
			continue
		}
		switch typed := value.(type) {
		case int64:
			count := int(typed)
			field.Set(reflect.ValueOf(&count))
		case float64:
			field.Set(reflect.ValueOf(&typed))
		case time.Time:
			field.Set(reflect.ValueOf(&typed))
		}
	}
}

func parseGroupBy(input []map[string]any) ([]records.GroupBy, error) {
	var groupBy []records.GroupBy
	for _, raw := range input {
		item, err := plainMap(raw)
		if err != nil {
			return nil, err
		}
		for _, field := range sortedKeys(item) {
			switch typed := item[field].(type) {
			case bool:
				if typed {
					groupBy = append(groupBy, records.GroupBy{Field: field})
				}
			case map[string]any:
				for _, subField := range sortedKeys(typed) {
					if selected, _ := typed[subField].(bool); selected {
						groupBy = append(groupBy, records.GroupBy{Field: field, SubField: subField})
					}
				}
			}
		}
	}
	return groupBy, nil
}
