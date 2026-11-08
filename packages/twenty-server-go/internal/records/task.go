package records

import (
	"context"
	"time"
)

type Task struct {
	ID         string
	Title      string
	Body       RichText
	DueAt      *time.Time
	Status     *string // TODO, IN_PROGRESS, DONE
	AssigneeID *string
	Position   float64
	CreatedBy  Actor
	UpdatedBy  Actor
	CreatedAt  time.Time
	UpdatedAt  time.Time
	DeletedAt  *time.Time
}

type TaskInput struct { // nil leaves a field unchanged on update
	Title      *string
	Body       *RichText
	DueAt      *time.Time
	Status     *string
	AssigneeID *string
}

type Tasks interface {
	Find(ctx context.Context, filter Filter, orderBy []OrderBy, page PageRequest) (Page[Task], error)
	Get(ctx context.Context, id string) (Task, error) // ErrNotFound
	Create(ctx context.Context, actor Actor, input TaskInput) (Task, error)
	Update(ctx context.Context, actor Actor, id string, input TaskInput) (Task, error)
	SoftDelete(ctx context.Context, id string) error
	Restore(ctx context.Context, id string) error
	Destroy(ctx context.Context, id string) error
	Aggregate(ctx context.Context, filter Filter, aggregates []Aggregate) (AggregateResult, error)
	GroupBy(ctx context.Context, filter Filter, groupBy []GroupBy, orderBy []OrderBy, aggregates []Aggregate, perGroup PageRequest) ([]Group[Task], error)
}
