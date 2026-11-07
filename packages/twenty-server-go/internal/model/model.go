package model

//go:generate go run ../../cmd/modelgen -root ../..
//go:generate go run github.com/sqlc-dev/sqlc/cmd/sqlc@v1.31.1 generate -f ../../sqlc.yaml

// FieldType is a Twenty field metadata type.
type FieldType string

const (
	TypeText        FieldType = "TEXT"
	TypeNumber      FieldType = "NUMBER"
	TypeNumeric     FieldType = "NUMERIC"
	TypeBoolean     FieldType = "BOOLEAN"
	TypeDateTime    FieldType = "DATE_TIME"
	TypeSelect      FieldType = "SELECT"
	TypeMultiSelect FieldType = "MULTI_SELECT"
	TypeFullName    FieldType = "FULL_NAME"
	TypeEmails      FieldType = "EMAILS"
	TypePhones      FieldType = "PHONES"
	TypeLinks       FieldType = "LINKS"
	TypeCurrency    FieldType = "CURRENCY"
	TypeAddress     FieldType = "ADDRESS"
	TypeActor       FieldType = "ACTOR"
	TypeRelation    FieldType = "RELATION"
	TypeMorph       FieldType = "MORPH_RELATION"
	TypeUUID        FieldType = "UUID"
	TypePosition    FieldType = "POSITION"
	TypeRawJSON     FieldType = "RAW_JSON"
	TypeRichText    FieldType = "RICH_TEXT"
	TypeTSVector    FieldType = "TS_VECTOR"
	TypeArray       FieldType = "ARRAY"
	TypeFiles       FieldType = "FILES"
)

// Column is one physical column backing a field.
type Column struct {
	Name     string
	SubField string
}

// Field is one metadata field and the columns that store it.
type Field struct {
	Name    string
	Type    FieldType
	Columns []Column
	Options []string
}

// Object is one workspace object and its table.
type Object struct {
	NameSingular string
	NamePlural   string
	Table        string
	Fields       []Field
}
