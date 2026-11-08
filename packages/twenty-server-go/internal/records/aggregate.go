package records

type AggregateOperation string // count, countEmpty, countNotEmpty, countUniqueValues, percentageEmpty, percentageNotEmpty, sum, avg, min, max, countTrue, countFalse

type Aggregate struct {
	Field     string
	Operation AggregateOperation
}

type AggregateResult map[string]any // "<operation><Field>" → value, as Node names them

type GroupBy struct {
	Field    string
	SubField string
}

type Group[TRecord any] struct {
	Key        []any
	Records    Page[TRecord]
	Aggregates AggregateResult
}
