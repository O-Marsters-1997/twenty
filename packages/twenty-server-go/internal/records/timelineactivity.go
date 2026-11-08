package records

import (
	"context"
	"encoding/json"
	"time"
)

type TimelineActivity struct {
	ID                      string
	HappensAt               time.Time
	TypeID                  *string
	TypeSnapshot            json.RawMessage
	Properties              json.RawMessage
	LinkedRecordCachedName  string
	LinkedRecordID          *string
	LinkedObjectMetadataID  *string
	TargetCompanyID         *string
	TargetDashboardID       *string
	TargetMessageCampaignID *string
	TargetMessageListID     *string
	TargetNoteID            *string
	TargetOpportunityID     *string
	TargetPersonID          *string
	TargetTaskID            *string
	TargetWorkflowID        *string
	TargetWorkflowRunID     *string
	TargetWorkflowVersionID *string
	WorkspaceMemberID       *string
	Position                float64
	CreatedBy               Actor
	UpdatedBy               Actor
	CreatedAt               time.Time
	UpdatedAt               time.Time
	DeletedAt               *time.Time
}

type TimelineActivityInput struct { // nil leaves a field unchanged on update; an empty id clears a link
	HappensAt               *time.Time
	TypeID                  *string
	TypeSnapshot            json.RawMessage
	Properties              json.RawMessage
	LinkedRecordCachedName  *string
	LinkedRecordID          *string
	LinkedObjectMetadataID  *string
	TargetCompanyID         *string
	TargetDashboardID       *string
	TargetMessageCampaignID *string
	TargetMessageListID     *string
	TargetNoteID            *string
	TargetOpportunityID     *string
	TargetPersonID          *string
	TargetTaskID            *string
	TargetWorkflowID        *string
	TargetWorkflowRunID     *string
	TargetWorkflowVersionID *string
	WorkspaceMemberID       *string
}

type TimelineActivities interface {
	Find(ctx context.Context, filter Filter, orderBy []OrderBy, page PageRequest) (Page[TimelineActivity], error)
	Get(ctx context.Context, id string) (TimelineActivity, error) // ErrNotFound
	Create(ctx context.Context, actor Actor, input TimelineActivityInput) (TimelineActivity, error)
	Update(ctx context.Context, actor Actor, id string, input TimelineActivityInput) (TimelineActivity, error)
	SoftDelete(ctx context.Context, id string) error
	Restore(ctx context.Context, id string) error
	Destroy(ctx context.Context, id string) error
	Aggregate(ctx context.Context, filter Filter, aggregates []Aggregate) (AggregateResult, error)
	GroupBy(ctx context.Context, filter Filter, groupBy []GroupBy, orderBy []OrderBy, aggregates []Aggregate, perGroup PageRequest) ([]Group[TimelineActivity], error)
}
