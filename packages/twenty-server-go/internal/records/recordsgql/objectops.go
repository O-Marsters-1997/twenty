package recordsgql

import (
	"context"
	"slices"

	"github.com/twentyhq/twenty/packages/twenty-server-go/internal/model"
	"github.com/twentyhq/twenty/packages/twenty-server-go/internal/records"
)

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

type objectOps[TRecord, TInput any] struct {
	store      recordStore[TRecord, TInput]
	object     model.Object
	aggregates map[string]records.Aggregate
	recordID   func(TRecord) string
}

func newObjectOps[TRecord, TInput any](store recordStore[TRecord, TInput], nameSingular string, recordID func(TRecord) string) *objectOps[TRecord, TInput] {
	index := slices.IndexFunc(model.Objects, func(object model.Object) bool { return object.NameSingular == nameSingular })
	if index < 0 {
		panic("object model has no " + nameSingular + " object")
	}
	object := model.Objects[index]
	return &objectOps[TRecord, TInput]{store: store, object: object, aggregates: aggregatesOf(object), recordID: recordID}
}

func (o *objectOps[TRecord, TInput]) create(ctx context.Context, input TInput) (TRecord, error) {
	actor, err := actorFrom(ctx)
	if err != nil {
		var zero TRecord
		return zero, err
	}
	return o.store.Create(ctx, actor, input)
}

func (o *objectOps[TRecord, TInput]) update(ctx context.Context, id string, input TInput) (TRecord, error) {
	actor, err := actorFrom(ctx)
	if err != nil {
		var zero TRecord
		return zero, err
	}
	return o.store.Update(ctx, actor, id, input)
}

func (o *objectOps[TRecord, TInput]) softDelete(ctx context.Context, id string) (TRecord, error) {
	if err := o.store.SoftDelete(ctx, id); err != nil {
		var zero TRecord
		return zero, err
	}
	return o.store.Get(ctx, id)
}

func (o *objectOps[TRecord, TInput]) destroy(ctx context.Context, id string) (TRecord, error) {
	existing, err := o.store.Get(ctx, id)
	if err != nil {
		return existing, err
	}
	if err := o.store.Destroy(ctx, id); err != nil {
		var zero TRecord
		return zero, err
	}
	return existing, nil
}

func (o *objectOps[TRecord, TInput]) restore(ctx context.Context, id string) (TRecord, error) {
	if err := o.store.Restore(ctx, id); err != nil {
		var zero TRecord
		return zero, err
	}
	return o.store.Get(ctx, id)
}

func (o *objectOps[TRecord, TInput]) createMany(ctx context.Context, inputs []TInput) ([]TRecord, error) {
	created := make([]TRecord, 0, len(inputs))
	for _, input := range inputs {
		record, err := o.create(ctx, input)
		if err != nil {
			return nil, err
		}
		created = append(created, record)
	}
	return created, nil
}

func (o *objectOps[TRecord, TInput]) matching(ctx context.Context, filter map[string]any) ([]TRecord, error) {
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

func (o *objectOps[TRecord, TInput]) each(ctx context.Context, filter map[string]any, run func(context.Context, string) (TRecord, error)) ([]TRecord, error) {
	matched, err := o.matching(ctx, filter)
	if err != nil {
		return nil, err
	}
	results := make([]TRecord, 0, len(matched))
	for _, record := range matched {
		result, err := run(ctx, o.recordID(record))
		if err != nil {
			return nil, err
		}
		results = append(results, result)
	}
	return results, nil
}

func (o *objectOps[TRecord, TInput]) updateMatching(ctx context.Context, filter map[string]any, input TInput) ([]TRecord, error) {
	return o.each(ctx, filter, func(ctx context.Context, id string) (TRecord, error) { return o.update(ctx, id, input) })
}

func (o *objectOps[TRecord, TInput]) find(ctx context.Context, filter map[string]any, orderBy []map[string]any, first, last *int, after, before *string) (records.Page[TRecord], records.Filter, error) {
	parsed, err := parseFilter(o.object, filter)
	if err != nil {
		return records.Page[TRecord]{}, parsed, err
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
		return records.Page[TRecord]{}, parsed, err
	}
	page, err := o.store.Find(ctx, parsed, order, request)
	return page, parsed, err
}

func (o *objectOps[TRecord, TInput]) findFirst(ctx context.Context, filter map[string]any) (*TRecord, error) {
	parsed, err := parseFilter(o.object, filter)
	if err != nil {
		return nil, err
	}
	page, err := o.store.Find(ctx, parsed, nil, records.PageRequest{First: 1})
	if err != nil || len(page.Records) == 0 {
		return nil, err
	}
	return &page.Records[0], nil
}

func (o *objectOps[TRecord, TInput]) fillConnectionAggregates(ctx context.Context, filter records.Filter, connection any) error {
	aggregates := requestedAggregates(ctx, o.aggregates)
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

func (o *objectOps[TRecord, TInput]) groupBy(ctx context.Context, groupBy []map[string]any, filter map[string]any, orderBy []map[string]any, limit *int) ([]records.Group[TRecord], error) {
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
	aggregates := append(requestedAggregates(ctx, o.aggregates), records.Aggregate{Field: "id", Operation: "count"})
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

func edgesFor[TRecord, TEdge any](page records.Page[TRecord], newEdge func(TRecord, string) *TEdge, recordID func(TRecord) string) ([]*TEdge, *PageInfo) {
	edges := make([]*TEdge, len(page.Records))
	for i, record := range page.Records {
		edges[i] = newEdge(record, records.Cursor(recordID(record)))
	}
	pageInfo := &PageInfo{HasNextPage: page.HasNext, HasPreviousPage: page.HasPrevious}
	if len(page.Records) > 0 {
		pageInfo.StartCursor, pageInfo.EndCursor = &page.StartCursor, &page.EndCursor
	}
	return edges, pageInfo
}

func convertAll[TRecord, TNode any](items []TRecord, err error, convert func(TRecord) *TNode) ([]*TNode, error) {
	if err != nil {
		return nil, err
	}
	nodes := make([]*TNode, len(items))
	for i, item := range items {
		nodes[i] = convert(item)
	}
	return nodes, nil
}

func convertOne[TRecord, TNode any](item TRecord, err error, convert func(TRecord) *TNode) (*TNode, error) {
	if err != nil {
		return nil, err
	}
	return convert(item), nil
}
