package recordsgql

import (
	"context"
	"reflect"
	"slices"
	"strings"
	"time"

	"github.com/99designs/gqlgen/graphql"

	"github.com/twentyhq/twenty/packages/twenty-server-go/internal/model"
	"github.com/twentyhq/twenty/packages/twenty-server-go/internal/records"
)

const (
	recordsPerGroup = 10
	defaultGroups   = 50
)

var aggregatableFields = []string{
	"avatarFile", "avatarUrl", "createdAt", "createdBy", "deletedAt", "emails", "id", "jobTitle",
	"linkedinLink", "name", "phones", "position", "updatedAt", "updatedBy",
}

var dateAggregatableFields = []string{"createdAt", "deletedAt", "updatedAt"}

var personAggregates = buildAggregatesByFieldName(aggregatableFields, dateAggregatableFields)

func aggregatesOf(object model.Object) map[string]records.Aggregate {
	var fields, dateFields []string
	for _, field := range object.Fields {
		switch field.Type {
		case model.TypeRelation, model.TypeMorph, model.TypeTSVector:
			continue
		case model.TypeDateTime:
			dateFields = append(dateFields, field.Name)
		}
		fields = append(fields, field.Name)
	}
	return buildAggregatesByFieldName(fields, dateFields)
}

func buildAggregatesByFieldName(fields, dateFields []string) map[string]records.Aggregate {
	lookup := map[string]records.Aggregate{}
	for _, field := range fields {
		operations := []records.AggregateOperation{"countUniqueValues", "countEmpty", "countNotEmpty", "percentageEmpty", "percentageNotEmpty"}
		if slices.Contains(dateFields, field) {
			operations = append(operations, "min", "max")
		}
		for _, operation := range operations {
			lookup[string(operation)+strings.ToUpper(field[:1])+field[1:]] = records.Aggregate{Field: field, Operation: operation}
		}
	}
	return lookup
}

func requestedAggregates(ctx context.Context, lookup map[string]records.Aggregate) []records.Aggregate {
	var aggregates []records.Aggregate
	for _, field := range graphql.CollectAllFields(ctx) {
		if aggregate, ok := lookup[field]; ok {
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
	fieldsByKey := map[string]reflect.Value{}
	for i := range target.NumField() {
		key, _, _ := strings.Cut(target.Type().Field(i).Tag.Get("json"), ",")
		fieldsByKey[key] = target.Field(i)
	}
	for key, value := range result {
		field, ok := fieldsByKey[key]
		if !ok || value == nil {
			continue
		}
		switch typed := value.(type) {
		case int64:
			count := int(typed)
			field.Set(reflect.ValueOf(&count))
		case float64:
			field.Set(reflect.ValueOf(&typed))
		case time.Time:
			typed = typed.UTC()
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
