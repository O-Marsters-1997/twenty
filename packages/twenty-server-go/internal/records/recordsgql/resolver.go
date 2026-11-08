package recordsgql

import (
	"context"
	"fmt"

	"github.com/twentyhq/twenty/packages/twenty-server-go/internal/auth"
	"github.com/twentyhq/twenty/packages/twenty-server-go/internal/records"
)

const bulkPageSize = 200

type Resolver struct {
	Store            records.People
	Companies        records.Companies
	Opportunities    records.Opportunities
	WorkspaceMembers records.WorkspaceMembers
	Dashboards       records.Dashboards
	Notes            records.Notes
	NoteTargets      records.NoteTargets
	Tasks            records.Tasks
	TaskTargets      records.TaskTargets
}

func (r *Resolver) actor(ctx context.Context) (records.Actor, error) {
	principal, ok := auth.PrincipalFrom(ctx)
	if !ok {
		return records.Actor{}, auth.ErrUnauthenticated
	}
	return records.Actor{Source: "MANUAL", WorkspaceMemberID: principal.WorkspaceMemberID}, nil
}

func (r *Resolver) matching(ctx context.Context, filter map[string]any) ([]records.Person, error) {
	parsed, err := parseFilter(personObject(), filter)
	if err != nil {
		return nil, err
	}
	var all []records.Person
	after := ""
	for {
		page, err := r.Store.Find(ctx, parsed, nil, records.PageRequest{First: bulkPageSize, After: after})
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

func (r *mutationResolver) CreatePerson(ctx context.Context, data *PersonCreateInput) (*Person, error) {
	if data == nil {
		data = &PersonCreateInput{}
	}
	actor, err := r.actor(ctx)
	if err != nil {
		return nil, err
	}
	created, err := r.Store.Create(ctx, actor, toPersonInput(personInputFields{data.Name, data.Emails, data.LinkedinLink, data.JobTitle, data.Phones, data.CompanyID}))
	if err != nil {
		return nil, err
	}
	return toPerson(created), nil
}

func (r *mutationResolver) CreatePeople(ctx context.Context, data []*PersonCreateInput, _ *bool) ([]*Person, error) {
	created := make([]*Person, 0, len(data))
	for _, item := range data {
		person, err := r.CreatePerson(ctx, item)
		if err != nil {
			return nil, err
		}
		created = append(created, person)
	}
	return created, nil
}

func (r *mutationResolver) update(ctx context.Context, id string, data PersonUpdateInput) (*Person, error) {
	actor, err := r.actor(ctx)
	if err != nil {
		return nil, err
	}
	updated, err := r.Store.Update(ctx, actor, id, toPersonInput(personInputFields{data.Name, data.Emails, data.LinkedinLink, data.JobTitle, data.Phones, data.CompanyID}))
	if err != nil {
		return nil, err
	}
	return toPerson(updated), nil
}

func (r *mutationResolver) UpdatePerson(ctx context.Context, id string, data PersonUpdateInput) (*Person, error) {
	return r.update(ctx, id, data)
}

func (r *mutationResolver) UpdatePeople(ctx context.Context, filter map[string]any, data PersonUpdateInput) ([]*Person, error) {
	return r.each(ctx, filter, func(person records.Person) (*Person, error) { return r.update(ctx, person.ID, data) })
}

func (r *mutationResolver) each(ctx context.Context, filter map[string]any, run func(records.Person) (*Person, error)) ([]*Person, error) {
	matched, err := r.matching(ctx, filter)
	if err != nil {
		return nil, err
	}
	results := make([]*Person, 0, len(matched))
	for _, person := range matched {
		result, err := run(person)
		if err != nil {
			return nil, err
		}
		results = append(results, result)
	}
	return results, nil
}

func (r *mutationResolver) DeletePerson(ctx context.Context, id string) (*Person, error) {
	if err := r.Store.SoftDelete(ctx, id); err != nil {
		return nil, err
	}
	deleted, err := r.Store.Get(ctx, id)
	if err != nil {
		return nil, err
	}
	return toPerson(deleted), nil
}

func (r *mutationResolver) DeletePeople(ctx context.Context, filter map[string]any) ([]*Person, error) {
	return r.each(ctx, filter, func(person records.Person) (*Person, error) { return r.DeletePerson(ctx, person.ID) })
}

func (r *mutationResolver) DestroyPerson(ctx context.Context, id string) (*Person, error) {
	existing, err := r.Store.Get(ctx, id)
	if err != nil {
		return nil, err
	}
	if err := r.Store.Destroy(ctx, id); err != nil {
		return nil, err
	}
	return toPerson(existing), nil
}

func (r *mutationResolver) DestroyPeople(ctx context.Context, filter map[string]any) ([]*Person, error) {
	return r.each(ctx, filter, func(person records.Person) (*Person, error) { return r.DestroyPerson(ctx, person.ID) })
}

func (r *mutationResolver) RestorePeople(ctx context.Context, filter map[string]any) ([]*Person, error) {
	return r.each(ctx, filter, func(person records.Person) (*Person, error) {
		if err := r.Store.Restore(ctx, person.ID); err != nil {
			return nil, err
		}
		restored, err := r.Store.Get(ctx, person.ID)
		if err != nil {
			return nil, err
		}
		return toPerson(restored), nil
	})
}

func (r *queryResolver) People(ctx context.Context, filter map[string]any, orderBy []map[string]any, first, last *int, after, before *string, _ *int) (*PersonConnection, error) {
	parsed, err := parseFilter(personObject(), filter)
	if err != nil {
		return nil, err
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
		return nil, err
	}
	page, err := r.Store.Find(ctx, parsed, order, request)
	if err != nil {
		return nil, err
	}
	connection := &PersonConnection{TotalCount: &page.TotalCount}
	connection.Edges, connection.PageInfo = edgesOf(page)
	if aggregates := requestedAggregates(ctx); len(aggregates) > 0 {
		result, err := r.Store.Aggregate(ctx, parsed, aggregates)
		if err != nil {
			return nil, err
		}
		fillAggregates(connection, result)
	}
	return connection, nil
}

func edgesOf(page records.Page[records.Person]) ([]*PersonEdge, *PageInfo) {
	edges := make([]*PersonEdge, len(page.Records))
	for i, person := range page.Records {
		edges[i] = &PersonEdge{Node: toPerson(person), Cursor: records.Cursor(person.ID)}
	}
	pageInfo := &PageInfo{HasNextPage: page.HasNext, HasPreviousPage: page.HasPrevious}
	if len(page.Records) > 0 {
		pageInfo.StartCursor, pageInfo.EndCursor = &page.StartCursor, &page.EndCursor
	}
	return edges, pageInfo
}

func (r *queryResolver) PeopleGroupBy(ctx context.Context, groupBy []map[string]any, filter map[string]any, orderBy []map[string]any, _ []map[string]any, _ *string, limit *int, _ *int) ([]*PersonGroupByConnection, error) {
	parsed, err := parseFilter(personObject(), filter)
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
	groups, err := r.Store.GroupBy(ctx, parsed, by, order, aggregates, perGroup)
	if err != nil {
		return nil, err
	}
	maxGroups := defaultGroups
	if limit != nil && *limit > 0 {
		maxGroups = *limit
	}
	groups = groups[:min(len(groups), maxGroups)]
	connections := make([]*PersonGroupByConnection, len(groups))
	for i, group := range groups {
		connection := &PersonGroupByConnection{GroupByDimensionValues: group.Key}
		connection.Edges, connection.PageInfo = edgesOf(group.Records)
		fillAggregates(connection, group.Aggregates)
		connections[i] = connection
	}
	return connections, nil
}

func (r *queryResolver) Person(ctx context.Context, filter map[string]any) (*Person, error) {
	parsed, err := parseFilter(personObject(), filter)
	if err != nil {
		return nil, err
	}
	page, err := r.Store.Find(ctx, parsed, nil, records.PageRequest{First: 1})
	if err != nil {
		return nil, fmt.Errorf("find person: %w", err)
	}
	if len(page.Records) == 0 {
		return nil, nil
	}
	return toPerson(page.Records[0]), nil
}

func (r *Resolver) Mutation() MutationResolver { return &mutationResolver{r} }

func (r *Resolver) Query() QueryResolver { return &queryResolver{r} }

type (
	mutationResolver struct{ *Resolver }
	queryResolver    struct{ *Resolver }
)
