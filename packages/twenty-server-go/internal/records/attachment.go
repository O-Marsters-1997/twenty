package records

import (
	"context"
	"encoding/json"
	"time"
)

type Attachment struct {
	ID                      string
	Name                    string
	File                    json.RawMessage
	FullPath                string
	FileCategory            string // ARCHIVE, AUDIO, IMAGE, PRESENTATION, SPREADSHEET, TEXT_DOCUMENT, VIDEO, OTHER
	TargetAgentChatThreadID *string
	TargetCompanyID         *string
	TargetDashboardID       *string
	TargetNoteID            *string
	TargetOpportunityID     *string
	TargetPersonID          *string
	TargetTaskID            *string
	TargetWorkflowID        *string
	Position                float64
	CreatedBy               Actor
	UpdatedBy               Actor
	CreatedAt               time.Time
	UpdatedAt               time.Time
	DeletedAt               *time.Time
}

type AttachmentInput struct { // nil leaves a field unchanged on update; an empty id clears a link
	Name                    *string
	File                    json.RawMessage
	FullPath                *string
	FileCategory            *string
	TargetAgentChatThreadID *string
	TargetCompanyID         *string
	TargetDashboardID       *string
	TargetNoteID            *string
	TargetOpportunityID     *string
	TargetPersonID          *string
	TargetTaskID            *string
	TargetWorkflowID        *string
}

type Attachments interface {
	Find(ctx context.Context, filter Filter, orderBy []OrderBy, page PageRequest) (Page[Attachment], error)
	Get(ctx context.Context, id string) (Attachment, error) // ErrNotFound
	Create(ctx context.Context, actor Actor, input AttachmentInput) (Attachment, error)
	Update(ctx context.Context, actor Actor, id string, input AttachmentInput) (Attachment, error)
	SoftDelete(ctx context.Context, id string) error
	Restore(ctx context.Context, id string) error
	Destroy(ctx context.Context, id string) error
	Aggregate(ctx context.Context, filter Filter, aggregates []Aggregate) (AggregateResult, error)
	GroupBy(ctx context.Context, filter Filter, groupBy []GroupBy, orderBy []OrderBy, aggregates []Aggregate, perGroup PageRequest) ([]Group[Attachment], error)
}
