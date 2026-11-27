package recordfilter

import (
	"fmt"
	"strconv"
	"strings"
	"time"

	"github.com/twentyhq/twenty/packages/twenty-server-go/internal/records"
)

const sentinelUUID = "00000000-0000-4000-8000-000000000000"

func found(filter records.Filter) (records.Filter, bool, error) { return filter, true, nil }

func skipped() (records.Filter, bool, error) { return records.Filter{}, false, nil }

func failed(err error) (records.Filter, bool, error) { return records.Filter{}, false, err }

func filterTypeOf(fieldType FieldType) FieldType {
	switch fieldType {
	case FieldMorph:
		return FieldRelation
	case FieldNumber, FieldDate, FieldDateTime, FieldBoolean, FieldSelect, FieldMultiSelect, FieldRating,
		FieldFullName, FieldEmails, FieldPhones, FieldLinks, FieldCurrency, FieldAddress, FieldActor,
		FieldRelation, FieldUUID, FieldRawJSON, FieldTSVector, FieldArray, FieldFiles:
		return fieldType
	}
	return FieldText
}

func (b builder) direct(recordFilter RecordFilter, field Field) (records.Filter, bool, error) {
	filterType := filterTypeOf(field.Type)

	if (recordFilter.Operand == "IS_EMPTY" || recordFilter.Operand == "IS_NOT_EMPTY") &&
		filterType != FieldBoolean && filterType != FieldTSVector {
		return b.emptiness(recordFilter, field, filterType)
	}

	name, value := field.Name, recordFilter.Value
	pattern := containsPattern(value)
	what := string(filterType)

	switch filterType {
	case FieldText:
		return containsOperands(recordFilter, what, leaf(name, "", "ilike", pattern), func(excluded records.Filter) records.Filter {
			return not(excluded)
		})
	case FieldTSVector:
		if recordFilter.Operand != "VECTOR_SEARCH" {
			return failed(unknownOperand(recordFilter, what))
		}
		return found(leaf(name, "", "search", value))
	case FieldRawJSON, FieldFiles:
		return containsOperands(recordFilter, what, leaf(name, "", "ilike", pattern), func(excluded records.Filter) records.Filter {
			return notOrNull(excluded, name, "")
		})
	case FieldArray:
		return containsOperands(recordFilter, what, leaf(name, "", "containsIlike", pattern), func(excluded records.Filter) records.Filter {
			return not(excluded)
		})
	case FieldDate:
		return b.date(recordFilter, name)
	case FieldDateTime:
		return b.dateTime(recordFilter, name)
	case FieldRating:
		return b.rating(recordFilter, name)
	case FieldNumber:
		return b.number(recordFilter, name)
	case FieldRelation:
		return b.relation(recordFilter, field)
	case FieldCurrency:
		return b.currency(recordFilter, name)
	case FieldLinks:
		return b.links(recordFilter, name)
	case FieldEmails:
		return b.emails(recordFilter, name)
	case FieldFullName:
		return b.fullName(recordFilter, name)
	case FieldAddress:
		return b.address(recordFilter, name)
	case FieldPhones:
		return b.phones(recordFilter, name)
	case FieldActor:
		return b.actor(recordFilter, field)
	case FieldMultiSelect:
		return b.multiSelect(recordFilter, name)
	case FieldSelect:
		return b.selectOptions(recordFilter, name)
	case FieldBoolean:
		return found(leaf(name, "", "eq", value == "true"))
	case FieldUUID:
		ids := parseUUIDList(value)
		if len(ids) == 0 {
			ids = []string{sentinelUUID}
		}
		switch recordFilter.Operand {
		case "IS":
			return found(leaf(name, "", "in", ids))
		case "IS_NOT":
			return found(not(leaf(name, "", "in", ids)))
		}
	}
	return failed(unknownOperand(recordFilter, what))
}

func containsOperands(recordFilter RecordFilter, what string, contains records.Filter, doesNotContain func(records.Filter) records.Filter) (records.Filter, bool, error) {
	switch recordFilter.Operand {
	case "CONTAINS":
		return found(contains)
	case "DOES_NOT_CONTAIN":
		return found(doesNotContain(contains))
	}
	return failed(unknownOperand(recordFilter, what))
}

func (b builder) date(recordFilter RecordFilter, name string) (records.Filter, bool, error) {
	value := recordFilter.Value
	switch recordFilter.Operand {
	case "IS_RELATIVE":
		start, end, err := b.relativePlainDates(value)
		if err != nil {
			return failed(err)
		}
		return found(and(leaf(name, "", "gte", start), leaf(name, "", "lt", end)))
	case "IS_IN_PAST", "IS_IN_FUTURE", "IS_TODAY":
		location, err := b.timeZone()
		if err != nil {
			return failed(err)
		}
		today := b.now.In(location).Format(plainDateLayout)
		switch recordFilter.Operand {
		case "IS_IN_PAST":
			return found(leaf(name, "", "lt", today))
		case "IS_IN_FUTURE":
			return found(leaf(name, "", "gte", today))
		}
		return found(leaf(name, "", "eq", today))
	case "IS_AFTER":
		return found(leaf(name, "", "gte", value))
	case "IS_BEFORE":
		return found(leaf(name, "", "lt", value))
	case "IS":
		return found(leaf(name, "", "eq", value))
	}
	return failed(unknownOperand(recordFilter, string(FieldDate)))
}

func (b builder) dateTime(recordFilter RecordFilter, name string) (records.Filter, bool, error) {
	between := func(start, end string) (records.Filter, bool, error) {
		return found(and(leaf(name, "", "gte", start), leaf(name, "", "lt", end)))
	}

	switch recordFilter.Operand {
	case "IS_RELATIVE":
		start, end, err := b.relativeInstants(recordFilter.Value)
		if err != nil {
			return failed(err)
		}
		return between(start, end)
	case "IS_IN_PAST", "IS_IN_FUTURE", "IS_TODAY":
		location, err := b.timeZone()
		if err != nil {
			return failed(err)
		}
		now := b.now.In(location)
		switch recordFilter.Operand {
		case "IS_IN_PAST":
			return found(leaf(name, "", "lt", formatInstant(now.Round(time.Minute))))
		case "IS_IN_FUTURE":
			return found(leaf(name, "", "gt", formatInstant(now.Round(time.Minute))))
		}
		return between(formatInstant(periodStart(now, "DAY", "")), formatInstant(nextPeriodStart(now, "DAY", "")))
	case "IS":
		start, end, err := b.dayRangeOf(recordFilter.Value)
		if err != nil {
			return failed(err)
		}
		return between(start, end)
	case "IS_AFTER", "IS_BEFORE":
		instant, err := parseInstant(recordFilter.Value)
		if err != nil {
			return failed(err)
		}
		if recordFilter.Operand == "IS_AFTER" {
			return found(leaf(name, "", "gte", formatInstant(instant)))
		}
		return found(leaf(name, "", "lt", formatInstant(instant)))
	}
	return failed(unknownOperand(recordFilter, string(FieldDateTime)))
}

func ratingValues(keep func(rating int) bool) []string {
	var values []string
	for rating := 1; rating <= 5; rating++ {
		if keep(rating) {
			values = append(values, "RATING_"+strconv.Itoa(rating))
		}
	}
	return values
}

func (b builder) rating(recordFilter RecordFilter, name string) (records.Filter, bool, error) {
	number, err := parseNumber(recordFilter.Value)
	if err != nil {
		return failed(err)
	}
	equal := leaf(name, "", "eq", "RATING_"+strconv.FormatFloat(number, 'f', -1, 64))
	switch recordFilter.Operand {
	case "IS":
		return found(equal)
	case "IS_NOT":
		return found(not(equal))
	case "GREATER_THAN_OR_EQUAL":
		return found(leaf(name, "", "in", ratingValues(func(rating int) bool { return float64(rating) >= number })))
	case "LESS_THAN_OR_EQUAL":
		return found(leaf(name, "", "in", ratingValues(func(rating int) bool { return float64(rating) <= number })))
	}
	return failed(unknownOperand(recordFilter, string(FieldRating)))
}

func numericOperand(operand string) (records.Operand, bool) {
	switch operand {
	case "GREATER_THAN_OR_EQUAL":
		return "gte", true
	case "LESS_THAN_OR_EQUAL":
		return "lte", true
	case "IS":
		return "eq", true
	case "IS_NOT":
		return "neq", true
	}
	return "", false
}

func (b builder) number(recordFilter RecordFilter, name string) (records.Filter, bool, error) {
	operand, known := numericOperand(recordFilter.Operand)
	if !known {
		return failed(unknownOperand(recordFilter, string(FieldNumber)))
	}
	number, err := parseNumber(recordFilter.Value)
	if err != nil {
		return failed(err)
	}
	return found(leaf(name, "", operand, number))
}

func capitalise(value string) string {
	if value == "" {
		return value
	}
	return strings.ToUpper(value[:1]) + value[1:]
}

func (b builder) relationJoinColumn(field Field) (string, bool) {
	if field.Type != FieldMorph {
		return field.Name + "Id", true
	}
	if b.deps.CurrentRecord == nil {
		return "", false
	}
	for _, morph := range field.MorphRelations {
		if morph.TargetNameSingular != b.deps.CurrentRecord.ObjectNameSingular {
			continue
		}
		target := morph.TargetNameSingular
		if morph.RelationType == "ONE_TO_MANY" {
			target = morph.TargetNamePlural
		}
		return field.Name + capitalise(target) + "Id", true
	}
	return "", false
}

func (b builder) relation(recordFilter RecordFilter, field Field) (records.Filter, bool, error) {
	selection := parseRelationValue(recordFilter.Value)
	ids := selection.ids
	if selection.currentWorkspaceMember && b.deps.CurrentWorkspaceMemberID != "" {
		ids = append(ids[:len(ids):len(ids)], b.deps.CurrentWorkspaceMemberID)
	}
	if selection.currentRecord && b.deps.CurrentRecord != nil && b.deps.CurrentRecord.ID != "" {
		ids = append(ids[:len(ids):len(ids)], b.deps.CurrentRecord.ID)
	}
	if len(ids) == 0 {
		return skipped()
	}

	column, ok := b.relationJoinColumn(field)
	if !ok {
		return skipped()
	}

	switch recordFilter.Operand {
	case "IS":
		return found(leaf(column, "", "in", ids))
	case "IS_NOT":
		return found(notOrNull(leaf(column, "", "in", ids), column, ""))
	}
	return failed(unknownOperand(recordFilter, string(FieldRelation)))
}

func (b builder) currency(recordFilter RecordFilter, name string) (records.Filter, bool, error) {
	subField := recordFilter.SubFieldName
	switch subField {
	case "currencyCode":
		codes, err := parseStringList(recordFilter.Value)
		if err != nil {
			return failed(err)
		}
		if len(codes) == 0 {
			return skipped()
		}
		matching := leaf(name, subField, "in", codes)
		switch recordFilter.Operand {
		case "IS":
			return found(matching)
		case "IS_NOT":
			return found(not(matching))
		}
		return failed(unknownOperand(recordFilter, "CURRENCY / currencyCode"))
	case "", "amountMicros":
		operand, known := numericOperand(recordFilter.Operand)
		if !known {
			return failed(unknownOperand(recordFilter, "CURRENCY / amountMicros"))
		}
		amount, err := parseNumber(recordFilter.Value)
		if err != nil {
			return failed(err)
		}
		return found(leaf(name, "amountMicros", operand, currencyMicros(amount)))
	}
	return failed(fmt.Errorf("%w: unknown subfield %s for CURRENCY filter", ErrInvalidFilter, subField))
}

func (b builder) multiSelect(recordFilter RecordFilter, name string) (records.Filter, bool, error) {
	options, err := parseStringList(recordFilter.Value)
	if err != nil {
		return failed(err)
	}
	if len(options) == 0 {
		return skipped()
	}
	nonEmpty, hasEmpty := splitEmptyOption(options)

	switch recordFilter.Operand {
	case "CONTAINS":
		var conditions []records.Filter
		if len(nonEmpty) > 0 {
			conditions = append(conditions, leaf(name, "", "containsAny", nonEmpty))
		}
		if hasEmpty {
			conditions = append(conditions, leaf(name, "", "isEmptyArray", true))
		}
		return found(oneOrJoin(conditions, or))
	case "DOES_NOT_CONTAIN":
		return found(or(
			not(leaf(name, "", "containsAny", nonEmpty)),
			leaf(name, "", "isEmptyArray", true),
			isNull(name, ""),
		))
	}
	return failed(unknownOperand(recordFilter, string(FieldMultiSelect)))
}

func (b builder) selectOptions(recordFilter RecordFilter, name string) (records.Filter, bool, error) {
	options, err := parseStringList(recordFilter.Value)
	if err != nil {
		return failed(err)
	}
	if len(options) == 0 {
		return skipped()
	}
	nonEmpty, hasEmpty := splitEmptyOption(options)

	var conditions []records.Filter
	switch recordFilter.Operand {
	case "IS":
		if len(nonEmpty) > 0 {
			conditions = append(conditions, leaf(name, "", "in", nonEmpty))
		}
		if hasEmpty {
			conditions = append(conditions, isNull(name, ""))
		}
		return found(oneOrJoin(conditions, or))
	case "IS_NOT":
		if len(nonEmpty) > 0 {
			conditions = append(conditions, not(leaf(name, "", "in", nonEmpty)))
		}
		if hasEmpty {
			conditions = append(conditions, not(isNull(name, "")))
		}
		return found(oneOrJoin(conditions, and))
	}
	return failed(unknownOperand(recordFilter, string(FieldSelect)))
}

func splitEmptyOption(options []string) ([]string, bool) {
	var nonEmpty []string
	hasEmpty := false
	for _, option := range options {
		if option == "" {
			hasEmpty = true
			continue
		}
		nonEmpty = append(nonEmpty, option)
	}
	return nonEmpty, hasEmpty
}

func oneOrJoin(conditions []records.Filter, join func(...records.Filter) records.Filter) records.Filter {
	if len(conditions) == 1 {
		return conditions[0]
	}
	return join(conditions...)
}
