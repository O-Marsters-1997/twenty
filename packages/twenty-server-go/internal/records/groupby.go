package records

import "github.com/twentyhq/twenty/packages/twenty-server-go/internal/model"

type DateGranularity string

const (
	GranularityDay           DateGranularity = "DAY"
	GranularityWeek          DateGranularity = "WEEK"
	GranularityMonth         DateGranularity = "MONTH"
	GranularityQuarter       DateGranularity = "QUARTER"
	GranularityYear          DateGranularity = "YEAR"
	GranularityDayOfTheWeek  DateGranularity = "DAY_OF_THE_WEEK"
	GranularityMonthOfYear   DateGranularity = "MONTH_OF_THE_YEAR"
	GranularityQuarterOfYear DateGranularity = "QUARTER_OF_THE_YEAR"
)

type RelationMetadata struct {
	Target     model.Object
	JoinColumn string
}

type FieldMetadata struct {
	ID       string
	Name     string
	Relation *RelationMetadata
}

type GroupDimension struct {
	FieldID         string
	SubField        string
	NestedField     string
	NestedSubField  string
	DateGranularity DateGranularity
}

type GroupOrder struct {
	Dimension   int
	ByAggregate bool
	Descending  bool
}

type GroupAggregate struct {
	FieldID   string
	Operation AggregateOperation
}

type GroupByQuery struct {
	Filter            Filter
	Dimensions        []GroupDimension
	Aggregate         GroupAggregate
	OrderBy           []GroupOrder
	TimeZone          string
	FirstDayOfTheWeek string
	Limit             int
}

type GroupRow struct {
	Keys  []any
	Value any
}
