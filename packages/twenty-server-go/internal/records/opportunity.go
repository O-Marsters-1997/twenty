package records

import (
	"context"
	"time"
)

type Opportunity struct {
	ID               string
	Name             string
	Amount           Currency
	CloseDate        *time.Time
	Stage            string
	Position         float64
	CompanyID        *string
	PointOfContactID *string
	OwnerID          *string
	CreatedBy        Actor
	UpdatedBy        Actor
	CreatedAt        time.Time
	UpdatedAt        time.Time
	DeletedAt        *time.Time
}

type OpportunityInput struct { // nil leaves a field unchanged on update
	Name             *string
	Amount           *Currency
	CloseDate        *time.Time
	Stage            *string
	CompanyID        *string
	PointOfContactID *string
	OwnerID          *string
}

type Opportunities interface {
	Find(ctx context.Context, filter Filter, orderBy []OrderBy, page PageRequest) (Page[Opportunity], error)
	Get(ctx context.Context, id string) (Opportunity, error) // ErrNotFound
	Create(ctx context.Context, actor Actor, input OpportunityInput) (Opportunity, error)
	Update(ctx context.Context, actor Actor, id string, input OpportunityInput) (Opportunity, error)
	SoftDelete(ctx context.Context, id string) error
	Restore(ctx context.Context, id string) error
	Destroy(ctx context.Context, id string) error
	Aggregate(ctx context.Context, filter Filter, aggregates []Aggregate) (AggregateResult, error)
	GroupBy(ctx context.Context, filter Filter, groupBy []GroupBy, orderBy []OrderBy, aggregates []Aggregate, perGroup PageRequest) ([]Group[Opportunity], error)
}
