// Package chart holds the pure chart-data logic shared by bar, line and pie
// chart operations: dimension formatting, ordering and gap filling.
package chart

type FieldType string

const (
	FieldBoolean       FieldType = "BOOLEAN"
	FieldNumber        FieldType = "NUMBER"
	FieldNumeric       FieldType = "NUMERIC"
	FieldCurrency      FieldType = "CURRENCY"
	FieldRating        FieldType = "RATING"
	FieldPosition      FieldType = "POSITION"
	FieldDate          FieldType = "DATE"
	FieldDateTime      FieldType = "DATE_TIME"
	FieldSelect        FieldType = "SELECT"
	FieldMultiSelect   FieldType = "MULTI_SELECT"
	FieldArray         FieldType = "ARRAY"
	FieldRelation      FieldType = "RELATION"
	FieldMorphRelation FieldType = "MORPH_RELATION"
)

func (fieldType FieldType) isDateKind() bool {
	return fieldType == FieldDate || fieldType == FieldDateTime
}

func (fieldType FieldType) isNumericKind() bool {
	switch fieldType {
	case FieldNumber, FieldNumeric, FieldCurrency, FieldRating, FieldPosition:
		return true
	}
	return false
}

func (fieldType FieldType) isSelectKind() bool {
	return fieldType == FieldSelect || fieldType == FieldMultiSelect
}

func (fieldType FieldType) isArrayKind() bool {
	return fieldType == FieldMultiSelect || fieldType == FieldArray
}

type Granularity string

const (
	GranularityNone             Granularity = "NONE"
	GranularityDay              Granularity = "DAY"
	GranularityWeek             Granularity = "WEEK"
	GranularityMonth            Granularity = "MONTH"
	GranularityQuarter          Granularity = "QUARTER"
	GranularityYear             Granularity = "YEAR"
	GranularityDayOfTheWeek     Granularity = "DAY_OF_THE_WEEK"
	GranularityMonthOfTheYear   Granularity = "MONTH_OF_THE_YEAR"
	GranularityQuarterOfTheYear Granularity = "QUARTER_OF_THE_YEAR"
)

func (granularity Granularity) isCyclical() bool {
	switch granularity {
	case GranularityDayOfTheWeek, GranularityMonthOfTheYear, GranularityQuarterOfTheYear:
		return true
	}
	return false
}

type FirstDayOfTheWeek string

const (
	Monday   FirstDayOfTheWeek = "MONDAY"
	Sunday   FirstDayOfTheWeek = "SUNDAY"
	Saturday FirstDayOfTheWeek = "SATURDAY"
)

type OrderBy string

const (
	OrderFieldAsc          OrderBy = "FIELD_ASC"
	OrderFieldDesc         OrderBy = "FIELD_DESC"
	OrderFieldPositionAsc  OrderBy = "FIELD_POSITION_ASC"
	OrderFieldPositionDesc OrderBy = "FIELD_POSITION_DESC"
	OrderValueAsc          OrderBy = "VALUE_ASC"
	OrderValueDesc         OrderBy = "VALUE_DESC"
	OrderManual            OrderBy = "MANUAL"
)

type Direction string

const (
	Ascending  Direction = "ASC"
	Descending Direction = "DESC"
)

type SelectOption struct {
	Value    string
	Label    string
	Position int
}

type Field struct {
	Type    FieldType
	Options []SelectOption
}

// RawValue is a group-by dimension value as the database returned it: nil, string, number or bool.
type RawValue = any

type GroupByResult struct {
	DimensionValues []RawValue
	AggregateValue  float64
}

const maximumNumberOfBars = 100
