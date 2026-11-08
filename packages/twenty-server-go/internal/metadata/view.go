package metadata

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"strconv"
	"time"
)

var (
	ErrNotFound     = errors.New("not found")
	ErrInvalidInput = errors.New("invalid input")
)

type View struct {
	ID, ObjectMetadataID, Name, Type, Icon string
	Position                               float64
	Fields                                 []ViewField
	Filters                                []ViewFilter
	FilterGroups                           []ViewFilterGroup
	Sorts                                  []ViewSort
	Groups                                 []ViewGroup
}

type ViewWriter interface { // views stay user-editable; only objects and fields are frozen
	SaveView(ctx context.Context, view View) (View, error)
	DeleteView(ctx context.Context, id string) error
}

type ViewRecord struct {
	View
	Key                                     *string
	IsCompact                               bool
	IsCustom                                bool
	IsActive                                bool
	IsSystemSideEffect                      bool
	OpenRecordIn                            string
	Visibility                              string
	KanbanAggregateOperation                *string
	KanbanAggregateOperationFieldMetadataID *string
	KanbanColumnWidth                       *int
	MainGroupByFieldMetadataID              *string
	ShouldHideEmptyGroups                   bool
	GroupLoadLimit                          *int
	AnyFieldFilterValue                     *string
	CalendarLayout                          *string
	CalendarFieldMetadataID                 *string
	CalendarEndFieldMetadataID              *string
	CreatedByUserWorkspaceID                *string
	UniversalIdentifier                     string
	WorkspaceID                             string
	ApplicationID                           string
	CreatedAt                               Timestamp
	UpdatedAt                               Timestamp
	DeletedAt                               *Timestamp
	FieldGroups                             []ViewFieldGroup
}

type ViewField struct {
	ID                  string
	FieldMetadataID     string
	ViewID              string
	ViewFieldGroupID    *string
	IsVisible           bool
	Position            float64
	Size                float64
	AggregateOperation  *string
	IsActive            bool
	IsSystemSideEffect  bool
	Overrides           json.RawMessage
	UniversalIdentifier string
	WorkspaceID         string
	ApplicationID       string
	CreatedAt           Timestamp
	UpdatedAt           Timestamp
	DeletedAt           *Timestamp
}

func (f ViewField) IsOverridden() bool { return hasOverrides(f.Overrides) }

type ViewFieldGroup struct {
	ID                  string
	Name                string
	ViewID              string
	Position            float64
	IsVisible           bool
	IsActive            bool
	IsSystemSideEffect  bool
	Overrides           json.RawMessage
	UniversalIdentifier string
	WorkspaceID         string
	ApplicationID       string
	CreatedAt           Timestamp
	UpdatedAt           Timestamp
	DeletedAt           *Timestamp
	ViewFields          []ViewField
}

func (g ViewFieldGroup) IsOverridden() bool { return hasOverrides(g.Overrides) }

func hasOverrides(overrides json.RawMessage) bool {
	return len(overrides) > 0 && string(overrides) != "null"
}

type ViewFilter struct {
	ID                            string
	FieldMetadataID               string
	ViewID                        string
	ViewFilterGroupID             *string
	Operand                       string
	Value                         json.RawMessage
	PositionInViewFilterGroup     *float64
	SubFieldName                  *string
	RelationTargetFieldMetadataID *string
	UniversalIdentifier           string
	WorkspaceID                   string
	ApplicationID                 string
	CreatedAt                     Timestamp
	UpdatedAt                     Timestamp
	DeletedAt                     *Timestamp
}

type ViewFilterGroup struct {
	ID                        string
	ViewID                    string
	ParentViewFilterGroupID   *string
	LogicalOperator           string
	PositionInViewFilterGroup *float64
	UniversalIdentifier       string
	WorkspaceID               string
	ApplicationID             string
	CreatedAt                 Timestamp
	UpdatedAt                 Timestamp
	DeletedAt                 *Timestamp
}

type ViewSort struct {
	ID                  string
	FieldMetadataID     string
	ViewID              string
	Direction           string
	SubFieldName        *string
	UniversalIdentifier string
	WorkspaceID         string
	ApplicationID       string
	CreatedAt           Timestamp
	UpdatedAt           Timestamp
	DeletedAt           *Timestamp
}

type ViewGroup struct {
	ID                  string
	ViewID              string
	FieldValue          string
	IsVisible           bool
	Position            float64
	UniversalIdentifier string
	WorkspaceID         string
	ApplicationID       string
	CreatedAt           Timestamp
	UpdatedAt           Timestamp
	DeletedAt           *Timestamp
}

type Timestamp struct{ time.Time }

const timestampLayout = "2006-01-02T15:04:05.000Z" // Node serialises dates with toISOString

func (t Timestamp) MarshalGQL(w io.Writer) {
	_, _ = io.WriteString(w, strconv.Quote(t.UTC().Format(timestampLayout)))
}

func (t *Timestamp) UnmarshalGQL(value any) error {
	text, ok := value.(string)
	if !ok {
		return fmt.Errorf("timestamp must be a string, got %T", value)
	}
	parsed, err := time.Parse(time.RFC3339Nano, text)
	if err != nil {
		return fmt.Errorf("parse timestamp: %w", err)
	}
	t.Time = parsed
	return nil
}
