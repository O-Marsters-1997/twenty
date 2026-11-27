package recordfilter

import (
	"fmt"

	"github.com/twentyhq/twenty/packages/twenty-server-go/internal/records"
)

func blankOrNull(name, subField string) records.Filter {
	return or(leaf(name, subField, "ilike", ""), isNull(name, subField))
}

func nullOrBlank(name, subField string) records.Filter {
	return or(isNull(name, subField), leaf(name, subField, "ilike", ""))
}

func eqBlankOrNull(name, subField string) records.Filter {
	return or(leaf(name, subField, "eq", ""), isNull(name, subField))
}

func nullOrEmptyList(name, subField string) records.Filter {
	return or(isNull(name, subField), leaf(name, subField, "like", "[]"))
}

func (b builder) emptiness(recordFilter RecordFilter, field Field, filterType FieldType) (records.Filter, bool, error) {
	name, subField := field.Name, recordFilter.SubFieldName
	var empty records.Filter

	switch filterType {
	case FieldText:
		empty = blankOrNull(name, "")
	case FieldPhones:
		switch subField {
		case "":
			empty = and(nullOrBlank(name, "primaryPhoneNumber"), nullOrEmptyList(name, "additionalPhones"))
		case "primaryPhoneNumber", "primaryPhoneCallingCode":
			empty = nullOrBlank(name, subField)
		case "additionalPhones":
			empty = nullOrEmptyList(name, subField)
		default:
			return failed(fmt.Errorf("%w: unsupported composite field name %s for filter type %s", ErrInvalidFilter, subField, filterType))
		}
	case FieldCurrency:
		column := "amountMicros"
		if subField == "currencyCode" {
			column = subField
		}
		empty = or(isNull(name, column))
	case FieldFullName:
		if subField == "" {
			empty = and(nullOrBlank(name, "firstName"), nullOrBlank(name, "lastName"))
		} else {
			empty = blankOrNull(name, subField)
		}
	case FieldLinks:
		switch subField {
		case "":
			empty = and(eqBlankOrNull(name, "primaryLinkLabel"), eqBlankOrNull(name, "primaryLinkUrl"), nullOrEmptyList(name, "secondaryLinks"))
		case "primaryLinkLabel", "primaryLinkUrl":
			empty = eqBlankOrNull(name, subField)
		case "secondaryLinks":
			empty = nullOrEmptyList(name, subField)
		default:
			return failed(fmt.Errorf("%w: unknown subfield name %s", ErrInvalidFilter, subField))
		}
	case FieldEmails:
		switch subField {
		case "":
			empty = and(eqBlankOrNull(name, "primaryEmail"), nullOrEmptyList(name, "additionalEmails"))
		case "primaryEmail":
			empty = eqBlankOrNull(name, subField)
		case "additionalEmails":
			empty = nullOrEmptyList(name, subField)
		default:
			return failed(fmt.Errorf("%w: unknown subfield name %s", ErrInvalidFilter, subField))
		}
	case FieldAddress:
		if subField != "" {
			empty = blankOrNull(name, subField)
			break
		}
		blanks := make([]records.Filter, len(addressSubFields))
		for i, candidate := range []string{"addressStreet1", "addressStreet2", "addressCity", "addressState", "addressCountry", "addressPostcode"} {
			blanks[i] = blankOrNull(name, candidate)
		}
		empty = and(blanks...)
	case FieldNumber, FieldRating, FieldDate, FieldDateTime, FieldSelect, FieldUUID:
		empty = isNull(name, "")
	case FieldMultiSelect:
		empty = or(isNull(name, ""), leaf(name, "", "isEmptyArray", true))
	case FieldRelation:
		empty = isNull(name+"Id", "")
	case FieldActor:
		empty = blankOrNull(name, "name")
	case FieldArray:
		empty = or(isNull(name, ""), leaf(name, "", "isEmptyArray", true))
	case FieldFiles, FieldRawJSON:
		empty = or(isNull(name, ""))
	default:
		return failed(fmt.Errorf("%w: unsupported empty filter type %s", ErrInvalidFilter, filterType))
	}

	if recordFilter.Operand == "IS_NOT_EMPTY" {
		return found(not(empty))
	}
	return found(empty)
}
