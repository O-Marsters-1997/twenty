package metadata

import (
	"context"
	"encoding/json"

	"github.com/twentyhq/twenty/packages/twenty-server-go/internal/model"
)

// ObjectMetadata is one workspace object with its fields.
type ObjectMetadata struct {
	ID, NameSingular, NamePlural, LabelSingular, LabelPlural, Icon string
	IsCustom, IsActive, IsSystem                                   bool
	Fields                                                         []FieldMetadata
}

// FieldMetadata is one field of an object; Relation is set only for RELATION fields.
type FieldMetadata struct {
	ID, Name, Label, Icon string
	Type                  model.FieldType
	IsNullable, IsActive  bool
	Settings, Options     json.RawMessage
	Relation              *RelationMetadata
}

// RelationMetadata points a relation field at the object and field it joins to.
type RelationMetadata struct {
	Type                   string // MANY_TO_ONE, ONE_TO_MANY
	TargetObjectMetadataID string
	TargetFieldMetadataID  string
}

// Reader reads the workspace's object and field metadata.
type Reader interface {
	Objects(ctx context.Context) ([]ObjectMetadata, error)
}
