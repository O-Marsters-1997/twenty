package recordsgql

import (
	"context"
	"encoding/json"
	"fmt"

	"github.com/twentyhq/twenty/packages/twenty-server-go/internal/records"
)

func rawJSON(value any) (json.RawMessage, error) {
	if value == nil {
		return nil, nil
	}
	raw, err := json.Marshal(value)
	if err != nil {
		return nil, fmt.Errorf("encode json input: %w", err)
	}
	return raw, nil
}

func jsonValue(raw json.RawMessage) any {
	if len(raw) == 0 {
		return nil
	}
	return raw
}

func toTimelineActivityInput(in *TimelineActivityCreateInput) (records.TimelineActivityInput, error) {
	if in == nil {
		return records.TimelineActivityInput{}, nil
	}
	snapshot, err := rawJSON(in.TimelineActivityTypeSnapshot)
	if err != nil {
		return records.TimelineActivityInput{}, err
	}
	properties, err := rawJSON(in.Properties)
	if err != nil {
		return records.TimelineActivityInput{}, err
	}
	return records.TimelineActivityInput{
		HappensAt: in.HappensAt, TypeID: in.TimelineActivityTypeID, TypeSnapshot: snapshot, Properties: properties,
		LinkedRecordCachedName: in.LinkedRecordCachedName, LinkedRecordID: in.LinkedRecordID, LinkedObjectMetadataID: in.LinkedObjectMetadataID,
		TargetCompanyID: in.TargetCompanyID, TargetDashboardID: in.TargetDashboardID, TargetMessageCampaignID: in.TargetMessageCampaignID,
		TargetMessageListID: in.TargetMessageListID, TargetNoteID: in.TargetNoteID, TargetOpportunityID: in.TargetOpportunityID,
		TargetPersonID: in.TargetPersonID, TargetTaskID: in.TargetTaskID, TargetWorkflowID: in.TargetWorkflowID,
		TargetWorkflowRunID: in.TargetWorkflowRunID, TargetWorkflowVersionID: in.TargetWorkflowVersionID, WorkspaceMemberID: in.WorkspaceMemberID,
	}, nil
}

func toTimelineActivityUpdateInput(in TimelineActivityUpdateInput) (records.TimelineActivityInput, error) {
	return toTimelineActivityInput(&TimelineActivityCreateInput{
		HappensAt: in.HappensAt, TimelineActivityTypeID: in.TimelineActivityTypeID, TimelineActivityTypeSnapshot: in.TimelineActivityTypeSnapshot,
		Properties: in.Properties, LinkedRecordCachedName: in.LinkedRecordCachedName, LinkedRecordID: in.LinkedRecordID,
		LinkedObjectMetadataID: in.LinkedObjectMetadataID, TargetCompanyID: in.TargetCompanyID, TargetDashboardID: in.TargetDashboardID,
		TargetMessageCampaignID: in.TargetMessageCampaignID, TargetMessageListID: in.TargetMessageListID, TargetNoteID: in.TargetNoteID,
		TargetOpportunityID: in.TargetOpportunityID, TargetPersonID: in.TargetPersonID, TargetTaskID: in.TargetTaskID,
		TargetWorkflowID: in.TargetWorkflowID, TargetWorkflowRunID: in.TargetWorkflowRunID, TargetWorkflowVersionID: in.TargetWorkflowVersionID,
		WorkspaceMemberID: in.WorkspaceMemberID,
	})
}

func toTimelineActivity(activity records.TimelineActivity) *TimelineActivity {
	return &TimelineActivity{
		ID: activity.ID, HappensAt: activity.HappensAt,
		TimelineActivityTypeID: activity.TypeID, TimelineActivityTypeSnapshot: jsonValue(activity.TypeSnapshot), Properties: jsonValue(activity.Properties),
		LinkedRecordCachedName: &activity.LinkedRecordCachedName, LinkedRecordID: activity.LinkedRecordID, LinkedObjectMetadataID: activity.LinkedObjectMetadataID,
		TargetCompanyID: activity.TargetCompanyID, TargetDashboardID: activity.TargetDashboardID, TargetMessageCampaignID: activity.TargetMessageCampaignID,
		TargetMessageListID: activity.TargetMessageListID, TargetNoteID: activity.TargetNoteID, TargetOpportunityID: activity.TargetOpportunityID,
		TargetPersonID: activity.TargetPersonID, TargetTaskID: activity.TargetTaskID, TargetWorkflowID: activity.TargetWorkflowID,
		TargetWorkflowRunID: activity.TargetWorkflowRunID, TargetWorkflowVersionID: activity.TargetWorkflowVersionID, WorkspaceMemberID: activity.WorkspaceMemberID,
		Position: activity.Position, CreatedBy: toActor(activity.CreatedBy), UpdatedBy: toActor(activity.UpdatedBy),
		CreatedAt: activity.CreatedAt, UpdatedAt: activity.UpdatedAt, DeletedAt: activity.DeletedAt,
	}
}

func timelineActivityEdge(activity records.TimelineActivity) *TimelineActivityEdge {
	return &TimelineActivityEdge{Node: toTimelineActivity(activity), Cursor: records.Cursor(activity.ID)}
}

func (r *Resolver) timelineActivities() collection[records.TimelineActivity, TimelineActivity] {
	return collection[records.TimelineActivity, TimelineActivity]{object: objectNamed("timelineActivity"), store: r.TimelineActivities, node: toTimelineActivity, id: func(record records.TimelineActivity) string { return record.ID }}
}

func (r *mutationResolver) CreateTimelineActivity(ctx context.Context, data *TimelineActivityCreateInput) (*TimelineActivity, error) {
	input, err := toTimelineActivityInput(data)
	if err != nil {
		return nil, err
	}
	actor, err := r.actor(ctx)
	if err != nil {
		return nil, err
	}
	created, err := r.TimelineActivities.Create(ctx, actor, input)
	if err != nil {
		return nil, err
	}
	return toTimelineActivity(created), nil
}

func (r *mutationResolver) CreateTimelineActivities(ctx context.Context, data []*TimelineActivityCreateInput, _ *bool) ([]*TimelineActivity, error) {
	return createEach(data, func(item *TimelineActivityCreateInput) (*TimelineActivity, error) {
		return r.CreateTimelineActivity(ctx, item)
	})
}

func (r *mutationResolver) UpdateTimelineActivity(ctx context.Context, id string, data TimelineActivityUpdateInput) (*TimelineActivity, error) {
	input, err := toTimelineActivityUpdateInput(data)
	if err != nil {
		return nil, err
	}
	actor, err := r.actor(ctx)
	if err != nil {
		return nil, err
	}
	updated, err := r.TimelineActivities.Update(ctx, actor, id, input)
	if err != nil {
		return nil, err
	}
	return toTimelineActivity(updated), nil
}

func (r *mutationResolver) UpdateTimelineActivities(ctx context.Context, filter map[string]any, data TimelineActivityUpdateInput) ([]*TimelineActivity, error) {
	return r.timelineActivities().each(ctx, filter, func(id string) (*TimelineActivity, error) { return r.UpdateTimelineActivity(ctx, id, data) })
}

func (r *mutationResolver) DeleteTimelineActivity(ctx context.Context, id string) (*TimelineActivity, error) {
	return r.timelineActivities().softDelete(ctx, id)
}

func (r *mutationResolver) DeleteTimelineActivities(ctx context.Context, filter map[string]any) ([]*TimelineActivity, error) {
	return r.timelineActivities().each(ctx, filter, func(id string) (*TimelineActivity, error) { return r.timelineActivities().softDelete(ctx, id) })
}

func (r *mutationResolver) DestroyTimelineActivity(ctx context.Context, id string) (*TimelineActivity, error) {
	return r.timelineActivities().destroy(ctx, id)
}

func (r *mutationResolver) DestroyTimelineActivities(ctx context.Context, filter map[string]any) ([]*TimelineActivity, error) {
	return r.timelineActivities().each(ctx, filter, func(id string) (*TimelineActivity, error) { return r.timelineActivities().destroy(ctx, id) })
}

func (r *mutationResolver) RestoreTimelineActivities(ctx context.Context, filter map[string]any) ([]*TimelineActivity, error) {
	return r.timelineActivities().each(ctx, filter, func(id string) (*TimelineActivity, error) { return r.timelineActivities().restore(ctx, id) })
}

func (r *queryResolver) TimelineActivities(ctx context.Context, filter map[string]any, orderBy []map[string]any, first, last *int, after, before *string, _ *int) (*TimelineActivityConnection, error) {
	page, aggregates, err := r.timelineActivities().list(ctx, filter, orderBy, first, last, after, before)
	if err != nil {
		return nil, err
	}
	connection := &TimelineActivityConnection{TotalCount: &page.TotalCount}
	connection.Edges, connection.PageInfo = pageEdges(page, timelineActivityEdge)
	fillAggregates(connection, aggregates)
	return connection, nil
}

func (r *queryResolver) TimelineActivity(ctx context.Context, filter map[string]any) (*TimelineActivity, error) {
	return r.timelineActivities().first(ctx, filter)
}

func (r *queryResolver) TimelineActivitiesGroupBy(ctx context.Context, groupBy []map[string]any, filter map[string]any, orderBy []map[string]any, _ []map[string]any, _ *string, limit *int, _ *int) ([]*TimelineActivityGroupByConnection, error) {
	groups, err := r.timelineActivities().groups(ctx, groupBy, filter, orderBy, limit)
	if err != nil {
		return nil, err
	}
	connections := make([]*TimelineActivityGroupByConnection, len(groups))
	for i, group := range groups {
		connection := &TimelineActivityGroupByConnection{GroupByDimensionValues: group.Key}
		connection.Edges, connection.PageInfo = pageEdges(group.Records, timelineActivityEdge)
		fillAggregates(connection, group.Aggregates)
		connections[i] = connection
	}
	return connections, nil
}
