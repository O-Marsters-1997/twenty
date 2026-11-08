package store

// ObjectDetail is an object as the /metadata GraphQL API exposes it.
type ObjectDetail struct {
	ID, UniversalIdentifier, NameSingular, NamePlural, LabelSingular, LabelPlural string
	Color, Description, Icon, Shortcut                                            *string
	IsRemote, IsActive, IsSystem, IsUIEditable, IsUICreatable                     bool
	Writability, OpenRecordIn, SharingReach, Readability                          string
	CreatedAt, UpdatedAt                                                          string
	LabelIdentifierFieldMetadataID, ImageIdentifierFieldMetadataID                *string
	ApplicationID                                                                 string
	IsLabelSyncedWithName, IsSearchable                                           bool
	DuplicateCriteria                                                             [][]string
	SearchFieldMetadataList                                                       []SearchFieldDetail
	IndexMetadataList                                                             []IndexDetail
	FieldsList                                                                    []FieldDetail
	IsCustom                                                                      bool
}

// FieldDetail is a field as the /metadata GraphQL API exposes it.
type FieldDetail struct {
	ID, UniversalIdentifier, Type, Name, Label string
	Description, Icon, MorphID                 *string
	IsActive, IsSystem, IsUIEditable           bool
	Writability                                string
	IsNullable, IsUnique, IsSearchable         bool
	CreatedAt, UpdatedAt                       string
	DefaultValue, Options, Settings            any
	IsLabelSyncedWithName                      bool
	ApplicationID                              string
	Relation                                   *RelationDetail
	MorphRelations                             []*RelationDetail
	ObjectMetadataID                           string
}

// RelationDetail names both ends of a relation; the ends carry only id and names.
type RelationDetail struct {
	Type                                       string
	SourceObjectMetadata, TargetObjectMetadata *ObjectDetail
	SourceFieldMetadata, TargetFieldMetadata   *FieldDetail
}

// SearchFieldDetail is one searchable field's tsvector mapping.
type SearchFieldDetail struct {
	ID, FieldMetadataID, TsVectorFieldMetadataID string
	Position                                     float64
	CreatedAt, UpdatedAt                         string
}

// IndexDetail is an index and its fields.
type IndexDetail struct {
	ID, CreatedAt, UpdatedAt, Name string
	IndexWhereClause               *string
	IndexType                      string
	IsUnique                       bool
	IsCustom                       *bool
	IndexFieldMetadataList         []IndexFieldDetail
}

// IndexFieldDetail is one field of an index.
type IndexFieldDetail struct {
	ID, FieldMetadataID  string
	SubFieldName         *string
	CreatedAt, UpdatedAt string
	Order                int
}

// PageRequest is Node's cursor paging input; cursors are ids encoded by records.Cursor.
type PageRequest struct {
	First, Last   *int
	After, Before string
}

// Page is one page of objects in id-descending order.
type Page struct {
	Objects              []ObjectDetail
	HasNext, HasPrevious bool
}
