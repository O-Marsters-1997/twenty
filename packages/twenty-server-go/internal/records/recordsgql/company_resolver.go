package recordsgql

import (
	"context"

	"github.com/twentyhq/twenty/packages/twenty-server-go/internal/records"
)

func (r *Resolver) companies() collection[records.Company, Company] {
	return collection[records.Company, Company]{object: objectNamed("company"), store: r.Companies, node: toCompany, id: func(record records.Company) string { return record.ID }}
}

func (r *Resolver) opportunities() collection[records.Opportunity, Opportunity] {
	return collection[records.Opportunity, Opportunity]{object: objectNamed("opportunity"), store: r.Opportunities, node: toOpportunity, id: func(record records.Opportunity) string { return record.ID }}
}

func (r *queryResolver) Companies(ctx context.Context, filter map[string]any, orderBy []map[string]any, first, last *int, after, before *string, _ *int) (*CompanyConnection, error) {
	page, aggregates, err := r.companies().list(ctx, filter, orderBy, first, last, after, before)
	if err != nil {
		return nil, err
	}
	connection := &CompanyConnection{TotalCount: &page.TotalCount}
	connection.Edges, connection.PageInfo = pageEdges(page, companyEdge)
	fillAggregates(connection, aggregates)
	return connection, nil
}

func (r *queryResolver) Company(ctx context.Context, filter map[string]any) (*Company, error) {
	return r.companies().first(ctx, filter)
}

func (r *queryResolver) CompaniesGroupBy(ctx context.Context, groupBy []map[string]any, filter map[string]any, orderBy []map[string]any, _ []map[string]any, _ *string, limit *int, _ *int) ([]*CompanyGroupByConnection, error) {
	groups, err := r.companies().groups(ctx, groupBy, filter, orderBy, limit)
	if err != nil {
		return nil, err
	}
	connections := make([]*CompanyGroupByConnection, len(groups))
	for i, group := range groups {
		connection := &CompanyGroupByConnection{GroupByDimensionValues: group.Key}
		connection.Edges, connection.PageInfo = pageEdges(group.Records, companyEdge)
		fillAggregates(connection, group.Aggregates)
		connections[i] = connection
	}
	return connections, nil
}

func (r *queryResolver) Opportunities(ctx context.Context, filter map[string]any, orderBy []map[string]any, first, last *int, after, before *string, _ *int) (*OpportunityConnection, error) {
	page, aggregates, err := r.opportunities().list(ctx, filter, orderBy, first, last, after, before)
	if err != nil {
		return nil, err
	}
	connection := &OpportunityConnection{TotalCount: &page.TotalCount}
	connection.Edges, connection.PageInfo = pageEdges(page, opportunityEdge)
	fillAggregates(connection, aggregates)
	return connection, nil
}

func (r *queryResolver) Opportunity(ctx context.Context, filter map[string]any) (*Opportunity, error) {
	return r.opportunities().first(ctx, filter)
}

func (r *queryResolver) OpportunitiesGroupBy(ctx context.Context, groupBy []map[string]any, filter map[string]any, orderBy []map[string]any, _ []map[string]any, _ *string, limit *int, _ *int) ([]*OpportunityGroupByConnection, error) {
	groups, err := r.opportunities().groups(ctx, groupBy, filter, orderBy, limit)
	if err != nil {
		return nil, err
	}
	connections := make([]*OpportunityGroupByConnection, len(groups))
	for i, group := range groups {
		connection := &OpportunityGroupByConnection{GroupByDimensionValues: group.Key}
		connection.Edges, connection.PageInfo = pageEdges(group.Records, opportunityEdge)
		fillAggregates(connection, group.Aggregates)
		connections[i] = connection
	}
	return connections, nil
}
