package recordsgql

import (
	"context"
	"fmt"

	"github.com/vektah/gqlparser/v2/ast"

	"github.com/twentyhq/twenty/packages/twenty-server-go/internal/records"
)

type rootResolver func(ctx context.Context, object DynamicObject, field *ast.Field, args map[string]any) (any, error)

func (r *dynamicRun) root(ctx context.Context, kind ast.Operation, field *ast.Field) (any, error) {
	args, err := r.args(field)
	if err != nil {
		return nil, err
	}
	for _, registered := range r.dynamic.objects {
		singular, plural := registered.Object.NameSingular, registered.Object.NamePlural
		var resolvers map[string]rootResolver
		switch kind {
		case ast.Query:
			resolvers = map[string]rootResolver{
				plural: r.findMany, singular: r.findOne, singular + "Duplicates": r.findDuplicates, plural + "GroupBy": r.groupBy,
			}
		case ast.Mutation:
			resolvers = map[string]rootResolver{
				"create" + capitalized(singular): r.createOne, "create" + capitalized(plural): r.createMany,
				"update" + capitalized(singular): r.updateOne, "update" + capitalized(plural): r.updateMany,
				"delete" + capitalized(singular): r.deleteOne, "delete" + capitalized(plural): r.deleteMany,
				"destroy" + capitalized(singular): r.destroyOne, "destroy" + capitalized(plural): r.destroyMany,
				"restore" + capitalized(singular): r.restoreOne, "restore" + capitalized(plural): r.restoreMany,
				"merge" + capitalized(plural): r.merge,
			}
		default:
			return nil, fmt.Errorf("%w: %s operations are not served here", errBadRequest, kind)
		}
		if resolve, ok := resolvers[field.Name]; ok {
			return resolve(ctx, registered, field, args)
		}
	}
	return nil, fmt.Errorf("%w: unknown field %s", errBadRequest, field.Name)
}

func objectArg(args map[string]any, name string) map[string]any {
	value, _ := args[name].(map[string]any)
	return value
}

func objectsArg(args map[string]any, name string) []map[string]any {
	items, _ := args[name].([]any)
	objects := make([]map[string]any, 0, len(items))
	for _, item := range items {
		if object, ok := item.(map[string]any); ok {
			objects = append(objects, object)
		}
	}
	return objects
}

func stringArg(args map[string]any, name string) string {
	value, _ := args[name].(string)
	return value
}

func intArg(args map[string]any, name string) int {
	switch typed := args[name].(type) {
	case int64:
		return int(typed)
	case float64:
		return int(typed)
	}
	return 0
}

func pageArgs(args map[string]any) records.PageRequest {
	return records.PageRequest{First: intArg(args, "first"), Last: intArg(args, "last"), After: stringArg(args, "after"), Before: stringArg(args, "before")}
}

func (r *dynamicRun) findMany(ctx context.Context, object DynamicObject, field *ast.Field, args map[string]any) (any, error) {
	return r.connection(ctx, object.Object, nil, args, field)
}

func (r *dynamicRun) findOne(ctx context.Context, object DynamicObject, field *ast.Field, args map[string]any) (any, error) {
	filter, err := parseFilter(object.Object, objectArg(args, "filter"))
	if err != nil {
		return nil, err
	}
	page, err := object.Store.Find(ctx, filter, nil, records.PageRequest{First: 1})
	if err != nil || len(page.Records) == 0 {
		return nil, err
	}
	return r.record(ctx, object.Object, page.Records[0], field.SelectionSet)
}

func (r *dynamicRun) matching(ctx context.Context, object DynamicObject, args map[string]any) ([]map[string]any, error) {
	filter, err := parseFilter(object.Object, objectArg(args, "filter"))
	if err != nil {
		return nil, err
	}
	var all []map[string]any
	after := ""
	for {
		page, err := object.Store.Find(ctx, filter, nil, records.PageRequest{First: bulkPageSize, After: after})
		if err != nil {
			return nil, err
		}
		all = append(all, page.Records...)
		if !page.HasNext {
			return all, nil
		}
		after = page.EndCursor
	}
}

func (r *dynamicRun) eachMatching(ctx context.Context, object DynamicObject, field *ast.Field, args map[string]any, run func(id string) (map[string]any, error)) (any, error) {
	matched, err := r.matching(ctx, object, args)
	if err != nil {
		return nil, err
	}
	results := make([]any, 0, len(matched))
	for _, row := range matched {
		changed, err := run(fmt.Sprint(row["id"]))
		if err != nil {
			return nil, err
		}
		projected, err := r.record(ctx, object.Object, changed, field.SelectionSet)
		if err != nil {
			return nil, err
		}
		results = append(results, projected)
	}
	return results, nil
}

func (r *dynamicRun) respond(ctx context.Context, object DynamicObject, field *ast.Field, row map[string]any, err error) (any, error) {
	if err != nil {
		return nil, err
	}
	return r.record(ctx, object.Object, row, field.SelectionSet)
}

func (r *dynamicRun) create(ctx context.Context, object DynamicObject, data map[string]any) (map[string]any, error) {
	actor, err := r.actor(ctx)
	if err != nil {
		return nil, err
	}
	values, err := inputColumns(object.Object, data)
	if err != nil {
		return nil, err
	}
	return object.Store.Create(ctx, actor, values)
}

func (r *dynamicRun) update(ctx context.Context, object DynamicObject, id string, data map[string]any) (map[string]any, error) {
	actor, err := r.actor(ctx)
	if err != nil {
		return nil, err
	}
	values, err := inputColumns(object.Object, data)
	if err != nil {
		return nil, err
	}
	return object.Store.Update(ctx, actor, id, values)
}

func (r *dynamicRun) softDelete(ctx context.Context, object DynamicObject, id string) (map[string]any, error) {
	if err := object.Store.SoftDelete(ctx, id); err != nil {
		return nil, err
	}
	return object.Store.Get(ctx, id)
}

func (r *dynamicRun) restore(ctx context.Context, object DynamicObject, id string) (map[string]any, error) {
	if err := object.Store.Restore(ctx, id); err != nil {
		return nil, err
	}
	return object.Store.Get(ctx, id)
}

func (r *dynamicRun) destroy(ctx context.Context, object DynamicObject, id string) (map[string]any, error) {
	existing, err := object.Store.Get(ctx, id)
	if err != nil {
		return nil, err
	}
	return existing, object.Store.Destroy(ctx, id)
}

func (r *dynamicRun) createOne(ctx context.Context, object DynamicObject, field *ast.Field, args map[string]any) (any, error) {
	created, err := r.create(ctx, object, objectArg(args, "data"))
	return r.respond(ctx, object, field, created, err)
}

func (r *dynamicRun) createMany(ctx context.Context, object DynamicObject, field *ast.Field, args map[string]any) (any, error) {
	items := objectsArg(args, "data")
	results := make([]any, 0, len(items))
	for _, item := range items {
		created, err := r.create(ctx, object, item)
		projected, err := r.respond(ctx, object, field, created, err)
		if err != nil {
			return nil, err
		}
		results = append(results, projected)
	}
	return results, nil
}

func (r *dynamicRun) updateOne(ctx context.Context, object DynamicObject, field *ast.Field, args map[string]any) (any, error) {
	updated, err := r.update(ctx, object, stringArg(args, "id"), objectArg(args, "data"))
	return r.respond(ctx, object, field, updated, err)
}

func (r *dynamicRun) updateMany(ctx context.Context, object DynamicObject, field *ast.Field, args map[string]any) (any, error) {
	return r.eachMatching(ctx, object, field, args, func(id string) (map[string]any, error) {
		return r.update(ctx, object, id, objectArg(args, "data"))
	})
}

func (r *dynamicRun) deleteOne(ctx context.Context, object DynamicObject, field *ast.Field, args map[string]any) (any, error) {
	deleted, err := r.softDelete(ctx, object, stringArg(args, "id"))
	return r.respond(ctx, object, field, deleted, err)
}

func (r *dynamicRun) deleteMany(ctx context.Context, object DynamicObject, field *ast.Field, args map[string]any) (any, error) {
	return r.eachMatching(ctx, object, field, args, func(id string) (map[string]any, error) { return r.softDelete(ctx, object, id) })
}

func (r *dynamicRun) destroyOne(ctx context.Context, object DynamicObject, field *ast.Field, args map[string]any) (any, error) {
	destroyed, err := r.destroy(ctx, object, stringArg(args, "id"))
	return r.respond(ctx, object, field, destroyed, err)
}

func (r *dynamicRun) destroyMany(ctx context.Context, object DynamicObject, field *ast.Field, args map[string]any) (any, error) {
	return r.eachMatching(ctx, object, field, args, func(id string) (map[string]any, error) { return r.destroy(ctx, object, id) })
}

func (r *dynamicRun) restoreOne(ctx context.Context, object DynamicObject, field *ast.Field, args map[string]any) (any, error) {
	restored, err := r.restore(ctx, object, stringArg(args, "id"))
	return r.respond(ctx, object, field, restored, err)
}

func (r *dynamicRun) restoreMany(ctx context.Context, object DynamicObject, field *ast.Field, args map[string]any) (any, error) {
	return r.eachMatching(ctx, object, field, args, func(id string) (map[string]any, error) { return r.restore(ctx, object, id) })
}

func (r *dynamicRun) merge(ctx context.Context, object DynamicObject, field *ast.Field, args map[string]any) (any, error) {
	actor, err := r.actor(ctx)
	if err != nil {
		return nil, err
	}
	rawIDs, _ := args["ids"].([]any)
	ids := make([]string, len(rawIDs))
	for i, id := range rawIDs {
		ids[i] = fmt.Sprint(id)
	}
	dryRun, _ := args["dryRun"].(bool)
	merged, err := object.Store.Merge(ctx, actor, ids, intArg(args, "conflictPriorityIndex"), dryRun)
	return r.respond(ctx, object, field, merged, err)
}
