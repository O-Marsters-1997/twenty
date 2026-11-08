package recordsgql

import (
	"context"
	"slices"

	"github.com/twentyhq/twenty/packages/twenty-server-go/internal/model"
	"github.com/twentyhq/twenty/packages/twenty-server-go/internal/records"
)

type recordStore[TRecord any] interface {
	Find(ctx context.Context, filter records.Filter, orderBy []records.OrderBy, page records.PageRequest) (records.Page[TRecord], error)
	Get(ctx context.Context, id string) (TRecord, error)
	SoftDelete(ctx context.Context, id string) error
	Restore(ctx context.Context, id string) error
	Destroy(ctx context.Context, id string) error
	Aggregate(ctx context.Context, filter records.Filter, aggregates []records.Aggregate) (records.AggregateResult, error)
	GroupBy(ctx context.Context, filter records.Filter, groupBy []records.GroupBy, orderBy []records.OrderBy, aggregates []records.Aggregate, perGroup records.PageRequest) ([]records.Group[TRecord], error)
}

type collection[TRecord, TNode any] struct {
	object model.Object
	store  recordStore[TRecord]
	node   func(TRecord) *TNode
	id     func(TRecord) string
}

func objectNamed(singular string) model.Object {
	return model.Objects[slices.IndexFunc(model.Objects, func(object model.Object) bool { return object.NameSingular == singular })]
}

func (c collection[TRecord, TNode]) matching(ctx context.Context, filter map[string]any) ([]TRecord, error) {
	parsed, err := parseFilter(c.object, filter)
	if err != nil {
		return nil, err
	}
	var all []TRecord
	after := ""
	for {
		page, err := c.store.Find(ctx, parsed, nil, records.PageRequest{First: bulkPageSize, After: after})
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

func (c collection[TRecord, TNode]) each(ctx context.Context, filter map[string]any, run func(id string) (*TNode, error)) ([]*TNode, error) {
	matched, err := c.matching(ctx, filter)
	if err != nil {
		return nil, err
	}
	results := make([]*TNode, 0, len(matched))
	for _, record := range matched {
		result, err := run(c.id(record))
		if err != nil {
			return nil, err
		}
		results = append(results, result)
	}
	return results, nil
}

func (c collection[TRecord, TNode]) softDelete(ctx context.Context, id string) (*TNode, error) {
	if err := c.store.SoftDelete(ctx, id); err != nil {
		return nil, err
	}
	deleted, err := c.store.Get(ctx, id)
	if err != nil {
		return nil, err
	}
	return c.node(deleted), nil
}

func (c collection[TRecord, TNode]) restore(ctx context.Context, id string) (*TNode, error) {
	if err := c.store.Restore(ctx, id); err != nil {
		return nil, err
	}
	restored, err := c.store.Get(ctx, id)
	if err != nil {
		return nil, err
	}
	return c.node(restored), nil
}

func (c collection[TRecord, TNode]) destroy(ctx context.Context, id string) (*TNode, error) {
	existing, err := c.store.Get(ctx, id)
	if err != nil {
		return nil, err
	}
	if err := c.store.Destroy(ctx, id); err != nil {
		return nil, err
	}
	return c.node(existing), nil
}

func (c collection[TRecord, TNode]) first(ctx context.Context, filter map[string]any) (*TNode, error) {
	parsed, err := parseFilter(c.object, filter)
	if err != nil {
		return nil, err
	}
	page, err := c.store.Find(ctx, parsed, nil, records.PageRequest{First: 1})
	if err != nil || len(page.Records) == 0 {
		return nil, err
	}
	return c.node(page.Records[0]), nil
}

func (c collection[TRecord, TNode]) list(ctx context.Context, filter map[string]any, orderBy []map[string]any, first, last *int, after, before *string) (records.Page[TRecord], records.AggregateResult, error) {
	var none records.Page[TRecord]
	parsed, err := parseFilter(c.object, filter)
	if err != nil {
		return none, nil, err
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
		return none, nil, err
	}
	page, err := c.store.Find(ctx, parsed, order, request)
	if err != nil {
		return none, nil, err
	}
	var aggregated records.AggregateResult
	if aggregates := requestedAggregates(ctx); len(aggregates) > 0 {
		if aggregated, err = c.store.Aggregate(ctx, parsed, aggregates); err != nil {
			return none, nil, err
		}
	}
	return page, aggregated, nil
}

func (c collection[TRecord, TNode]) groups(ctx context.Context, groupBy []map[string]any, filter map[string]any, orderBy []map[string]any, limit *int) ([]records.Group[TRecord], error) {
	parsed, err := parseFilter(c.object, filter)
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
	groups, err := c.store.GroupBy(ctx, parsed, by, order, aggregates, perGroup)
	if err != nil {
		return nil, err
	}
	maxGroups := defaultGroups
	if limit != nil && *limit > 0 {
		maxGroups = *limit
	}
	return groups[:min(len(groups), maxGroups)], nil
}

func pageEdges[TRecord, TEdge any](page records.Page[TRecord], edge func(TRecord) *TEdge) ([]*TEdge, *PageInfo) {
	edges := make([]*TEdge, len(page.Records))
	for i, record := range page.Records {
		edges[i] = edge(record)
	}
	pageInfo := &PageInfo{HasNextPage: page.HasNext, HasPreviousPage: page.HasPrevious}
	if len(page.Records) > 0 {
		pageInfo.StartCursor, pageInfo.EndCursor = &page.StartCursor, &page.EndCursor
	}
	return edges, pageInfo
}

func createEach[TData, TNode any](data []*TData, create func(*TData) (*TNode, error)) ([]*TNode, error) {
	created := make([]*TNode, 0, len(data))
	for _, item := range data {
		node, err := create(item)
		if err != nil {
			return nil, err
		}
		created = append(created, node)
	}
	return created, nil
}
