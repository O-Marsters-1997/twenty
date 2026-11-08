package records

import (
	"context"
	"time"
)

type TaskTarget struct {
	ID                  string
	TaskID              *string
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

type TaskTargetInput struct { // nil leaves a field unchanged on update
	TaskID              *string
	TargetPersonID      *string
	TargetCompanyID     *string
	TargetOpportunityID *string
}

type TaskTargets interface {
	Find(ctx context.Context, filter Filter, orderBy []OrderBy, page PageRequest) (Page[TaskTarget], error)
	Get(ctx context.Context, id string) (TaskTarget, error) // ErrNotFound
	Create(ctx context.Context, actor Actor, input TaskTargetInput) (TaskTarget, error)
	Update(ctx context.Context, actor Actor, id string, input TaskTargetInput) (TaskTarget, error)
	SoftDelete(ctx context.Context, id string) error
	Restore(ctx context.Context, id string) error
	Destroy(ctx context.Context, id string) error
	Aggregate(ctx context.Context, filter Filter, aggregates []Aggregate) (AggregateResult, error)
	GroupBy(ctx context.Context, filter Filter, groupBy []GroupBy, orderBy []OrderBy, aggregates []Aggregate, perGroup PageRequest) ([]Group[TaskTarget], error)
}
