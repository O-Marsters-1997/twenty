package recordsgql

import (
	"context"

	"github.com/twentyhq/twenty/packages/twenty-server-go/internal/records"
)

func (r *Resolver) workspaceMembers() collection[records.WorkspaceMember, WorkspaceMember] {
	return collection[records.WorkspaceMember, WorkspaceMember]{object: objectNamed("workspaceMember"), store: r.WorkspaceMembers, node: toWorkspaceMember, id: func(record records.WorkspaceMember) string { return record.ID }}
}

func (r *mutationResolver) CreateWorkspaceMember(ctx context.Context, data *WorkspaceMemberCreateInput) (*WorkspaceMember, error) {
	actor, err := r.actor(ctx)
	if err != nil {
		return nil, err
	}
	created, err := r.WorkspaceMembers.Create(ctx, actor, workspaceMemberInputOf(data))
	if err != nil {
		return nil, err
	}
	return toWorkspaceMember(created), nil
}

func (r *mutationResolver) CreateWorkspaceMembers(ctx context.Context, data []*WorkspaceMemberCreateInput, _ *bool) ([]*WorkspaceMember, error) {
	return createEach(data, func(item *WorkspaceMemberCreateInput) (*WorkspaceMember, error) {
		return r.CreateWorkspaceMember(ctx, item)
	})
}

func (r *mutationResolver) UpdateWorkspaceMember(ctx context.Context, id string, data WorkspaceMemberUpdateInput) (*WorkspaceMember, error) {
	actor, err := r.actor(ctx)
	if err != nil {
		return nil, err
	}
	updated, err := r.WorkspaceMembers.Update(ctx, actor, id, workspaceMemberUpdateInputOf(data))
	if err != nil {
		return nil, err
	}
	return toWorkspaceMember(updated), nil
}

func (r *mutationResolver) UpdateWorkspaceMembers(ctx context.Context, filter map[string]any, data WorkspaceMemberUpdateInput) ([]*WorkspaceMember, error) {
	return r.workspaceMembers().each(ctx, filter, func(id string) (*WorkspaceMember, error) { return r.UpdateWorkspaceMember(ctx, id, data) })
}

func (r *mutationResolver) DeleteWorkspaceMember(ctx context.Context, id string) (*WorkspaceMember, error) {
	return r.workspaceMembers().softDelete(ctx, id)
}

func (r *mutationResolver) DeleteWorkspaceMembers(ctx context.Context, filter map[string]any) ([]*WorkspaceMember, error) {
	return r.workspaceMembers().each(ctx, filter, func(id string) (*WorkspaceMember, error) { return r.workspaceMembers().softDelete(ctx, id) })
}

func (r *mutationResolver) DestroyWorkspaceMember(ctx context.Context, id string) (*WorkspaceMember, error) {
	return r.workspaceMembers().destroy(ctx, id)
}

func (r *mutationResolver) DestroyWorkspaceMembers(ctx context.Context, filter map[string]any) ([]*WorkspaceMember, error) {
	return r.workspaceMembers().each(ctx, filter, func(id string) (*WorkspaceMember, error) { return r.workspaceMembers().destroy(ctx, id) })
}

func (r *mutationResolver) RestoreWorkspaceMembers(ctx context.Context, filter map[string]any) ([]*WorkspaceMember, error) {
	return r.workspaceMembers().each(ctx, filter, func(id string) (*WorkspaceMember, error) { return r.workspaceMembers().restore(ctx, id) })
}

func (r *queryResolver) WorkspaceMembers(ctx context.Context, filter map[string]any, orderBy []map[string]any, first, last *int, after, before *string, _ *int) (*WorkspaceMemberConnection, error) {
	page, aggregates, err := r.workspaceMembers().list(ctx, filter, orderBy, first, last, after, before)
	if err != nil {
		return nil, err
	}
	connection := &WorkspaceMemberConnection{TotalCount: &page.TotalCount}
	connection.Edges, connection.PageInfo = pageEdges(page, workspaceMemberEdge)
	fillAggregates(connection, aggregates)
	return connection, nil
}

func (r *queryResolver) WorkspaceMember(ctx context.Context, filter map[string]any) (*WorkspaceMember, error) {
	return r.workspaceMembers().first(ctx, filter)
}

func (r *queryResolver) WorkspaceMembersGroupBy(ctx context.Context, groupBy []map[string]any, filter map[string]any, orderBy []map[string]any, _ []map[string]any, _ *string, limit *int, _ *int) ([]*WorkspaceMemberGroupByConnection, error) {
	groups, err := r.workspaceMembers().groups(ctx, groupBy, filter, orderBy, limit)
	if err != nil {
		return nil, err
	}
	connections := make([]*WorkspaceMemberGroupByConnection, len(groups))
	for i, group := range groups {
		connection := &WorkspaceMemberGroupByConnection{GroupByDimensionValues: group.Key}
		connection.Edges, connection.PageInfo = pageEdges(group.Records, workspaceMemberEdge)
		fillAggregates(connection, group.Aggregates)
		connections[i] = connection
	}
	return connections, nil
}
