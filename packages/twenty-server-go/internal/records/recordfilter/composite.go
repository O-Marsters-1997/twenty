package recordfilter

import (
	"fmt"
	"strings"

	"github.com/twentyhq/twenty/packages/twenty-server-go/internal/records"
)

func unknownSubField(subField, what string) error {
	return fmt.Errorf("%w: unknown subfield %s for %s filter", ErrInvalidFilter, subField, what)
}

func (b builder) links(recordFilter RecordFilter, name string) (records.Filter, bool, error) {
	pattern := containsPattern(recordFilter.Value)
	what := string(FieldLinks)
	secondary := leaf(name, "secondaryLinks", "like", pattern)

	switch subField := recordFilter.SubFieldName; subField {
	case "primaryLinkLabel", "primaryLinkUrl":
		return containsOperands(recordFilter, what, leaf(name, subField, "ilike", pattern), not)
	case "secondaryLinks":
		return containsOperands(recordFilter, what, secondary, func(excluded records.Filter) records.Filter {
			return notOrNull(excluded, name, "secondaryLinks")
		})
	case "":
	default:
		return failed(unknownSubField(subField, what))
	}

	url, label := leaf(name, "primaryLinkUrl", "ilike", pattern), leaf(name, "primaryLinkLabel", "ilike", pattern)
	switch recordFilter.Operand {
	case "CONTAINS":
		return found(or(url, label, secondary))
	case "DOES_NOT_CONTAIN":
		return found(and(not(label), not(url), notOrNull(secondary, name, "secondaryLinks")))
	}
	return failed(unknownOperand(recordFilter, what))
}

func (b builder) emails(recordFilter RecordFilter, name string) (records.Filter, bool, error) {
	pattern := containsPattern(recordFilter.Value)
	what := string(FieldEmails)
	primary := leaf(name, "primaryEmail", "ilike", pattern)
	additional := leaf(name, "additionalEmails", "like", pattern)

	switch subField := recordFilter.SubFieldName; subField {
	case "primaryEmail":
		return containsOperands(recordFilter, what, primary, not)
	case "additionalEmails":
		return containsOperands(recordFilter, what, additional, func(excluded records.Filter) records.Filter {
			return notOrNull(excluded, name, "additionalEmails")
		})
	case "":
	default:
		return failed(unknownSubField(subField, what))
	}

	switch recordFilter.Operand {
	case "CONTAINS":
		return found(or(primary, additional))
	case "DOES_NOT_CONTAIN":
		return found(and(not(primary), notOrNull(additional, name, "additionalEmails")))
	}
	return failed(unknownOperand(recordFilter, what))
}

func fullNameFilters(value, name string) []records.Filter {
	subFields := []string{"firstName", "lastName"}
	tokens := strings.Fields(value)

	if len(tokens) <= 1 {
		token := ""
		if len(tokens) == 1 {
			token = tokens[0]
		}
		filters := make([]records.Filter, len(subFields))
		for i, subField := range subFields {
			filters[i] = leaf(name, subField, "ilike", containsPattern(token))
		}
		return filters
	}

	perToken := make([]records.Filter, len(tokens))
	for i, token := range tokens {
		matches := make([]records.Filter, len(subFields))
		for j, subField := range subFields {
			matches[j] = leaf(name, subField, "ilike", containsPattern(token))
		}
		perToken[i] = or(matches...)
	}
	return []records.Filter{and(perToken...)}
}

func (b builder) fullName(recordFilter RecordFilter, name string) (records.Filter, bool, error) {
	subField := recordFilter.SubFieldName
	switch recordFilter.Operand {
	case "CONTAINS":
		if subField == "" {
			return found(or(fullNameFilters(recordFilter.Value, name)...))
		}
		return found(leaf(name, subField, "ilike", containsPattern(recordFilter.Value)))
	case "DOES_NOT_CONTAIN":
		if subField == "" {
			filters := fullNameFilters(recordFilter.Value, name)
			negated := make([]records.Filter, len(filters))
			for i, filter := range filters {
				negated[i] = not(filter)
			}
			return found(and(negated...))
		}
		return found(not(leaf(name, subField, "ilike", containsPattern(recordFilter.Value))))
	}
	return failed(unknownOperand(recordFilter, string(FieldFullName)))
}

var addressSubFields = []string{"addressStreet1", "addressStreet2", "addressCity", "addressState", "addressCountry", "addressPostcode"}

func (b builder) address(recordFilter RecordFilter, name string) (records.Filter, bool, error) {
	subField, value := recordFilter.SubFieldName, recordFilter.Value
	pattern := containsPattern(value)

	switch recordFilter.Operand {
	case "CONTAINS":
		if subField == "" {
			matches := make([]records.Filter, len(addressSubFields))
			for i, candidate := range addressSubFields {
				matches[i] = leaf(name, candidate, "ilike", pattern)
			}
			return found(or(matches...))
		}
		if subField == "addressCountry" {
			codes, err := parseStringList(value)
			if err != nil {
				return failed(err)
			}
			if len(codes) == 0 {
				return found(records.Filter{})
			}
			return found(leaf(name, subField, "in", codes))
		}
		return found(leaf(name, subField, "ilike", pattern))
	case "DOES_NOT_CONTAIN":
		if subField == "" {
			excluded := make([]records.Filter, 0, len(addressSubFields))
			for _, candidate := range []string{"addressStreet1", "addressStreet2", "addressCity", "addressState", "addressPostcode", "addressCountry"} {
				excluded = append(excluded, notOrNull(leaf(name, candidate, "ilike", pattern), name, candidate))
			}
			return found(and(excluded...))
		}
		if subField == "addressCountry" {
			codes, err := parseStringList(value)
			if err != nil {
				return failed(err)
			}
			if len(codes) == 0 {
				return found(records.Filter{})
			}
			return found(notOrNull(leaf(name, subField, "in", codes), name, subField))
		}
		return found(notOrNull(leaf(name, subField, "ilike", pattern), name, subField))
	}
	return failed(unknownOperand(recordFilter, string(FieldAddress)))
}

func (b builder) phones(recordFilter RecordFilter, name string) (records.Filter, bool, error) {
	what := string(FieldPhones)
	value := recordFilter.Value

	switch subField := recordFilter.SubFieldName; subField {
	case "":
		digits := phoneDigits(value)
		if !strings.ContainsAny(digits, "0123456789") {
			return skipped()
		}
		pattern := containsPattern(digits)
		number := leaf(name, "primaryPhoneNumber", "ilike", pattern)
		callingCode := leaf(name, "primaryPhoneCallingCode", "ilike", pattern)
		additional := leaf(name, "additionalPhones", "like", pattern)
		switch recordFilter.Operand {
		case "CONTAINS":
			return found(or(number, callingCode, additional))
		case "DOES_NOT_CONTAIN":
			return found(and(not(number), not(callingCode), notOrNull(additional, name, "additionalPhones")))
		}
		return failed(unknownOperand(recordFilter, what))
	case "additionalPhones":
		additional := leaf(name, subField, "like", containsPattern(value))
		switch recordFilter.Operand {
		case "CONTAINS":
			return found(or(additional))
		case "DOES_NOT_CONTAIN":
			return found(notOrNull(additional, name, subField))
		}
		return failed(unknownOperand(recordFilter, what))
	case "primaryPhoneNumber", "primaryPhoneCallingCode":
		return containsOperands(recordFilter, what, leaf(name, subField, "ilike", containsPattern(value)), not)
	default:
		return failed(unknownSubField(subField, what))
	}
}

func (b builder) actor(recordFilter RecordFilter, field Field) (records.Filter, bool, error) {
	name, value := field.Name, recordFilter.Value
	what := string(FieldActor)

	switch recordFilter.SubFieldName {
	case "source":
		if recordFilter.Operand != "IS" && recordFilter.Operand != "IS_NOT" {
			return failed(unknownOperand(recordFilter, what))
		}
		sources, err := parseActorSources(value)
		if err != nil {
			return failed(err)
		}
		if recordFilter.Operand == "IS" {
			return found(leaf(name, "source", "in", sources))
		}
		if len(sources) == 0 {
			return skipped()
		}
		return found(not(leaf(name, "source", "in", sources)))
	case "workspaceMemberId":
		selection := parseRelationValue(value)
		ids := selection.ids
		if selection.currentWorkspaceMember && b.deps.CurrentWorkspaceMemberID != "" {
			ids = append(ids[:len(ids):len(ids)], b.deps.CurrentWorkspaceMemberID)
		}
		if len(ids) == 0 {
			return skipped()
		}
		switch recordFilter.Operand {
		case "IS":
			return found(leaf(name, "workspaceMemberId", "in", ids))
		case "IS_NOT":
			return found(notOrNull(leaf(name, "workspaceMemberId", "in", ids), name, "workspaceMemberId"))
		}
		return failed(unknownOperand(recordFilter, what))
	}

	var matchingSources []string
	for _, source := range actorSources {
		if strings.Contains(strings.ToLower(source), strings.ToLower(value)) {
			matchingSources = append(matchingSources, source)
		}
	}
	byName := leaf(name, "name", "ilike", containsPattern(value))
	bySource := leaf(name, "source", "in", matchingSources)

	switch recordFilter.Operand {
	case "CONTAINS":
		filters := []records.Filter{byName}
		if len(matchingSources) > 0 {
			filters = append(filters, bySource)
		}
		return found(or(filters...))
	case "DOES_NOT_CONTAIN":
		filters := []records.Filter{not(byName)}
		if len(matchingSources) > 0 {
			filters = append(filters, not(bySource))
		}
		return found(and(filters...))
	}
	return failed(unknownOperand(recordFilter, what))
}
