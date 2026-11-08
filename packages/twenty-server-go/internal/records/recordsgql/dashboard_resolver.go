package recordsgql

import (
	"context"

	"github.com/twentyhq/twenty/packages/twenty-server-go/internal/records"
)

func (r *Resolver) dashboards() collection[records.Dashboard, Dashboard] {
	return collection[records.Dashboard, Dashboard]{object: objectNamed("dashboard"), store: r.Dashboards, node: toDashboard, id: func(record records.Dashboard) string { return record.ID }}
}

func (r *mutationResolver) CreateDashboard(ctx context.Context, data *DashboardCreateInput) (*Dashboard, error) {
	actor, err := r.actor(ctx)
	if err != nil {
		return nil, err
	}
	created, err := r.Dashboards.Create(ctx, actor, dashboardInputOf(data))
	if err != nil {
		return nil, err
	}
	return toDashboard(created), nil
}

func (r *mutationResolver) CreateDashboards(ctx context.Context, data []*DashboardCreateInput, _ *bool) ([]*Dashboard, error) {
	return createEach(data, func(item *DashboardCreateInput) (*Dashboard, error) { return r.CreateDashboard(ctx, item) })
}

func (r *mutationResolver) UpdateDashboard(ctx context.Context, id string, data DashboardUpdateInput) (*Dashboard, error) {
	actor, err := r.actor(ctx)
	if err != nil {
		return nil, err
	}
	updated, err := r.Dashboards.Update(ctx, actor, id, dashboardUpdateInputOf(data))
	if err != nil {
		return nil, err
	}
	return toDashboard(updated), nil
}

func (r *mutationResolver) UpdateDashboards(ctx context.Context, filter map[string]any, data DashboardUpdateInput) ([]*Dashboard, error) {
	return r.dashboards().each(ctx, filter, func(id string) (*Dashboard, error) { return r.UpdateDashboard(ctx, id, data) })
}

func (r *mutationResolver) DeleteDashboard(ctx context.Context, id string) (*Dashboard, error) {
	return r.dashboards().softDelete(ctx, id)
}

func (r *mutationResolver) DeleteDashboards(ctx context.Context, filter map[string]any) ([]*Dashboard, error) {
	return r.dashboards().each(ctx, filter, func(id string) (*Dashboard, error) { return r.dashboards().softDelete(ctx, id) })
}

func (r *mutationResolver) DestroyDashboard(ctx context.Context, id string) (*Dashboard, error) {
	return r.dashboards().destroy(ctx, id)
}

func (r *mutationResolver) DestroyDashboards(ctx context.Context, filter map[string]any) ([]*Dashboard, error) {
	return r.dashboards().each(ctx, filter, func(id string) (*Dashboard, error) { return r.dashboards().destroy(ctx, id) })
}

func (r *mutationResolver) RestoreDashboards(ctx context.Context, filter map[string]any) ([]*Dashboard, error) {
	return r.dashboards().each(ctx, filter, func(id string) (*Dashboard, error) { return r.dashboards().restore(ctx, id) })
}

func (r *queryResolver) Dashboards(ctx context.Context, filter map[string]any, orderBy []map[string]any, first, last *int, after, before *string, _ *int) (*DashboardConnection, error) {
	page, aggregates, err := r.dashboards().list(ctx, filter, orderBy, first, last, after, before)
	if err != nil {
		return nil, err
	}
	connection := &DashboardConnection{TotalCount: &page.TotalCount}
	connection.Edges, connection.PageInfo = pageEdges(page, dashboardEdge)
	fillAggregates(connection, aggregates)
	return connection, nil
}

func (r *queryResolver) Dashboard(ctx context.Context, filter map[string]any) (*Dashboard, error) {
	return r.dashboards().first(ctx, filter)
}

func (r *queryResolver) DashboardsGroupBy(ctx context.Context, groupBy []map[string]any, filter map[string]any, orderBy []map[string]any, _ []map[string]any, _ *string, limit *int, _ *int) ([]*DashboardGroupByConnection, error) {
	groups, err := r.dashboards().groups(ctx, groupBy, filter, orderBy, limit)
	if err != nil {
		return nil, err
	}
	connections := make([]*DashboardGroupByConnection, len(groups))
	for i, group := range groups {
		connection := &DashboardGroupByConnection{GroupByDimensionValues: group.Key}
		connection.Edges, connection.PageInfo = pageEdges(group.Records, dashboardEdge)
		fillAggregates(connection, group.Aggregates)
		connections[i] = connection
	}
	return connections, nil
}
