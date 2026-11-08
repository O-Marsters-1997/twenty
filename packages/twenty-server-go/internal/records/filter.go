package records

import "errors"

type Operand string // eq, neq, in, is, gt, gte, lt, lte, like, ilike, startsWith, containsAny, containsIlike

type FieldFilter struct {
	Field    string
	SubField string
	Operand  Operand
	Value    any
}

type Filter struct {
	And   []Filter
	Or    []Filter
	Not   *Filter
	Field *FieldFilter
}

type OrderDirection string // AscNullsFirst, AscNullsLast, DescNullsFirst, DescNullsLast

type OrderBy struct {
	Field     string
	SubField  string
	Direction OrderDirection
}

type PageRequest struct {
	First  int
	After  string
	Last   int
	Before string
}

type Page[TRecord any] struct {
	Records     []TRecord
	TotalCount  int
	StartCursor string
	EndCursor   string
	HasNext     bool
	HasPrevious bool
}

var ErrUnknownField = errors.New("unknown field") // filter or sort names a column not in the object model
