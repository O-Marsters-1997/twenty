package recordfilter

import (
	"errors"
	"fmt"
	"time"

	"github.com/twentyhq/twenty/packages/twenty-server-go/internal/records"
)

var ErrInvalidFilter = errors.New("invalid chart filter")

type FieldType string

const (
	FieldText        FieldType = "TEXT"
	FieldNumber      FieldType = "NUMBER"
	FieldDate        FieldType = "DATE"
	FieldDateTime    FieldType = "DATE_TIME"
	FieldBoolean     FieldType = "BOOLEAN"
	FieldSelect      FieldType = "SELECT"
	FieldMultiSelect FieldType = "MULTI_SELECT"
	FieldRating      FieldType = "RATING"
	FieldFullName    FieldType = "FULL_NAME"
	FieldEmails      FieldType = "EMAILS"
	FieldPhones      FieldType = "PHONES"
	FieldLinks       FieldType = "LINKS"
	FieldCurrency    FieldType = "CURRENCY"
	FieldAddress     FieldType = "ADDRESS"
	FieldActor       FieldType = "ACTOR"
	FieldRelation    FieldType = "RELATION"
	FieldMorph       FieldType = "MORPH_RELATION"
	FieldUUID        FieldType = "UUID"
	FieldRawJSON     FieldType = "RAW_JSON"
	FieldTSVector    FieldType = "TS_VECTOR"
	FieldArray       FieldType = "ARRAY"
	FieldFiles       FieldType = "FILES"
)

type MorphRelation struct {
	RelationType       string
	TargetNameSingular string
	TargetNamePlural   string
}

type Field struct {
	ID             string
	Name           string
	Type           FieldType
	MorphRelations []MorphRelation
}

type RecordFilter struct {
	FieldMetadataID               string
	Operand                       string
	Value                         string
	RecordFilterGroupID           string
	SubFieldName                  string
	RelationTargetFieldMetadataID string
}

type RecordFilterGroup struct {
	ID                        string
	LogicalOperator           string
	ParentRecordFilterGroupID string
}

type ChartFilter struct {
	RecordFilters      []RecordFilter
	RecordFilterGroups []RecordFilterGroup
}

type CurrentRecord struct {
	ID                 string
	ObjectNameSingular string
}

type Dependencies struct {
	CurrentWorkspaceMemberID string
	CurrentRecord            *CurrentRecord
	TimeZone                 string
	Now                      time.Time
}

type builder struct {
	fieldsByID map[string]Field
	deps       Dependencies
	now        time.Time
}

func ToFilter(fields []Field, chart ChartFilter, deps Dependencies) (records.Filter, error) {
	b := builder{fieldsByID: make(map[string]Field, len(fields)), deps: deps, now: deps.Now}
	if b.now.IsZero() {
		b.now = time.Now()
	}
	for _, field := range fields {
		b.fieldsByID[field.ID] = field
	}

	var parts []records.Filter
	for _, recordFilter := range chart.RecordFilters {
		if recordFilter.RecordFilterGroupID != "" {
			continue
		}
		part, ok, err := b.recordFilter(recordFilter)
		if err != nil {
			return records.Filter{}, err
		}
		if ok {
			parts = append(parts, part)
		}
	}

	for _, group := range chart.RecordFilterGroups {
		if group.ParentRecordFilterGroupID != "" {
			continue
		}
		part, err := b.group(chart, group)
		if err != nil {
			return records.Filter{}, err
		}
		parts = append(parts, part)
		break
	}

	switch len(parts) {
	case 0:
		return records.Filter{}, nil
	case 1:
		return parts[0], nil
	}
	return and(parts...), nil
}

func (b builder) group(chart ChartFilter, group RecordFilterGroup) (records.Filter, error) {
	var parts []records.Filter
	for _, recordFilter := range chart.RecordFilters {
		if recordFilter.RecordFilterGroupID != group.ID {
			continue
		}
		part, ok, err := b.recordFilter(recordFilter)
		if err != nil {
			return records.Filter{}, err
		}
		if ok {
			parts = append(parts, part)
		}
	}
	for _, child := range chart.RecordFilterGroups {
		if child.ParentRecordFilterGroupID != group.ID {
			continue
		}
		part, err := b.group(chart, child)
		if err != nil {
			return records.Filter{}, err
		}
		parts = append(parts, part)
	}

	switch group.LogicalOperator {
	case "AND":
		return and(parts...), nil
	case "OR":
		return or(parts...), nil
	}
	return records.Filter{}, fmt.Errorf("%w: unknown logical operator %q", ErrInvalidFilter, group.LogicalOperator)
}

func (b builder) recordFilter(recordFilter RecordFilter) (records.Filter, bool, error) {
	field, ok := b.fieldsByID[recordFilter.FieldMetadataID]
	if !ok || !isValueValid(recordFilter) {
		return records.Filter{}, false, nil
	}

	if (field.Type == FieldRelation || field.Type == FieldMorph) && recordFilter.RelationTargetFieldMetadataID != "" {
		if _, ok := b.fieldsByID[recordFilter.RelationTargetFieldMetadataID]; !ok {
			return records.Filter{}, false, nil
		}
		return records.Filter{}, false, fmt.Errorf("%w: filtering through relation %s is not supported", ErrInvalidFilter, field.Name)
	}

	return b.direct(recordFilter, field)
}

func isValueValid(recordFilter RecordFilter) bool {
	switch recordFilter.Operand {
	case "IS_NOT_NULL", "IS_EMPTY", "IS_NOT_EMPTY", "IS_IN_PAST", "IS_IN_FUTURE", "IS_TODAY":
		return true
	}
	return recordFilter.Value != "" && recordFilter.Value != "[]"
}

func unknownOperand(recordFilter RecordFilter, what string) error {
	return fmt.Errorf("%w: unknown operand %s for %s filter", ErrInvalidFilter, recordFilter.Operand, what)
}

func leaf(field, subField string, operand records.Operand, value any) records.Filter {
	return records.Filter{Field: &records.FieldFilter{Field: field, SubField: subField, Operand: operand, Value: value}}
}

func isNull(field, subField string) records.Filter {
	return leaf(field, subField, "is", "NULL")
}

func and(filters ...records.Filter) records.Filter { return records.Filter{And: filters} }

func or(filters ...records.Filter) records.Filter { return records.Filter{Or: filters} }

func not(filter records.Filter) records.Filter { return records.Filter{Not: &filter} }

func notOrNull(excluded records.Filter, field, subField string) records.Filter {
	return or(not(excluded), isNull(field, subField))
}

func containsPattern(value string) string { return "%" + value + "%" }
