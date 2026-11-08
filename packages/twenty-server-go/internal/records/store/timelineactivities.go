package store

import (
	"context"
	"errors"
	"fmt"
	"slices"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgtype"
	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/twentyhq/twenty/packages/twenty-server-go/internal/model"
	"github.com/twentyhq/twenty/packages/twenty-server-go/internal/records"
	"github.com/twentyhq/twenty/packages/twenty-server-go/internal/records/store/db"
	"github.com/twentyhq/twenty/packages/twenty-server-go/internal/workspace"
)

const timelineActivityColumns = `"id", "createdAt", "updatedAt", "deletedAt", "createdBySource", "createdByWorkspaceMemberId", "createdByName", "createdByContext", "updatedBySource", "updatedByWorkspaceMemberId", "updatedByName", "updatedByContext", "position", "happensAt", "timelineActivityTypeId", "timelineActivityTypeSnapshot", "properties", "linkedRecordCachedName", "linkedRecordId", "linkedObjectMetadataId", "searchVector", "targetCompanyId", "targetDashboardId", "targetMessageCampaignId", "targetMessageListId", "targetNoteId", "targetOpportunityId", "targetPersonId", "targetTaskId", "workspaceMemberId", "targetWorkflowId", "targetWorkflowVersionId", "targetWorkflowRunId"`

type timelineActivityRow = db.Workspace2abogkkt2zd45pa9aun09djpfTimelineActivity

type TimelineActivities struct {
	*rowset[records.TimelineActivity]
	queries *db.Queries
}

var _ records.TimelineActivities = (*TimelineActivities)(nil)

func NewTimelineActivities(pool *pgxpool.Pool) *TimelineActivities {
	index := slices.IndexFunc(model.Objects, func(object model.Object) bool { return object.NameSingular == "timelineActivity" })
	if index < 0 {
		panic("object model has no timelineActivity object")
	}
	return &TimelineActivities{
		rowset: &rowset[records.TimelineActivity]{
			pool: pool, object: model.Objects[index], table: workspace.SchemaName() + `."timelineActivity"`,
			columns: timelineActivityColumns, label: "timeline activities",
			scan: func(row pgx.Row) (records.TimelineActivity, error) {
				scanned, err := scanTimelineActivity(row)
				if err != nil {
					return records.TimelineActivity{}, err
				}
				return toTimelineActivity(scanned), nil
			},
			id: func(activity records.TimelineActivity) string { return activity.ID },
		},
		queries: db.New(pool),
	}
}

func (t *TimelineActivities) Get(ctx context.Context, id string) (records.TimelineActivity, error) {
	uuid, err := parseUUID(id)
	if err != nil {
		return records.TimelineActivity{}, err
	}
	row, err := t.queries.GetTimelineActivity(ctx, uuid)
	if errors.Is(err, pgx.ErrNoRows) {
		return records.TimelineActivity{}, records.ErrNotFound
	}
	if err != nil {
		return records.TimelineActivity{}, fmt.Errorf("get timeline activity: %w", err)
	}
	return toTimelineActivity(row), nil
}

func (t *TimelineActivities) Create(ctx context.Context, actor records.Actor, input records.TimelineActivityInput) (records.TimelineActivity, error) {
	position, err := nextPosition(ctx, t.pool, t.table)
	if err != nil {
		return records.TimelineActivity{}, err
	}
	base := timelineActivityRow{HappensAt: pgtype.Timestamptz{Time: time.Now(), Valid: true}}
	merged, err := mergeTimelineActivity(base, input)
	if err != nil {
		return records.TimelineActivity{}, err
	}
	memberID, err := optionalUUID(actor.WorkspaceMemberID)
	if err != nil {
		return records.TimelineActivity{}, err
	}
	row, err := t.queries.CreateTimelineActivity(ctx, db.CreateTimelineActivityParams{
		CreatedBySource:            db.Workspace2abogkkt2zd45pa9aun09djpfTimelineActivityCreatedBySourceEnum(actor.Source),
		CreatedByWorkspaceMemberId: memberID, CreatedByName: actor.Name,
		UpdatedBySource:            db.Workspace2abogkkt2zd45pa9aun09djpfTimelineActivityUpdatedBySourceEnum(actor.Source),
		UpdatedByWorkspaceMemberId: memberID, UpdatedByName: actor.Name,
		Position: position, HappensAt: merged.HappensAt, TimelineActivityTypeId: merged.TimelineActivityTypeId,
		TimelineActivityTypeSnapshot: merged.TimelineActivityTypeSnapshot, Properties: merged.Properties,
		LinkedRecordCachedName: merged.LinkedRecordCachedName, LinkedRecordId: merged.LinkedRecordId, LinkedObjectMetadataId: merged.LinkedObjectMetadataId,
		TargetCompanyId: merged.TargetCompanyId, TargetDashboardId: merged.TargetDashboardId, TargetMessageCampaignId: merged.TargetMessageCampaignId,
		TargetMessageListId: merged.TargetMessageListId, TargetNoteId: merged.TargetNoteId, TargetOpportunityId: merged.TargetOpportunityId,
		TargetPersonId: merged.TargetPersonId, TargetTaskId: merged.TargetTaskId, WorkspaceMemberId: merged.WorkspaceMemberId,
		TargetWorkflowId: merged.TargetWorkflowId, TargetWorkflowVersionId: merged.TargetWorkflowVersionId, TargetWorkflowRunId: merged.TargetWorkflowRunId,
	})
	if err != nil {
		return records.TimelineActivity{}, fmt.Errorf("create timeline activity: %w", err)
	}
	return toTimelineActivity(row), nil
}

func (t *TimelineActivities) Update(ctx context.Context, actor records.Actor, id string, input records.TimelineActivityInput) (records.TimelineActivity, error) {
	uuid, err := parseUUID(id)
	if err != nil {
		return records.TimelineActivity{}, err
	}
	tx, err := t.pool.Begin(ctx)
	if err != nil {
		return records.TimelineActivity{}, fmt.Errorf("begin update: %w", err)
	}
	defer func() { _ = tx.Rollback(ctx) }()

	current, err := scanTimelineActivity(tx.QueryRow(ctx, `SELECT `+timelineActivityColumns+` FROM `+t.table+` WHERE "id" = $1 FOR UPDATE`, uuid))
	if errors.Is(err, pgx.ErrNoRows) {
		return records.TimelineActivity{}, records.ErrNotFound
	}
	if err != nil {
		return records.TimelineActivity{}, fmt.Errorf("load timeline activity: %w", err)
	}
	merged, err := mergeTimelineActivity(current, input)
	if err != nil {
		return records.TimelineActivity{}, err
	}
	memberID, err := optionalUUID(actor.WorkspaceMemberID)
	if err != nil {
		return records.TimelineActivity{}, err
	}
	row, err := t.queries.WithTx(tx).UpdateTimelineActivity(ctx, db.UpdateTimelineActivityParams{
		UpdatedBySource:            db.Workspace2abogkkt2zd45pa9aun09djpfTimelineActivityUpdatedBySourceEnum(actor.Source),
		UpdatedByWorkspaceMemberId: memberID, UpdatedByName: actor.Name, UpdatedByContext: current.UpdatedByContext,
		Position: current.Position, HappensAt: merged.HappensAt, TimelineActivityTypeId: merged.TimelineActivityTypeId,
		TimelineActivityTypeSnapshot: merged.TimelineActivityTypeSnapshot, Properties: merged.Properties,
		LinkedRecordCachedName: merged.LinkedRecordCachedName, LinkedRecordId: merged.LinkedRecordId, LinkedObjectMetadataId: merged.LinkedObjectMetadataId,
		TargetCompanyId: merged.TargetCompanyId, TargetDashboardId: merged.TargetDashboardId, TargetMessageCampaignId: merged.TargetMessageCampaignId,
		TargetMessageListId: merged.TargetMessageListId, TargetNoteId: merged.TargetNoteId, TargetOpportunityId: merged.TargetOpportunityId,
		TargetPersonId: merged.TargetPersonId, TargetTaskId: merged.TargetTaskId, WorkspaceMemberId: merged.WorkspaceMemberId,
		TargetWorkflowId: merged.TargetWorkflowId, TargetWorkflowVersionId: merged.TargetWorkflowVersionId, TargetWorkflowRunId: merged.TargetWorkflowRunId,
		ID: uuid,
	})
	if err != nil {
		return records.TimelineActivity{}, fmt.Errorf("update timeline activity: %w", err)
	}
	if err := tx.Commit(ctx); err != nil {
		return records.TimelineActivity{}, fmt.Errorf("commit update: %w", err)
	}
	return toTimelineActivity(row), nil
}

func (t *TimelineActivities) SoftDelete(ctx context.Context, id string) error {
	return affect(ctx, id, "timeline activity", t.queries.SoftDeleteTimelineActivity)
}

func (t *TimelineActivities) Restore(ctx context.Context, id string) error {
	return affect(ctx, id, "timeline activity", t.queries.RestoreTimelineActivity)
}

func (t *TimelineActivities) Destroy(ctx context.Context, id string) error {
	return affect(ctx, id, "timeline activity", t.queries.DestroyTimelineActivity)
}

func scanTimelineActivity(row pgx.Row) (timelineActivityRow, error) {
	var i timelineActivityRow
	err := row.Scan(&i.ID, &i.CreatedAt, &i.UpdatedAt, &i.DeletedAt, &i.CreatedBySource, &i.CreatedByWorkspaceMemberId, &i.CreatedByName, &i.CreatedByContext,
		&i.UpdatedBySource, &i.UpdatedByWorkspaceMemberId, &i.UpdatedByName, &i.UpdatedByContext, &i.Position, &i.HappensAt, &i.TimelineActivityTypeId,
		&i.TimelineActivityTypeSnapshot, &i.Properties, &i.LinkedRecordCachedName, &i.LinkedRecordId, &i.LinkedObjectMetadataId, &i.SearchVector,
		&i.TargetCompanyId, &i.TargetDashboardId, &i.TargetMessageCampaignId, &i.TargetMessageListId, &i.TargetNoteId, &i.TargetOpportunityId,
		&i.TargetPersonId, &i.TargetTaskId, &i.WorkspaceMemberId, &i.TargetWorkflowId, &i.TargetWorkflowVersionId, &i.TargetWorkflowRunId)
	return i, err
}

func mergeTimelineActivity(base timelineActivityRow, input records.TimelineActivityInput) (timelineActivityRow, error) {
	row := base
	if input.HappensAt != nil {
		row.HappensAt = pgtype.Timestamptz{Time: *input.HappensAt, Valid: true}
	}
	if input.TypeSnapshot != nil {
		row.TimelineActivityTypeSnapshot = input.TypeSnapshot
	}
	if input.Properties != nil {
		row.Properties = input.Properties
	}
	patchText(&row.LinkedRecordCachedName, input.LinkedRecordCachedName)
	links := []struct {
		target *pgtype.UUID
		id     *string
	}{
		{&row.TimelineActivityTypeId, input.TypeID}, {&row.LinkedRecordId, input.LinkedRecordID}, {&row.LinkedObjectMetadataId, input.LinkedObjectMetadataID},
		{&row.TargetCompanyId, input.TargetCompanyID}, {&row.TargetDashboardId, input.TargetDashboardID}, {&row.TargetMessageCampaignId, input.TargetMessageCampaignID},
		{&row.TargetMessageListId, input.TargetMessageListID}, {&row.TargetNoteId, input.TargetNoteID}, {&row.TargetOpportunityId, input.TargetOpportunityID},
		{&row.TargetPersonId, input.TargetPersonID}, {&row.TargetTaskId, input.TargetTaskID}, {&row.TargetWorkflowId, input.TargetWorkflowID},
		{&row.TargetWorkflowRunId, input.TargetWorkflowRunID}, {&row.TargetWorkflowVersionId, input.TargetWorkflowVersionID}, {&row.WorkspaceMemberId, input.WorkspaceMemberID},
	}
	for _, link := range links {
		if err := patchUUID(link.target, link.id); err != nil {
			return row, err
		}
	}
	return row, nil
}

func toTimelineActivity(row timelineActivityRow) records.TimelineActivity {
	return records.TimelineActivity{
		ID: row.ID.String(), HappensAt: row.HappensAt.Time.UTC(),
		TypeID: uuidPtr(row.TimelineActivityTypeId), TypeSnapshot: row.TimelineActivityTypeSnapshot, Properties: row.Properties,
		LinkedRecordCachedName: row.LinkedRecordCachedName.String, LinkedRecordID: uuidPtr(row.LinkedRecordId), LinkedObjectMetadataID: uuidPtr(row.LinkedObjectMetadataId),
		TargetCompanyID: uuidPtr(row.TargetCompanyId), TargetDashboardID: uuidPtr(row.TargetDashboardId), TargetMessageCampaignID: uuidPtr(row.TargetMessageCampaignId),
		TargetMessageListID: uuidPtr(row.TargetMessageListId), TargetNoteID: uuidPtr(row.TargetNoteId), TargetOpportunityID: uuidPtr(row.TargetOpportunityId),
		TargetPersonID: uuidPtr(row.TargetPersonId), TargetTaskID: uuidPtr(row.TargetTaskId), TargetWorkflowID: uuidPtr(row.TargetWorkflowId),
		TargetWorkflowRunID: uuidPtr(row.TargetWorkflowRunId), TargetWorkflowVersionID: uuidPtr(row.TargetWorkflowVersionId), WorkspaceMemberID: uuidPtr(row.WorkspaceMemberId),
		Position:  row.Position,
		CreatedBy: records.Actor{Source: string(row.CreatedBySource), WorkspaceMemberID: uuidString(row.CreatedByWorkspaceMemberId), Name: row.CreatedByName},
		UpdatedBy: records.Actor{Source: string(row.UpdatedBySource), WorkspaceMemberID: uuidString(row.UpdatedByWorkspaceMemberId), Name: row.UpdatedByName},
		CreatedAt: row.CreatedAt.Time.UTC(), UpdatedAt: row.UpdatedAt.Time.UTC(), DeletedAt: timePtr(row.DeletedAt),
	}
}
