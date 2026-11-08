package recordsgql

import (
	"context"

	"github.com/twentyhq/twenty/packages/twenty-server-go/internal/records"
)

type Resolver struct {
	people           objectOps[records.Person, records.PersonInput, Person]
	workspaceMembers objectOps[records.WorkspaceMember, records.WorkspaceMemberInput, WorkspaceMember]
	dashboards       objectOps[records.Dashboard, records.DashboardInput, Dashboard]
}

func (r *Resolver) Mutation() MutationResolver { return &mutationResolver{r} }

func (r *Resolver) Query() QueryResolver { return &queryResolver{r} }

type (
	mutationResolver struct{ *Resolver }
	queryResolver    struct{ *Resolver }
)

func createEach[TItem, TInput, TModel any](data []*TItem, toInput func(*TItem) TInput, create func(TInput) (*TModel, error)) ([]*TModel, error) {
	created := make([]*TModel, 0, len(data))
	for _, item := range data {
		model, err := create(toInput(item))
		if err != nil {
			return nil, err
		}
		created = append(created, model)
	}
	return created, nil
}

func (r *mutationResolver) CreatePerson(ctx context.Context, data *PersonCreateInput) (*Person, error) {
	return r.people.create(ctx, personInputOf(data))
}

func (r *mutationResolver) CreatePeople(ctx context.Context, data []*PersonCreateInput, _ *bool) ([]*Person, error) {
	return createEach(data, personInputOf, func(input records.PersonInput) (*Person, error) { return r.people.create(ctx, input) })
}

func (r *mutationResolver) UpdatePerson(ctx context.Context, id string, data PersonUpdateInput) (*Person, error) {
	return r.people.update(ctx, id, personUpdateInputOf(data))
}

func (r *mutationResolver) UpdatePeople(ctx context.Context, filter map[string]any, data PersonUpdateInput) ([]*Person, error) {
	return r.people.updateMatching(ctx, filter, personUpdateInputOf(data))
}

func (r *mutationResolver) DeletePerson(ctx context.Context, id string) (*Person, error) {
	return r.people.delete(ctx, id)
}

func (r *mutationResolver) DeletePeople(ctx context.Context, filter map[string]any) ([]*Person, error) {
	return r.people.deleteMatching(ctx, filter)
}

func (r *mutationResolver) DestroyPerson(ctx context.Context, id string) (*Person, error) {
	return r.people.destroy(ctx, id)
}

func (r *mutationResolver) DestroyPeople(ctx context.Context, filter map[string]any) ([]*Person, error) {
	return r.people.destroyMatching(ctx, filter)
}

func (r *mutationResolver) RestorePeople(ctx context.Context, filter map[string]any) ([]*Person, error) {
	return r.people.restoreMatching(ctx, filter)
}

func (r *queryResolver) People(ctx context.Context, filter map[string]any, orderBy []map[string]any, first, last *int, after, before *string, _ *int) (*PersonConnection, error) {
	page, parsed, err := r.people.find(ctx, filter, orderBy, first, last, after, before)
	if err != nil {
		return nil, err
	}
	connection := &PersonConnection{TotalCount: &page.TotalCount}
	connection.Edges, connection.PageInfo = personEdges(page)
	return connection, r.people.fillRequestedAggregates(ctx, parsed, connection)
}

func (r *queryResolver) PeopleGroupBy(ctx context.Context, groupBy []map[string]any, filter map[string]any, orderBy []map[string]any, _ []map[string]any, _ *string, limit *int, _ *int) ([]*PersonGroupByConnection, error) {
	groups, err := r.people.groups(ctx, groupBy, filter, orderBy, limit)
	if err != nil {
		return nil, err
	}
	connections := make([]*PersonGroupByConnection, len(groups))
	for i, group := range groups {
		connection := &PersonGroupByConnection{GroupByDimensionValues: group.Key}
		connection.Edges, connection.PageInfo = personEdges(group.Records)
		fillAggregates(connection, group.Aggregates)
		connections[i] = connection
	}
	return connections, nil
}

func (r *queryResolver) Person(ctx context.Context, filter map[string]any) (*Person, error) {
	return r.people.one(ctx, filter)
}

func (r *mutationResolver) CreateWorkspaceMember(ctx context.Context, data *WorkspaceMemberCreateInput) (*WorkspaceMember, error) {
	return r.workspaceMembers.create(ctx, workspaceMemberInputOf(data))
}

func (r *mutationResolver) CreateWorkspaceMembers(ctx context.Context, data []*WorkspaceMemberCreateInput, _ *bool) ([]*WorkspaceMember, error) {
	return createEach(data, workspaceMemberInputOf, func(input records.WorkspaceMemberInput) (*WorkspaceMember, error) {
		return r.workspaceMembers.create(ctx, input)
	})
}

func (r *mutationResolver) UpdateWorkspaceMember(ctx context.Context, id string, data WorkspaceMemberUpdateInput) (*WorkspaceMember, error) {
	return r.workspaceMembers.update(ctx, id, workspaceMemberUpdateInputOf(data))
}

func (r *mutationResolver) UpdateWorkspaceMembers(ctx context.Context, filter map[string]any, data WorkspaceMemberUpdateInput) ([]*WorkspaceMember, error) {
	return r.workspaceMembers.updateMatching(ctx, filter, workspaceMemberUpdateInputOf(data))
}

func (r *mutationResolver) DeleteWorkspaceMember(ctx context.Context, id string) (*WorkspaceMember, error) {
	return r.workspaceMembers.delete(ctx, id)
}

func (r *mutationResolver) DeleteWorkspaceMembers(ctx context.Context, filter map[string]any) ([]*WorkspaceMember, error) {
	return r.workspaceMembers.deleteMatching(ctx, filter)
}

func (r *mutationResolver) DestroyWorkspaceMember(ctx context.Context, id string) (*WorkspaceMember, error) {
	return r.workspaceMembers.destroy(ctx, id)
}

func (r *mutationResolver) DestroyWorkspaceMembers(ctx context.Context, filter map[string]any) ([]*WorkspaceMember, error) {
	return r.workspaceMembers.destroyMatching(ctx, filter)
}

func (r *mutationResolver) RestoreWorkspaceMembers(ctx context.Context, filter map[string]any) ([]*WorkspaceMember, error) {
	return r.workspaceMembers.restoreMatching(ctx, filter)
}

func (r *queryResolver) WorkspaceMembers(ctx context.Context, filter map[string]any, orderBy []map[string]any, first, last *int, after, before *string, _ *int) (*WorkspaceMemberConnection, error) {
	page, parsed, err := r.workspaceMembers.find(ctx, filter, orderBy, first, last, after, before)
	if err != nil {
		return nil, err
	}
	connection := &WorkspaceMemberConnection{TotalCount: &page.TotalCount}
	connection.Edges, connection.PageInfo = workspaceMemberEdges(page)
	return connection, r.workspaceMembers.fillRequestedAggregates(ctx, parsed, connection)
}

func (r *queryResolver) WorkspaceMember(ctx context.Context, filter map[string]any) (*WorkspaceMember, error) {
	return r.workspaceMembers.one(ctx, filter)
}

func (r *queryResolver) WorkspaceMembersGroupBy(ctx context.Context, groupBy []map[string]any, filter map[string]any, orderBy []map[string]any, _ []map[string]any, _ *string, limit *int, _ *int) ([]*WorkspaceMemberGroupByConnection, error) {
	groups, err := r.workspaceMembers.groups(ctx, groupBy, filter, orderBy, limit)
	if err != nil {
		return nil, err
	}
	connections := make([]*WorkspaceMemberGroupByConnection, len(groups))
	for i, group := range groups {
		connection := &WorkspaceMemberGroupByConnection{GroupByDimensionValues: group.Key}
		connection.Edges, connection.PageInfo = workspaceMemberEdges(group.Records)
		fillAggregates(connection, group.Aggregates)
		connections[i] = connection
	}
	return connections, nil
}

func (r *mutationResolver) CreateDashboard(ctx context.Context, data *DashboardCreateInput) (*Dashboard, error) {
	return r.dashboards.create(ctx, dashboardInputOf(data))
}

func (r *mutationResolver) CreateDashboards(ctx context.Context, data []*DashboardCreateInput, _ *bool) ([]*Dashboard, error) {
	return createEach(data, dashboardInputOf, func(input records.DashboardInput) (*Dashboard, error) { return r.dashboards.create(ctx, input) })
}

func (r *mutationResolver) UpdateDashboard(ctx context.Context, id string, data DashboardUpdateInput) (*Dashboard, error) {
	return r.dashboards.update(ctx, id, dashboardUpdateInputOf(data))
}

func (r *mutationResolver) UpdateDashboards(ctx context.Context, filter map[string]any, data DashboardUpdateInput) ([]*Dashboard, error) {
	return r.dashboards.updateMatching(ctx, filter, dashboardUpdateInputOf(data))
}

func (r *mutationResolver) DeleteDashboard(ctx context.Context, id string) (*Dashboard, error) {
	return r.dashboards.delete(ctx, id)
}

func (r *mutationResolver) DeleteDashboards(ctx context.Context, filter map[string]any) ([]*Dashboard, error) {
	return r.dashboards.deleteMatching(ctx, filter)
}

func (r *mutationResolver) DestroyDashboard(ctx context.Context, id string) (*Dashboard, error) {
	return r.dashboards.destroy(ctx, id)
}

func (r *mutationResolver) DestroyDashboards(ctx context.Context, filter map[string]any) ([]*Dashboard, error) {
	return r.dashboards.destroyMatching(ctx, filter)
}

func (r *mutationResolver) RestoreDashboards(ctx context.Context, filter map[string]any) ([]*Dashboard, error) {
	return r.dashboards.restoreMatching(ctx, filter)
}

func (r *queryResolver) Dashboards(ctx context.Context, filter map[string]any, orderBy []map[string]any, first, last *int, after, before *string, _ *int) (*DashboardConnection, error) {
	page, parsed, err := r.dashboards.find(ctx, filter, orderBy, first, last, after, before)
	if err != nil {
		return nil, err
	}
	connection := &DashboardConnection{TotalCount: &page.TotalCount}
	connection.Edges, connection.PageInfo = dashboardEdges(page)
	return connection, r.dashboards.fillRequestedAggregates(ctx, parsed, connection)
}

func (r *queryResolver) Dashboard(ctx context.Context, filter map[string]any) (*Dashboard, error) {
	return r.dashboards.one(ctx, filter)
}

func (r *queryResolver) DashboardsGroupBy(ctx context.Context, groupBy []map[string]any, filter map[string]any, orderBy []map[string]any, _ []map[string]any, _ *string, limit *int, _ *int) ([]*DashboardGroupByConnection, error) {
	groups, err := r.dashboards.groups(ctx, groupBy, filter, orderBy, limit)
	if err != nil {
		return nil, err
	}
	connections := make([]*DashboardGroupByConnection, len(groups))
	for i, group := range groups {
		connection := &DashboardGroupByConnection{GroupByDimensionValues: group.Key}
		connection.Edges, connection.PageInfo = dashboardEdges(group.Records)
		fillAggregates(connection, group.Aggregates)
		connections[i] = connection
	}
	return connections, nil
}
