package records

import (
	"context"
	"time"
)

type Dashboard struct {
	ID           string
	Title        string
	PageLayoutID *string
	Position     float64
	CreatedBy    Actor
	UpdatedBy    Actor
	CreatedAt    time.Time
	UpdatedAt    time.Time
	DeletedAt    *time.Time
}

type DashboardInput struct { // nil leaves a field unchanged on update
	Title        *string
	PageLayoutID *string
}

type Dashboards interface {
	Find(ctx context.Context, filter Filter, orderBy []OrderBy, page PageRequest) (Page[Dashboard], error)
	Get(ctx context.Context, id string) (Dashboard, error) // ErrNotFound
	Create(ctx context.Context, actor Actor, input DashboardInput) (Dashboard, error)
	Update(ctx context.Context, actor Actor, id string, input DashboardInput) (Dashboard, error)
	SoftDelete(ctx context.Context, id string) error
	Restore(ctx context.Context, id string) error
	Destroy(ctx context.Context, id string) error
	Aggregate(ctx context.Context, filter Filter, aggregates []Aggregate) (AggregateResult, error)
	GroupBy(ctx context.Context, filter Filter, groupBy []GroupBy, orderBy []OrderBy, aggregates []Aggregate, perGroup PageRequest) ([]Group[Dashboard], error)
}
