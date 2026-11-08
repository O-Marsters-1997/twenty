package records

import (
	"context"
	"time"
)

type NoteTarget struct {
	ID                  string
	NoteID              *string
	TargetPersonID      *string
	TargetCompanyID     *string
	TargetOpportunityID *string
	Position            float64
	CreatedBy           Actor
	UpdatedBy           Actor
	CreatedAt           time.Time
	UpdatedAt           time.Time
	DeletedAt           *time.Time
}

type NoteTargetInput struct { // nil leaves a field unchanged on update
	NoteID              *string
	TargetPersonID      *string
	TargetCompanyID     *string
	TargetOpportunityID *string
}

type NoteTargets interface {
	Find(ctx context.Context, filter Filter, orderBy []OrderBy, page PageRequest) (Page[NoteTarget], error)
	Get(ctx context.Context, id string) (NoteTarget, error) // ErrNotFound
	Create(ctx context.Context, actor Actor, input NoteTargetInput) (NoteTarget, error)
	Update(ctx context.Context, actor Actor, id string, input NoteTargetInput) (NoteTarget, error)
	SoftDelete(ctx context.Context, id string) error
	Restore(ctx context.Context, id string) error
	Destroy(ctx context.Context, id string) error
	Aggregate(ctx context.Context, filter Filter, aggregates []Aggregate) (AggregateResult, error)
	GroupBy(ctx context.Context, filter Filter, groupBy []GroupBy, orderBy []OrderBy, aggregates []Aggregate, perGroup PageRequest) ([]Group[NoteTarget], error)
}
