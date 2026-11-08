package records

import (
	"context"
	"time"
)

type RichText struct{ Blocknote, Markdown string }

type Note struct {
	ID        string
	Title     string
	Body      RichText
	Position  float64
	CreatedBy Actor
	UpdatedBy Actor
	CreatedAt time.Time
	UpdatedAt time.Time
	DeletedAt *time.Time
}

type NoteInput struct { // nil leaves a field unchanged on update
	Title *string
	Body  *RichText
}

type Notes interface {
	Find(ctx context.Context, filter Filter, orderBy []OrderBy, page PageRequest) (Page[Note], error)
	Get(ctx context.Context, id string) (Note, error) // ErrNotFound
	Create(ctx context.Context, actor Actor, input NoteInput) (Note, error)
	Update(ctx context.Context, actor Actor, id string, input NoteInput) (Note, error)
	SoftDelete(ctx context.Context, id string) error
	Restore(ctx context.Context, id string) error
	Destroy(ctx context.Context, id string) error
	Aggregate(ctx context.Context, filter Filter, aggregates []Aggregate) (AggregateResult, error)
	GroupBy(ctx context.Context, filter Filter, groupBy []GroupBy, orderBy []OrderBy, aggregates []Aggregate, perGroup PageRequest) ([]Group[Note], error)
}
