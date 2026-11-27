package recordsgql

import (
	"context"
	"fmt"
	"slices"

	"github.com/vektah/gqlparser/v2/ast"

	"github.com/twentyhq/twenty/packages/twenty-server-go/internal/model"
	"github.com/twentyhq/twenty/packages/twenty-server-go/internal/records"
)

const minDuplicateValueLength = 3

func (r *dynamicRun) requestedAggregates(object model.Object, fields []*ast.Field) []records.Aggregate {
	lookup := aggregatesOf(object)
	var aggregates []records.Aggregate
	for _, field := range fields {
		if aggregate, ok := lookup[field.Name]; ok {
			aggregates = append(aggregates, aggregate)
		}
	}
	return aggregates
}

func (r *dynamicRun) connection(ctx context.Context, object model.Object, scope *records.Filter, args map[string]any, field *ast.Field) (any, error) {
	filter, err := parseFilter(object, objectArg(args, "filter"))
	if err != nil {
		return nil, err
	}
	if scope != nil {
		filter = records.Filter{And: []records.Filter{*scope, filter}}
	}
	order, err := parseOrderBy(objectsArg(args, "orderBy"))
	if err != nil {
		return nil, err
	}
	store := r.storeFor(object)
	page, err := store.Find(ctx, filter, order, pageArgs(args))
	if err != nil {
		return nil, err
	}
	children := r.fields(field.SelectionSet)
	var aggregated records.AggregateResult
	if aggregates := r.requestedAggregates(object, children); len(aggregates) > 0 {
		if aggregated, err = store.Aggregate(ctx, filter, aggregates); err != nil {
			return nil, err
		}
	}
	return r.pageValue(ctx, object, page, aggregated, children, nil)
}

func (r *dynamicRun) pageValue(ctx context.Context, object model.Object, page records.Page[map[string]any], aggregated records.AggregateResult, children []*ast.Field, extra map[string]any) (map[string]any, error) {
	result := map[string]any{}
	for _, child := range children {
		switch child.Name {
		case "__typename":
			result[child.Alias] = capitalized(object.NameSingular) + "Connection"
		case "totalCount":
			result[child.Alias] = page.TotalCount
		case "pageInfo":
			info := map[string]any{}
			for _, infoField := range r.fields(child.SelectionSet) {
				switch infoField.Name {
				case "hasNextPage":
					info[infoField.Alias] = page.HasNext
				case "hasPreviousPage":
					info[infoField.Alias] = page.HasPrevious
				case "startCursor":
					info[infoField.Alias] = nilIfEmpty(page.StartCursor)
				case "endCursor":
					info[infoField.Alias] = nilIfEmpty(page.EndCursor)
				case "__typename":
					info[infoField.Alias] = "PageInfo"
				}
			}
			result[child.Alias] = info
		case "edges":
			edges := make([]any, 0, len(page.Records))
			for _, row := range page.Records {
				edge := map[string]any{}
				for _, edgeField := range r.fields(child.SelectionSet) {
					switch edgeField.Name {
					case "cursor":
						edge[edgeField.Alias] = records.Cursor(fmt.Sprint(row["id"]))
					case "node":
						node, err := r.record(ctx, object, row, edgeField.SelectionSet)
						if err != nil {
							return nil, err
						}
						edge[edgeField.Alias] = node
					case "__typename":
						edge[edgeField.Alias] = capitalized(object.NameSingular) + "Edge"
					}
				}
				edges = append(edges, edge)
			}
			result[child.Alias] = edges
		default:
			if value, ok := extra[child.Name]; ok {
				result[child.Alias] = value
			} else if value, ok := aggregated[child.Name]; ok {
				result[child.Alias] = outputValue(model.Field{}, value)
			} else {
				result[child.Alias] = nil
			}
		}
	}
	return result, nil
}

func nilIfEmpty(value string) any {
	if value == "" {
		return nil
	}
	return value
}

func (r *dynamicRun) groupBy(ctx context.Context, object DynamicObject, field *ast.Field, args map[string]any) (any, error) {
	filter, err := parseFilter(object.Object, objectArg(args, "filter"))
	if err != nil {
		return nil, err
	}
	order, err := parseOrderBy(objectsArg(args, "orderBy"))
	if err != nil {
		return nil, err
	}
	by, err := parseGroupBy(objectsArg(args, "groupBy"))
	if err != nil {
		return nil, err
	}
	children := r.fields(field.SelectionSet)
	var perGroup records.PageRequest
	if slices.ContainsFunc(children, func(child *ast.Field) bool { return child.Name == "edges" || child.Name == "pageInfo" }) {
		perGroup.First = recordsPerGroup
	}
	aggregates := append(r.requestedAggregates(object.Object, children), records.Aggregate{Field: "id", Operation: "count"})
	groups, err := object.Store.GroupBy(ctx, filter, by, order, aggregates, perGroup)
	if err != nil {
		return nil, err
	}
	limit := defaultGroups
	if requested := intArg(args, "limit"); requested > 0 {
		limit = requested
	}
	groups = groups[:min(len(groups), limit)]
	connections := make([]any, len(groups))
	for i, group := range groups {
		connections[i], err = r.pageValue(ctx, object.Object, group.Records, group.Aggregates, children, map[string]any{"groupByDimensionValues": group.Key})
		if err != nil {
			return nil, err
		}
	}
	return connections, nil
}

func (r *dynamicRun) findDuplicates(ctx context.Context, object DynamicObject, field *ast.Field, args map[string]any) (any, error) {
	rawIDs, _ := args["ids"].([]any)
	children := r.fields(field.SelectionSet)
	connections := make([]any, 0, len(rawIDs))
	for _, rawID := range rawIDs {
		source, err := object.Store.Get(ctx, fmt.Sprint(rawID))
		if err != nil {
			return nil, err
		}
		page := records.Page[map[string]any]{}
		if matches := duplicateMatches(object, source); len(matches) > 0 {
			sourceID := records.FieldFilter{Field: "id", Operand: "neq", Value: fmt.Sprint(rawID)}
			filter := records.Filter{And: []records.Filter{{Or: matches}, {Field: &sourceID}}}
			if page, err = object.Store.Find(ctx, filter, nil, records.PageRequest{First: 60}); err != nil {
				return nil, err
			}
		}
		connection, err := r.pageValue(ctx, object.Object, page, nil, children, nil)
		if err != nil {
			return nil, err
		}
		connections = append(connections, connection)
	}
	return connections, nil
}

func duplicateMatches(object DynamicObject, source map[string]any) []records.Filter {
	var matches []records.Filter
	for _, criteria := range object.DuplicateCriteria {
		var all []records.Filter
		for _, column := range criteria {
			value, _ := source[column].(string)
			name, subField, ok := fieldOfColumn(object.Object, column)
			if !ok || len(value) < minDuplicateValueLength {
				all = nil
				break
			}
			all = append(all, records.Filter{Field: &records.FieldFilter{Field: name, SubField: subField, Operand: "eq", Value: value}})
		}
		if len(all) > 0 {
			matches = append(matches, records.Filter{And: all})
		}
	}
	return matches
}

func fieldOfColumn(object model.Object, column string) (string, string, bool) {
	for _, field := range object.Fields {
		for _, candidate := range field.Columns {
			if candidate.Name == column {
				return field.Name, candidate.SubField, true
			}
		}
	}
	return "", "", false
}

func (r *dynamicRun) record(ctx context.Context, object model.Object, row map[string]any, set ast.SelectionSet) (any, error) {
	if row == nil {
		return nil, nil
	}
	result := map[string]any{}
	for _, selected := range r.fields(set) {
		value, err := r.recordField(ctx, object, row, selected)
		if err != nil {
			return nil, err
		}
		result[selected.Alias] = value
	}
	return result, nil
}

func (r *dynamicRun) recordField(ctx context.Context, object model.Object, row map[string]any, selected *ast.Field) (any, error) {
	if selected.Name == "__typename" {
		return capitalized(object.NameSingular), nil
	}
	field := fieldNamed(object, selected.Name)
	if field == nil {
		if value, ok := row[selected.Name]; ok && slices.ContainsFunc(object.Fields, func(other model.Field) bool {
			return len(other.Columns) == 1 && other.Columns[0].Name == selected.Name
		}) {
			return value, nil
		}
		return nil, fmt.Errorf("%w: %s on %s", records.ErrUnknownField, selected.Name, object.NameSingular)
	}
	switch {
	case field.Type == model.TypeTSVector:
		return nil, nil
	case field.Type == model.TypeRelation || field.Type == model.TypeMorph:
		return r.relation(ctx, object, *field, row, selected)
	case isScalarField(field):
		return outputValue(*field, row[field.Columns[0].Name]), nil
	case len(field.Columns) == 0:
		return nil, fmt.Errorf("%w: %s on %s has no column", records.ErrUnknownField, selected.Name, object.NameSingular)
	}
	composite := map[string]any{}
	for _, part := range r.fields(selected.SelectionSet) {
		if part.Name == "__typename" {
			typename, ok := compositeTypenames[field.Type]
			if !ok {
				typename = capitalized(field.Name)
			}
			composite[part.Alias] = typename
			continue
		}
		column, ok := columnOf(field, part.Name)
		if !ok {
			return nil, fmt.Errorf("%w: %s.%s on %s", records.ErrUnknownField, selected.Name, part.Name, object.NameSingular)
		}
		composite[part.Alias] = row[column]
	}
	return composite, nil
}

func (r *dynamicRun) relation(ctx context.Context, object model.Object, field model.Field, row map[string]any, selected *ast.Field) (any, error) {
	if len(field.Columns) == 1 {
		id := row[field.Columns[0].Name]
		if len(selected.SelectionSet) == 0 || id == nil {
			return id, nil
		}
		target, ok := relationTarget(field.Name)
		if !ok {
			return nil, fmt.Errorf("%w: relation %s.%s has no known target object", records.ErrUnknownField, object.NameSingular, field.Name)
		}
		related, err := r.storeFor(target).Get(ctx, fmt.Sprint(id))
		if err != nil {
			return nil, err
		}
		return r.record(ctx, target, related, selected.SelectionSet)
	}
	for _, target := range model.Objects {
		if target.NamePlural != field.Name {
			continue
		}
		for _, back := range target.Fields {
			if owner, ok := relationTarget(back.Name); ok && owner.NameSingular == object.NameSingular && back.Type == model.TypeRelation && isScalarField(&back) {
				scope := records.Filter{Field: &records.FieldFilter{Field: back.Name, Operand: "eq", Value: row["id"]}}
				args, err := r.args(selected)
				if err != nil {
					return nil, err
				}
				return r.connection(ctx, target, &scope, args, selected)
			}
		}
	}
	return nil, fmt.Errorf("%w: relation %s.%s is not served by the Go record resolver", records.ErrUnknownField, object.NameSingular, field.Name)
}
