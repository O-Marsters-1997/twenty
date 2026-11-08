package records

import (
	"context"
	"time"
)

type WorkspaceMember struct {
	ID               string
	Name             FullName
	ColorScheme      string
	UIScale          string
	OpenRecordIn     string
	Locale           string
	AvatarURL        string
	UserEmail        string
	JobTitle         string
	CalendarStartDay float64
	UserID           string
	TimeZone         string
	DateFormat       string
	TimeFormat       string
	NumberFormat     string
	Position         float64
	CreatedBy        Actor
	UpdatedBy        Actor
	CreatedAt        time.Time
	UpdatedAt        time.Time
	DeletedAt        *time.Time
}

type WorkspaceMemberInput struct { // nil leaves a field unchanged on update
	Name             *FullName
	ColorScheme      *string
	UIScale          *string
	OpenRecordIn     *string
	Locale           *string
	AvatarURL        *string
	UserEmail        *string
	JobTitle         *string
	CalendarStartDay *float64
	UserID           *string
	TimeZone         *string
	DateFormat       *string
	TimeFormat       *string
	NumberFormat     *string
}

type WorkspaceMembers interface {
	Find(ctx context.Context, filter Filter, orderBy []OrderBy, page PageRequest) (Page[WorkspaceMember], error)
	Get(ctx context.Context, id string) (WorkspaceMember, error) // ErrNotFound
	Create(ctx context.Context, actor Actor, input WorkspaceMemberInput) (WorkspaceMember, error)
	Update(ctx context.Context, actor Actor, id string, input WorkspaceMemberInput) (WorkspaceMember, error)
	SoftDelete(ctx context.Context, id string) error
	Restore(ctx context.Context, id string) error
	Destroy(ctx context.Context, id string) error
	Aggregate(ctx context.Context, filter Filter, aggregates []Aggregate) (AggregateResult, error)
	GroupBy(ctx context.Context, filter Filter, groupBy []GroupBy, orderBy []OrderBy, aggregates []Aggregate, perGroup PageRequest) ([]Group[WorkspaceMember], error)
}
