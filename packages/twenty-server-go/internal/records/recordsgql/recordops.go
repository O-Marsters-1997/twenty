package recordsgql

import (
	"context"
	"fmt"
	"slices"

	"github.com/twentyhq/twenty/packages/twenty-server-go/internal/auth"
	"github.com/twentyhq/twenty/packages/twenty-server-go/internal/model"
	"github.com/twentyhq/twenty/packages/twenty-server-go/internal/records"
)

const bulkPageSize = 200

type recordStore[TRecord, TInput any] interface {
	Find(ctx context.Context, filter records.Filter, orderBy []records.OrderBy, page records.PageRequest) (records.Page[TRecord], error)
	Get(ctx context.Context, id string) (TRecord, error)
	Create(ctx context.Context, actor records.Actor, input TInput) (TRecord, error)
	Update(ctx context.Context, actor records.Actor, id string, input TInput) (TRecord, error)
	SoftDelete(ctx context.Context, id string) error
	Restore(ctx context.Context, id string) error
	Destroy(ctx context.Context, id string) error
	Aggregate(ctx context.Context, filter records.Filter, aggregates []records.Aggregate) (records.AggregateResult, error)
	GroupBy(ctx context.Context, filter records.Filter, groupBy []records.GroupBy, orderBy []records.OrderBy, aggregates []records.Aggregate, perGroup records.PageRequest) ([]records.Group[TRecord], error)
}

type objectOps[TRecord, TInput, TModel any] struct {
	store  recordStore[TRecord, TInput]
	object model.Object
	id     func(TRecord) string
	model  func(TRecord) *TModel
}

func newObjectOps[TRecord, TInput, TModel any](store recordStore[TRecord, TInput], nameSingular string, id func(TRecord) string, toModel func(TRecord) *TModel) objectOps[TRecord, TInput, TModel] {
	index := slices.IndexFunc(model.Objects, func(object model.Object) bool { return object.NameSingular == nameSingular })
	if index < 0 {
		panic("object model has no " + nameSingular + " object")
	}
	return objectOps[TRecord, TInput, TModel]{store: store, object: model.Objects[index], id: id, model: toModel}
}

func actorFrom(ctx context.Context) (records.Actor, error) {
	principal, ok := auth.PrincipalFrom(ctx)
	if !ok {
		return records.Actor{}, auth.ErrUnauthenticated
	}
	return records.Actor{Source: "MANUAL", WorkspaceMemberID: principal.WorkspaceMemberID}, nil
}

func (o objectOps[TRecord, TInput, TModel]) matching(ctx context.Context, filter map[string]any) ([]TRecord, error) {
	parsed, err := parseFilter(o.object, filter)
	if err != nil {
		return nil, err
	}
	var all []TRecord
	after := ""
	for {
		page, err := o.store.Find(ctx, parsed, nil, records.PageRequest{First: bulkPageSize, After: after})
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

func (o objectOps[TRecord, TInput, TModel]) each(ctx context.Context, filter map[string]any, run func(TRecord) (*TModel, error)) ([]*TModel, error) {
	matched, err := o.matching(ctx, filter)
	if err != nil {
		return nil, err
	}
	results := make([]*TModel, 0, len(matched))
	for _, record := range matched {
		result, err := run(record)
		if err != nil {
			return nil, err
		}
		results = append(results, result)
	}
	return results, nil
}

func (o objectOps[TRecord, TInput, TModel]) create(ctx context.Context, input TInput) (*TModel, error) {
	actor, err := actorFrom(ctx)
	if err != nil {
		return nil, err
	}
	created, err := o.store.Create(ctx, actor, input)
	if err != nil {
		return nil, err
	}
	return o.model(created), nil
}

func (o objectOps[TRecord, TInput, TModel]) update(ctx context.Context, id string, input TInput) (*TModel, error) {
	actor, err := actorFrom(ctx)
	if err != nil {
		return nil, err
	}
	updated, err := o.store.Update(ctx, actor, id, input)
	if err != nil {
		return nil, err
	}
	return o.model(updated), nil
}

func (o objectOps[TRecord, TInput, TModel]) updateMatching(ctx context.Context, filter map[string]any, input TInput) ([]*TModel, error) {
	return o.each(ctx, filter, func(record TRecord) (*TModel, error) { return o.update(ctx, o.id(record), input) })
}

func (o objectOps[TRecord, TInput, TModel]) delete(ctx context.Context, id string) (*TModel, error) {
	if err := o.store.SoftDelete(ctx, id); err != nil {
		return nil, err
	}
	deleted, err := o.store.Get(ctx, id)
	if err != nil {
		return nil, err
	}
	return o.model(deleted), nil
}

func (o objectOps[TRecord, TInput, TModel]) deleteMatching(ctx context.Context, filter map[string]any) ([]*TModel, error) {
	return o.each(ctx, filter, func(record TRecord) (*TModel, error) { return o.delete(ctx, o.id(record)) })
}

func (o objectOps[TRecord, TInput, TModel]) destroy(ctx context.Context, id string) (*TModel, error) {
	existing, err := o.store.Get(ctx, id)
	if err != nil {
		return nil, err
	}
	if err := o.store.Destroy(ctx, id); err != nil {
		return nil, err
	}
	return o.model(existing), nil
}

func (o objectOps[TRecord, TInput, TModel]) destroyMatching(ctx context.Context, filter map[string]any) ([]*TModel, error) {
	return o.each(ctx, filter, func(record TRecord) (*TModel, error) { return o.destroy(ctx, o.id(record)) })
}

func (o objectOps[TRecord, TInput, TModel]) restoreMatching(ctx context.Context, filter map[string]any) ([]*TModel, error) {
	return o.each(ctx, filter, func(record TRecord) (*TModel, error) {
		if err := o.store.Restore(ctx, o.id(record)); err != nil {
			return nil, err
		}
		restored, err := o.store.Get(ctx, o.id(record))
		if err != nil {
			return nil, err
		}
		return o.model(restored), nil
	})
}

func (o objectOps[TRecord, TInput, TModel]) one(ctx context.Context, filter map[string]any) (*TModel, error) {
	parsed, err := parseFilter(o.object, filter)
	if err != nil {
		return nil, err
	}
	page, err := o.store.Find(ctx, parsed, nil, records.PageRequest{First: 1})
	if err != nil {
		return nil, fmt.Errorf("find %s: %w", o.object.NameSingular, err)
	}
	if len(page.Records) == 0 {
		return nil, nil
	}
	return o.model(page.Records[0]), nil
}

func (o objectOps[TRecord, TInput, TModel]) find(ctx context.Context, filter map[string]any, orderBy []map[string]any, first, last *int, after, before *string) (records.Page[TRecord], records.Filter, error) {
	parsed, err := parseFilter(o.object, filter)
	if err != nil {
		return records.Page[TRecord]{}, records.Filter{}, err
	}
	request := records.PageRequest{After: deref(after), Before: deref(before)}
	if first != nil {
		request.First = *first
	}
	if last != nil {
		request.Last = *last
	}
	order, err := parseOrderBy(orderBy)
	if err != nil {
		return records.Page[TRecord]{}, records.Filter{}, err
	}
	page, err := o.store.Find(ctx, parsed, order, request)
	return page, parsed, err
}

func (o objectOps[TRecord, TInput, TModel]) fillRequestedAggregates(ctx context.Context, filter records.Filter, connection any) error {
	aggregates := requestedAggregates(ctx)
	if len(aggregates) == 0 {
		return nil
	}
	result, err := o.store.Aggregate(ctx, filter, aggregates)
	if err != nil {
		return err
	}
	fillAggregates(connection, result)
	return nil
}

func (o objectOps[TRecord, TInput, TModel]) groups(ctx context.Context, groupBy []map[string]any, filter map[string]any, orderBy []map[string]any, limit *int) ([]records.Group[TRecord], error) {
	parsed, err := parseFilter(o.object, filter)
	if err != nil {
		return nil, err
	}
	order, err := parseOrderBy(orderBy)
	if err != nil {
		return nil, err
	}
	by, err := parseGroupBy(groupBy)
	if err != nil {
		return nil, err
	}
	var perGroup records.PageRequest
	if selects(ctx, "edges", "pageInfo") {
		perGroup.First = recordsPerGroup
	}
	aggregates := append(requestedAggregates(ctx), records.Aggregate{Field: "id", Operation: "count"})
	groups, err := o.store.GroupBy(ctx, parsed, by, order, aggregates, perGroup)
	if err != nil {
		return nil, err
	}
	maxGroups := defaultGroups
	if limit != nil && *limit > 0 {
		maxGroups = *limit
	}
	return groups[:min(len(groups), maxGroups)], nil
}

func edgesOf[TRecord, TEdge any](page records.Page[TRecord], newEdge func(TRecord, string) *TEdge, id func(TRecord) string) ([]*TEdge, *PageInfo) {
	edges := make([]*TEdge, len(page.Records))
	for i, record := range page.Records {
		edges[i] = newEdge(record, records.Cursor(id(record)))
	}
	pageInfo := &PageInfo{HasNextPage: page.HasNext, HasPreviousPage: page.HasPrevious}
	if len(page.Records) > 0 {
		pageInfo.StartCursor, pageInfo.EndCursor = &page.StartCursor, &page.EndCursor
	}
	return edges, pageInfo
}
