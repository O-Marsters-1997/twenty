package recordsgql

import (
	"context"
	"slices"

	"github.com/twentyhq/twenty/packages/twenty-server-go/internal/model"
	"github.com/twentyhq/twenty/packages/twenty-server-go/internal/records"
)

type collection[TRecord any] interface {
	Find(ctx context.Context, filter records.Filter, orderBy []records.OrderBy, page records.PageRequest) (records.Page[TRecord], error)
	Aggregate(ctx context.Context, filter records.Filter, aggregates []records.Aggregate) (records.AggregateResult, error)
	GroupBy(ctx context.Context, filter records.Filter, groupBy []records.GroupBy, orderBy []records.OrderBy, aggregates []records.Aggregate, perGroup records.PageRequest) ([]records.Group[TRecord], error)
}

func objectNamed(nameSingular string) model.Object {
	return model.Objects[slices.IndexFunc(model.Objects, func(object model.Object) bool { return object.NameSingular == nameSingular })]
}

func listRecords[TRecord any](ctx context.Context, store collection[TRecord], object model.Object, filter map[string]any, orderBy []map[string]any, first, last *int, after, before *string) (records.Page[TRecord], records.AggregateResult, error) {
	parsed, err := parseFilter(object, filter)
	if err != nil {
		return records.Page[TRecord]{}, nil, err
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
		return records.Page[TRecord]{}, nil, err
	}
	page, err := store.Find(ctx, parsed, order, request)
	if err != nil {
		return records.Page[TRecord]{}, nil, err
	}
	aggregates := requestedAggregates(ctx)
	if len(aggregates) == 0 {
		return page, nil, nil
	}
	result, err := store.Aggregate(ctx, parsed, aggregates)
	return page, result, err
}

func findOneRecord[TRecord any](ctx context.Context, store collection[TRecord], object model.Object, filter map[string]any) (*TRecord, error) {
	parsed, err := parseFilter(object, filter)
	if err != nil {
		return nil, err
	}
	page, err := store.Find(ctx, parsed, nil, records.PageRequest{First: 1})
	if err != nil || len(page.Records) == 0 {
		return nil, err
	}
	return &page.Records[0], nil
}

func groupRecords[TRecord any](ctx context.Context, store collection[TRecord], object model.Object, groupBy []map[string]any, filter map[string]any, orderBy []map[string]any, limit *int) ([]records.Group[TRecord], error) {
	parsed, err := parseFilter(object, filter)
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
	groups, err := store.GroupBy(ctx, parsed, by, order, aggregates, perGroup)
	if err != nil {
		return nil, err
	}
	maxGroups := defaultGroups
	if limit != nil && *limit > 0 {
		maxGroups = *limit
	}
	return groups[:min(len(groups), maxGroups)], nil
}

func pageInfoOf[TRecord any](page records.Page[TRecord]) *PageInfo {
	pageInfo := &PageInfo{HasNextPage: page.HasNext, HasPreviousPage: page.HasPrevious}
	if len(page.Records) > 0 {
		pageInfo.StartCursor, pageInfo.EndCursor = &page.StartCursor, &page.EndCursor
	}
	return pageInfo
}
