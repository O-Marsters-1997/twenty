package records

import (
	"context"
	"time"
)

type Address struct {
	Street1, Street2, City, Postcode, State, Country string
	Lat, Lng                                         *float64
}

type Currency struct {
	AmountMicros *float64
	CurrencyCode string
}

type Company struct {
	ID             string
	Name           string
	DomainName     Links
	Address        Address
	Linkedin       Links
	AnnualRevenue  Currency
	Position       float64
	AccountOwnerID *string
	CreatedBy      Actor
	UpdatedBy      Actor
	CreatedAt      time.Time
	UpdatedAt      time.Time
	DeletedAt      *time.Time
}

type CompanyInput struct { // nil leaves a field unchanged on update
	Name           *string
	DomainName     *Links
	Address        *Address
	Linkedin       *Links
	AnnualRevenue  *Currency
	AccountOwnerID *string
}

type Companies interface {
	Find(ctx context.Context, filter Filter, orderBy []OrderBy, page PageRequest) (Page[Company], error)
	Get(ctx context.Context, id string) (Company, error) // ErrNotFound
	Create(ctx context.Context, actor Actor, input CompanyInput) (Company, error)
	Update(ctx context.Context, actor Actor, id string, input CompanyInput) (Company, error)
	SoftDelete(ctx context.Context, id string) error
	Restore(ctx context.Context, id string) error
	Destroy(ctx context.Context, id string) error
	Aggregate(ctx context.Context, filter Filter, aggregates []Aggregate) (AggregateResult, error)
	GroupBy(ctx context.Context, filter Filter, groupBy []GroupBy, orderBy []OrderBy, aggregates []Aggregate, perGroup PageRequest) ([]Group[Company], error)
}
