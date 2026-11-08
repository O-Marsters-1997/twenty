package recordsgql

import (
	"context"
	"encoding/json"
	"fmt"

	"github.com/twentyhq/twenty/packages/twenty-server-go/internal/records"
)

func newTimelineActivityOps(store records.TimelineActivities) *objectOps[records.TimelineActivity, records.TimelineActivityInput] {
	return newObjectOps(store, "timelineActivity", func(activity records.TimelineActivity) string { return activity.ID })
}

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

func newTimelineActivityEdge(activity records.TimelineActivity, cursor string) *TimelineActivityEdge {
	return &TimelineActivityEdge{Node: toTimelineActivity(activity), Cursor: cursor}
}

func (r *mutationResolver) CreateTimelineActivity(ctx context.Context, data *TimelineActivityCreateInput) (*TimelineActivity, error) {
	input, err := toTimelineActivityInput(data)
	if err != nil {
		return nil, err
	}
	created, err := r.timelineActivities.create(ctx, input)
	return convertOne(created, err, toTimelineActivity)
}

func (r *mutationResolver) CreateTimelineActivities(ctx context.Context, data []*TimelineActivityCreateInput, _ *bool) ([]*TimelineActivity, error) {
	inputs := make([]records.TimelineActivityInput, len(data))
	for i, item := range data {
		var err error
		if inputs[i], err = toTimelineActivityInput(item); err != nil {
			return nil, err
		}
	}
	created, err := r.timelineActivities.createMany(ctx, inputs)
	return convertAll(created, err, toTimelineActivity)
}

func (r *mutationResolver) UpdateTimelineActivity(ctx context.Context, id string, data TimelineActivityUpdateInput) (*TimelineActivity, error) {
	input, err := toTimelineActivityUpdateInput(data)
	if err != nil {
		return nil, err
	}
	updated, err := r.timelineActivities.update(ctx, id, input)
	return convertOne(updated, err, toTimelineActivity)
}

func (r *mutationResolver) UpdateTimelineActivities(ctx context.Context, filter map[string]any, data TimelineActivityUpdateInput) ([]*TimelineActivity, error) {
	input, err := toTimelineActivityUpdateInput(data)
	if err != nil {
		return nil, err
	}
	updated, err := r.timelineActivities.updateMatching(ctx, filter, input)
	return convertAll(updated, err, toTimelineActivity)
}

func (r *mutationResolver) DeleteTimelineActivity(ctx context.Context, id string) (*TimelineActivity, error) {
	deleted, err := r.timelineActivities.softDelete(ctx, id)
	return convertOne(deleted, err, toTimelineActivity)
}

func (r *mutationResolver) DeleteTimelineActivities(ctx context.Context, filter map[string]any) ([]*TimelineActivity, error) {
	deleted, err := r.timelineActivities.each(ctx, filter, r.timelineActivities.softDelete)
	return convertAll(deleted, err, toTimelineActivity)
}

func (r *mutationResolver) DestroyTimelineActivity(ctx context.Context, id string) (*TimelineActivity, error) {
	destroyed, err := r.timelineActivities.destroy(ctx, id)
	return convertOne(destroyed, err, toTimelineActivity)
}

func (r *mutationResolver) DestroyTimelineActivities(ctx context.Context, filter map[string]any) ([]*TimelineActivity, error) {
	destroyed, err := r.timelineActivities.each(ctx, filter, r.timelineActivities.destroy)
	return convertAll(destroyed, err, toTimelineActivity)
}

func (r *mutationResolver) RestoreTimelineActivities(ctx context.Context, filter map[string]any) ([]*TimelineActivity, error) {
	restored, err := r.timelineActivities.each(ctx, filter, r.timelineActivities.restore)
	return convertAll(restored, err, toTimelineActivity)
}

func (r *queryResolver) TimelineActivities(ctx context.Context, filter map[string]any, orderBy []map[string]any, first, last *int, after, before *string, _ *int) (*TimelineActivityConnection, error) {
	page, parsed, err := r.timelineActivities.find(ctx, filter, orderBy, first, last, after, before)
	if err != nil {
		return nil, err
	}
	connection := &TimelineActivityConnection{TotalCount: &page.TotalCount}
	connection.Edges, connection.PageInfo = edgesFor(page, newTimelineActivityEdge, r.timelineActivities.recordID)
	if err := r.timelineActivities.fillConnectionAggregates(ctx, parsed, connection); err != nil {
		return nil, err
	}
	return connection, nil
}

func (r *queryResolver) TimelineActivity(ctx context.Context, filter map[string]any) (*TimelineActivity, error) {
	found, err := r.timelineActivities.findFirst(ctx, filter)
	if err != nil || found == nil {
		return nil, err
	}
	return toTimelineActivity(*found), nil
}

func (r *queryResolver) TimelineActivitiesGroupBy(ctx context.Context, groupBy []map[string]any, filter map[string]any, orderBy []map[string]any, _ []map[string]any, _ *string, limit *int, _ *int) ([]*TimelineActivityGroupByConnection, error) {
	groups, err := r.timelineActivities.groupBy(ctx, groupBy, filter, orderBy, limit)
	if err != nil {
		return nil, err
	}
	connections := make([]*TimelineActivityGroupByConnection, len(groups))
	for i, group := range groups {
		connection := &TimelineActivityGroupByConnection{GroupByDimensionValues: group.Key}
		connection.Edges, connection.PageInfo = edgesFor(group.Records, newTimelineActivityEdge, r.timelineActivities.recordID)
		fillAggregates(connection, group.Aggregates)
		connections[i] = connection
	}
	return connections, nil
}
