package recordfilter_test

import (
	"errors"
	"testing"
	"time"

	"github.com/google/go-cmp/cmp"

	"github.com/twentyhq/twenty/packages/twenty-server-go/internal/records"
	"github.com/twentyhq/twenty/packages/twenty-server-go/internal/records/recordfilter"
)

const (
	companyID  = "550e8400-e29b-41d4-a716-446655440000"
	memberID   = "11111111-1111-4111-8111-111111111111"
	recordID   = "22222222-2222-4222-8222-222222222222"
	notAUUID   = "not-a-uuid"
	sentinelID = "00000000-0000-4000-8000-000000000000"
)

var testFields = []recordfilter.Field{
	{ID: "text", Name: "name", Type: recordfilter.FieldText},
	{ID: "number", Name: "amount", Type: recordfilter.FieldNumber},
	{ID: "date", Name: "closeDate", Type: recordfilter.FieldDate},
	{ID: "datetime", Name: "updatedAt", Type: recordfilter.FieldDateTime},
	{ID: "select", Name: "status", Type: recordfilter.FieldSelect},
	{ID: "multiselect", Name: "tags", Type: recordfilter.FieldMultiSelect},
	{ID: "rating", Name: "rating", Type: recordfilter.FieldRating},
	{ID: "relation", Name: "company", Type: recordfilter.FieldRelation},
	{ID: "morph", Name: "target", Type: recordfilter.FieldMorph, MorphRelations: []recordfilter.MorphRelation{
		{RelationType: "MANY_TO_ONE", TargetNameSingular: "person", TargetNamePlural: "people"},
		{RelationType: "ONE_TO_MANY", TargetNameSingular: "company", TargetNamePlural: "companies"},
	}},
	{ID: "bool", Name: "isActive", Type: recordfilter.FieldBoolean},
	{ID: "rawjson", Name: "metadata", Type: recordfilter.FieldRawJSON},
	{ID: "files", Name: "attachments", Type: recordfilter.FieldFiles},
	{ID: "tsvector", Name: "searchVector", Type: recordfilter.FieldTSVector},
	{ID: "currency", Name: "revenue", Type: recordfilter.FieldCurrency},
	{ID: "fullname", Name: "fullName", Type: recordfilter.FieldFullName},
	{ID: "address", Name: "location", Type: recordfilter.FieldAddress},
	{ID: "actor", Name: "createdBy", Type: recordfilter.FieldActor},
	{ID: "phones", Name: "phones", Type: recordfilter.FieldPhones},
	{ID: "emails", Name: "emails", Type: recordfilter.FieldEmails},
	{ID: "links", Name: "website", Type: recordfilter.FieldLinks},
	{ID: "array", Name: "items", Type: recordfilter.FieldArray},
	{ID: "uuid", Name: "id", Type: recordfilter.FieldUUID},
}

var fixedNow = time.Date(2026, time.March, 18, 10, 30, 45, 500_000_000, time.UTC)

func leaf(field, subField string, operand records.Operand, value any) records.Filter {
	return records.Filter{Field: &records.FieldFilter{Field: field, SubField: subField, Operand: operand, Value: value}}
}

func isNull(field, subField string) records.Filter { return leaf(field, subField, "is", "NULL") }

func and(filters ...records.Filter) records.Filter { return records.Filter{And: filters} }

func or(filters ...records.Filter) records.Filter { return records.Filter{Or: filters} }

func not(filter records.Filter) records.Filter { return records.Filter{Not: &filter} }

func notOrNull(excluded records.Filter, field, subField string) records.Filter {
	return or(not(excluded), isNull(field, subField))
}

func filterOn(fieldID, operand, value string) recordfilter.RecordFilter {
	return recordfilter.RecordFilter{FieldMetadataID: fieldID, Operand: operand, Value: value}
}

func subFilterOn(fieldID, subField, operand, value string) recordfilter.RecordFilter {
	return recordfilter.RecordFilter{FieldMetadataID: fieldID, SubFieldName: subField, Operand: operand, Value: value}
}

func toFilter(t *testing.T, chart recordfilter.ChartFilter, deps recordfilter.Dependencies) (records.Filter, error) {
	t.Helper()
	if deps.Now.IsZero() {
		deps.Now = fixedNow
	}
	return recordfilter.ToFilter(testFields, chart, deps)
}

func single(recordFilter recordfilter.RecordFilter) recordfilter.ChartFilter {
	return recordfilter.ChartFilter{RecordFilters: []recordfilter.RecordFilter{recordFilter}}
}

func TestToFilter_FieldTypes(t *testing.T) {
	t.Parallel()

	pattern := func(value string) string { return "%" + value + "%" }

	tests := []struct {
		name   string
		filter recordfilter.RecordFilter
		want   records.Filter
	}{
		{"text contains", filterOn("text", "CONTAINS", "Acme"), leaf("name", "", "ilike", pattern("Acme"))},
		{"text does not contain", filterOn("text", "DOES_NOT_CONTAIN", "Acme"), not(leaf("name", "", "ilike", pattern("Acme")))},
		{"text is empty", filterOn("text", "IS_EMPTY", ""), or(leaf("name", "", "ilike", ""), isNull("name", ""))},
		{"text is not empty", filterOn("text", "IS_NOT_EMPTY", ""), not(or(leaf("name", "", "ilike", ""), isNull("name", "")))},

		{"number is", filterOn("number", "IS", "42"), leaf("amount", "", "eq", 42.0)},
		{"number is not", filterOn("number", "IS_NOT", "4.5"), leaf("amount", "", "neq", 4.5)},
		{"number gte", filterOn("number", "GREATER_THAN_OR_EQUAL", "10"), leaf("amount", "", "gte", 10.0)},
		{"number lte", filterOn("number", "LESS_THAN_OR_EQUAL", "10"), leaf("amount", "", "lte", 10.0)},
		{"number lenient prefix", filterOn("number", "IS", "12abc"), leaf("amount", "", "eq", 12.0)},
		{"number is empty", filterOn("number", "IS_EMPTY", ""), isNull("amount", "")},

		{"rating is", filterOn("rating", "IS", "3"), leaf("rating", "", "eq", "RATING_3")},
		{"rating is not", filterOn("rating", "IS_NOT", "3"), not(leaf("rating", "", "eq", "RATING_3"))},
		{"rating gte", filterOn("rating", "GREATER_THAN_OR_EQUAL", "4"), leaf("rating", "", "in", []string{"RATING_4", "RATING_5"})},
		{"rating lte", filterOn("rating", "LESS_THAN_OR_EQUAL", "2"), leaf("rating", "", "in", []string{"RATING_1", "RATING_2"})},

		{"boolean true", filterOn("bool", "IS", "true"), leaf("isActive", "", "eq", true)},
		{"boolean false", filterOn("bool", "IS", "false"), leaf("isActive", "", "eq", false)},
		{"boolean garbage is false", filterOn("bool", "IS", "yes"), leaf("isActive", "", "eq", false)},
		{"boolean empty operand still compares", filterOn("bool", "IS_EMPTY", ""), leaf("isActive", "", "eq", false)},

		{"select is", filterOn("select", "IS", `["ACTIVE"]`), leaf("status", "", "in", []string{"ACTIVE"})},
		{"select is with empty option", filterOn("select", "IS", `["ACTIVE",""]`), or(leaf("status", "", "in", []string{"ACTIVE"}), isNull("status", ""))},
		{"select is only empty option", filterOn("select", "IS", `[""]`), isNull("status", "")},
		{"select is not", filterOn("select", "IS_NOT", `["ACTIVE"]`), not(leaf("status", "", "in", []string{"ACTIVE"}))},
		{"select is not with empty option", filterOn("select", "IS_NOT", `["ACTIVE",""]`), and(not(leaf("status", "", "in", []string{"ACTIVE"})), not(isNull("status", "")))},
		{"select variable", filterOn("select", "IS", "{{workflow.status}}"), leaf("status", "", "in", []string{"{{workflow.status}}"})},
		{"select is empty", filterOn("select", "IS_EMPTY", ""), isNull("status", "")},

		{"multi select contains", filterOn("multiselect", "CONTAINS", `["a","b"]`), leaf("tags", "", "containsAny", []string{"a", "b"})},
		{"multi select contains empty option", filterOn("multiselect", "CONTAINS", `["a",""]`), or(leaf("tags", "", "containsAny", []string{"a"}), leaf("tags", "", "isEmptyArray", true))},
		{"multi select contains only empty option", filterOn("multiselect", "CONTAINS", `[""]`), leaf("tags", "", "isEmptyArray", true)},
		{"multi select does not contain", filterOn("multiselect", "DOES_NOT_CONTAIN", `["a"]`), or(
			not(leaf("tags", "", "containsAny", []string{"a"})), leaf("tags", "", "isEmptyArray", true), isNull("tags", ""),
		)},
		{"multi select is empty", filterOn("multiselect", "IS_EMPTY", ""), or(isNull("tags", ""), leaf("tags", "", "isEmptyArray", true))},

		{"relation is", filterOn("relation", "IS", `["`+companyID+`"]`), leaf("companyId", "", "in", []string{companyID})},
		{"relation is not", filterOn("relation", "IS_NOT", `["`+companyID+`"]`), notOrNull(leaf("companyId", "", "in", []string{companyID}), "companyId", "")},
		{"relation bare uuid", filterOn("relation", "IS", companyID), leaf("companyId", "", "in", []string{companyID})},
		{"relation is empty", filterOn("relation", "IS_EMPTY", ""), isNull("companyId", "")},
		{"relation without resolvable ids is dropped", filterOn("relation", "IS", `["`+notAUUID+`"]`), records.Filter{}},

		{"raw json contains", filterOn("rawjson", "CONTAINS", "x"), leaf("metadata", "", "ilike", pattern("x"))},
		{"raw json does not contain", filterOn("rawjson", "DOES_NOT_CONTAIN", "x"), notOrNull(leaf("metadata", "", "ilike", pattern("x")), "metadata", "")},
		{"raw json is empty", filterOn("rawjson", "IS_EMPTY", ""), or(isNull("metadata", ""))},
		{"files contains", filterOn("files", "CONTAINS", "x"), leaf("attachments", "", "ilike", pattern("x"))},
		{"files does not contain", filterOn("files", "DOES_NOT_CONTAIN", "x"), notOrNull(leaf("attachments", "", "ilike", pattern("x")), "attachments", "")},
		{"vector search", filterOn("tsvector", "VECTOR_SEARCH", "acme"), leaf("searchVector", "", "search", "acme")},
		{"array contains", filterOn("array", "CONTAINS", "x"), leaf("items", "", "containsIlike", pattern("x"))},
		{"array does not contain", filterOn("array", "DOES_NOT_CONTAIN", "x"), not(leaf("items", "", "containsIlike", pattern("x")))},
		{"array is empty", filterOn("array", "IS_EMPTY", ""), or(isNull("items", ""), leaf("items", "", "isEmptyArray", true))},

		{"uuid is", filterOn("uuid", "IS", companyID), leaf("id", "", "in", []string{companyID})},
		{"uuid is not", filterOn("uuid", "IS_NOT", `["`+companyID+`"]`), not(leaf("id", "", "in", []string{companyID}))},
		{"uuid invalid falls back to sentinel", filterOn("uuid", "IS", notAUUID), leaf("id", "", "in", []string{sentinelID})},
		{"uuid is empty", filterOn("uuid", "IS_EMPTY", ""), isNull("id", "")},

		{"currency amount gte rounds to micros", filterOn("currency", "GREATER_THAN_OR_EQUAL", "12.5"), leaf("revenue", "amountMicros", "gte", 12_500_000.0)},
		{"currency amount is", subFilterOn("currency", "amountMicros", "IS", "0.1234565"), leaf("revenue", "amountMicros", "eq", 123457.0)},
		{"currency amount is not", filterOn("currency", "IS_NOT", "3"), leaf("revenue", "amountMicros", "neq", 3_000_000.0)},
		{"currency code is", subFilterOn("currency", "currencyCode", "IS", `["USD","EUR"]`), leaf("revenue", "currencyCode", "in", []string{"USD", "EUR"})},
		{"currency code is not", subFilterOn("currency", "currencyCode", "IS_NOT", `["USD"]`), not(leaf("revenue", "currencyCode", "in", []string{"USD"}))},
		{"currency is empty", filterOn("currency", "IS_EMPTY", ""), or(isNull("revenue", "amountMicros"))},
		{"currency code is empty", subFilterOn("currency", "currencyCode", "IS_EMPTY", ""), or(isNull("revenue", "currencyCode"))},

		{"full name contains one token", filterOn("fullname", "CONTAINS", "john"), or(
			leaf("fullName", "firstName", "ilike", pattern("john")), leaf("fullName", "lastName", "ilike", pattern("john")),
		)},
		{"full name contains two tokens", filterOn("fullname", "CONTAINS", "john  smith"), or(and(
			or(leaf("fullName", "firstName", "ilike", pattern("john")), leaf("fullName", "lastName", "ilike", pattern("john"))),
			or(leaf("fullName", "firstName", "ilike", pattern("smith")), leaf("fullName", "lastName", "ilike", pattern("smith"))),
		))},
		{"full name contains subfield", subFilterOn("fullname", "firstName", "CONTAINS", "jo"), leaf("fullName", "firstName", "ilike", pattern("jo"))},
		{"full name does not contain", filterOn("fullname", "DOES_NOT_CONTAIN", "john"), and(
			not(leaf("fullName", "firstName", "ilike", pattern("john"))), not(leaf("fullName", "lastName", "ilike", pattern("john"))),
		)},
		{"full name does not contain subfield", subFilterOn("fullname", "lastName", "DOES_NOT_CONTAIN", "x"), not(leaf("fullName", "lastName", "ilike", pattern("x")))},
		{"full name is empty", filterOn("fullname", "IS_EMPTY", ""), and(
			or(isNull("fullName", "firstName"), leaf("fullName", "firstName", "ilike", "")),
			or(isNull("fullName", "lastName"), leaf("fullName", "lastName", "ilike", "")),
		)},

		{"address contains", filterOn("address", "CONTAINS", "x"), or(
			leaf("location", "addressStreet1", "ilike", pattern("x")),
			leaf("location", "addressStreet2", "ilike", pattern("x")),
			leaf("location", "addressCity", "ilike", pattern("x")),
			leaf("location", "addressState", "ilike", pattern("x")),
			leaf("location", "addressCountry", "ilike", pattern("x")),
			leaf("location", "addressPostcode", "ilike", pattern("x")),
		)},
		{"address country contains", subFilterOn("address", "addressCountry", "CONTAINS", `["US","GB"]`), leaf("location", "addressCountry", "in", []string{"US", "GB"})},
		{"address city contains", subFilterOn("address", "addressCity", "CONTAINS", "Lon"), leaf("location", "addressCity", "ilike", pattern("Lon"))},
		{"address does not contain", filterOn("address", "DOES_NOT_CONTAIN", "x"), and(
			notOrNull(leaf("location", "addressStreet1", "ilike", pattern("x")), "location", "addressStreet1"),
			notOrNull(leaf("location", "addressStreet2", "ilike", pattern("x")), "location", "addressStreet2"),
			notOrNull(leaf("location", "addressCity", "ilike", pattern("x")), "location", "addressCity"),
			notOrNull(leaf("location", "addressState", "ilike", pattern("x")), "location", "addressState"),
			notOrNull(leaf("location", "addressPostcode", "ilike", pattern("x")), "location", "addressPostcode"),
			notOrNull(leaf("location", "addressCountry", "ilike", pattern("x")), "location", "addressCountry"),
		)},
		{"address country does not contain", subFilterOn("address", "addressCountry", "DOES_NOT_CONTAIN", `["US"]`), notOrNull(leaf("location", "addressCountry", "in", []string{"US"}), "location", "addressCountry")},
		{"address city does not contain", subFilterOn("address", "addressCity", "DOES_NOT_CONTAIN", "x"), notOrNull(leaf("location", "addressCity", "ilike", pattern("x")), "location", "addressCity")},
		{"address country with an empty code", subFilterOn("address", "addressCountry", "CONTAINS", `[""]`), leaf("location", "addressCountry", "in", []string{""})},
		{"address is empty by subfield", subFilterOn("address", "addressCity", "IS_EMPTY", ""), or(leaf("location", "addressCity", "ilike", ""), isNull("location", "addressCity"))},

		{"actor contains matching a source", filterOn("actor", "CONTAINS", "man"), or(
			leaf("createdBy", "name", "ilike", pattern("man")), leaf("createdBy", "source", "in", []string{"MANUAL"}),
		)},
		{"actor contains without a matching source", filterOn("actor", "CONTAINS", "zzz"), or(leaf("createdBy", "name", "ilike", pattern("zzz")))},
		{"actor does not contain matching a source", filterOn("actor", "DOES_NOT_CONTAIN", "api"), and(
			not(leaf("createdBy", "name", "ilike", pattern("api"))), not(leaf("createdBy", "source", "in", []string{"API"})),
		)},
		{"actor does not contain without a matching source", filterOn("actor", "DOES_NOT_CONTAIN", "zzz"), and(not(leaf("createdBy", "name", "ilike", pattern("zzz"))))},
		{"actor source is", subFilterOn("actor", "source", "IS", `["API","IMPORT"]`), leaf("createdBy", "source", "in", []string{"API", "IMPORT"})},
		{"actor source is not", subFilterOn("actor", "source", "IS_NOT", `["API"]`), not(leaf("createdBy", "source", "in", []string{"API"}))},
		{"actor workspace member is", subFilterOn("actor", "workspaceMemberId", "IS", `["`+memberID+`"]`), leaf("createdBy", "workspaceMemberId", "in", []string{memberID})},
		{"actor workspace member is not", subFilterOn("actor", "workspaceMemberId", "IS_NOT", `["`+memberID+`"]`), notOrNull(leaf("createdBy", "workspaceMemberId", "in", []string{memberID}), "createdBy", "workspaceMemberId")},
		{"actor is empty", filterOn("actor", "IS_EMPTY", ""), or(leaf("createdBy", "name", "ilike", ""), isNull("createdBy", "name"))},

		{"phones contains strips formatting", filterOn("phones", "CONTAINS", " +44 (0)20-7946 "), or(
			leaf("phones", "primaryPhoneNumber", "ilike", pattern("+440207946")),
			leaf("phones", "primaryPhoneCallingCode", "ilike", pattern("+440207946")),
			leaf("phones", "additionalPhones", "like", pattern("+440207946")),
		)},
		{"phones without digits is dropped", filterOn("phones", "CONTAINS", "abc"), records.Filter{}},
		{"phones does not contain", filterOn("phones", "DOES_NOT_CONTAIN", "123"), and(
			not(leaf("phones", "primaryPhoneNumber", "ilike", pattern("123"))),
			not(leaf("phones", "primaryPhoneCallingCode", "ilike", pattern("123"))),
			notOrNull(leaf("phones", "additionalPhones", "like", pattern("123")), "phones", "additionalPhones"),
		)},
		{"phones primary number contains", subFilterOn("phones", "primaryPhoneNumber", "CONTAINS", "12"), leaf("phones", "primaryPhoneNumber", "ilike", pattern("12"))},
		{"phones primary number does not contain", subFilterOn("phones", "primaryPhoneNumber", "DOES_NOT_CONTAIN", "12"), not(leaf("phones", "primaryPhoneNumber", "ilike", pattern("12")))},
		{"phones additional contains", subFilterOn("phones", "additionalPhones", "CONTAINS", "12"), or(leaf("phones", "additionalPhones", "like", pattern("12")))},
		{"phones additional does not contain", subFilterOn("phones", "additionalPhones", "DOES_NOT_CONTAIN", "12"), notOrNull(leaf("phones", "additionalPhones", "like", pattern("12")), "phones", "additionalPhones")},
		{"phones is empty", filterOn("phones", "IS_EMPTY", ""), and(
			or(isNull("phones", "primaryPhoneNumber"), leaf("phones", "primaryPhoneNumber", "ilike", "")),
			or(isNull("phones", "additionalPhones"), leaf("phones", "additionalPhones", "like", "[]")),
		)},

		{"emails contains", filterOn("emails", "CONTAINS", "acme"), or(
			leaf("emails", "primaryEmail", "ilike", pattern("acme")), leaf("emails", "additionalEmails", "like", pattern("acme")),
		)},
		{"emails does not contain", filterOn("emails", "DOES_NOT_CONTAIN", "acme"), and(
			not(leaf("emails", "primaryEmail", "ilike", pattern("acme"))),
			notOrNull(leaf("emails", "additionalEmails", "like", pattern("acme")), "emails", "additionalEmails"),
		)},
		{"emails primary contains", subFilterOn("emails", "primaryEmail", "CONTAINS", "acme"), leaf("emails", "primaryEmail", "ilike", pattern("acme"))},
		{"emails additional does not contain", subFilterOn("emails", "additionalEmails", "DOES_NOT_CONTAIN", "acme"), notOrNull(leaf("emails", "additionalEmails", "like", pattern("acme")), "emails", "additionalEmails")},
		{"emails is not empty", filterOn("emails", "IS_NOT_EMPTY", ""), not(and(
			or(leaf("emails", "primaryEmail", "eq", ""), isNull("emails", "primaryEmail")),
			or(isNull("emails", "additionalEmails"), leaf("emails", "additionalEmails", "like", "[]")),
		))},

		{"links contains", filterOn("links", "CONTAINS", "x"), or(
			leaf("website", "primaryLinkUrl", "ilike", pattern("x")),
			leaf("website", "primaryLinkLabel", "ilike", pattern("x")),
			leaf("website", "secondaryLinks", "like", pattern("x")),
		)},
		{"links does not contain", filterOn("links", "DOES_NOT_CONTAIN", "x"), and(
			not(leaf("website", "primaryLinkLabel", "ilike", pattern("x"))),
			not(leaf("website", "primaryLinkUrl", "ilike", pattern("x"))),
			notOrNull(leaf("website", "secondaryLinks", "like", pattern("x")), "website", "secondaryLinks"),
		)},
		{"links url contains", subFilterOn("links", "primaryLinkUrl", "CONTAINS", "x"), leaf("website", "primaryLinkUrl", "ilike", pattern("x"))},
		{"links secondary does not contain", subFilterOn("links", "secondaryLinks", "DOES_NOT_CONTAIN", "x"), notOrNull(leaf("website", "secondaryLinks", "like", pattern("x")), "website", "secondaryLinks")},
		{"links is empty", filterOn("links", "IS_EMPTY", ""), and(
			or(leaf("website", "primaryLinkLabel", "eq", ""), isNull("website", "primaryLinkLabel")),
			or(leaf("website", "primaryLinkUrl", "eq", ""), isNull("website", "primaryLinkUrl")),
			or(isNull("website", "secondaryLinks"), leaf("website", "secondaryLinks", "like", "[]")),
		)},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()
			got, err := toFilter(t, single(tt.filter), recordfilter.Dependencies{})
			if err != nil {
				t.Fatalf("ToFilter() error = %v", err)
			}
			if diff := cmp.Diff(tt.want, got); diff != "" {
				t.Errorf("ToFilter() mismatch (-want +got):\n%s", diff)
			}
		})
	}
}

func TestToFilter_Dates(t *testing.T) {
	t.Parallel()

	between := func(field, start, end string) records.Filter {
		return and(leaf(field, "", "gte", start), leaf(field, "", "lt", end))
	}

	tests := []struct {
		name     string
		filter   recordfilter.RecordFilter
		timeZone string
		want     records.Filter
	}{
		{"date is", filterOn("date", "IS", "2026-03-10"), "", leaf("closeDate", "", "eq", "2026-03-10")},
		{"date is after", filterOn("date", "IS_AFTER", "2026-03-10"), "", leaf("closeDate", "", "gte", "2026-03-10")},
		{"date is before", filterOn("date", "IS_BEFORE", "2026-03-10"), "", leaf("closeDate", "", "lt", "2026-03-10")},
		{"date is in past", filterOn("date", "IS_IN_PAST", ""), "", leaf("closeDate", "", "lt", "2026-03-18")},
		{"date is in future", filterOn("date", "IS_IN_FUTURE", ""), "", leaf("closeDate", "", "gte", "2026-03-18")},
		{"date is today", filterOn("date", "IS_TODAY", ""), "", leaf("closeDate", "", "eq", "2026-03-18")},
		{"date is today ahead of utc", filterOn("date", "IS_TODAY", ""), "Pacific/Auckland", leaf("closeDate", "", "eq", "2026-03-18")},
		{"date is today behind utc", filterOn("date", "IS_TODAY", ""), "Pacific/Pago_Pago", leaf("closeDate", "", "eq", "2026-03-17")},
		{"date is empty", filterOn("date", "IS_EMPTY", ""), "", isNull("closeDate", "")},

		{"date past days", filterOn("date", "IS_RELATIVE", "PAST_7_DAY"), "", between("closeDate", "2026-03-11", "2026-03-18")},
		{"date next days", filterOn("date", "IS_RELATIVE", "NEXT_3_DAY"), "", between("closeDate", "2026-03-19", "2026-03-22")},
		{"date this week starts on monday", filterOn("date", "IS_RELATIVE", "THIS_1_WEEK"), "", between("closeDate", "2026-03-16", "2026-03-23")},
		{"date this week starts on sunday", filterOn("date", "IS_RELATIVE", "THIS_1_WEEK;;UTC;;SUNDAY;;"), "", between("closeDate", "2026-03-15", "2026-03-22")},
		{"date this week starts on saturday", filterOn("date", "IS_RELATIVE", "THIS_1_WEEK;;UTC;;SATURDAY;;"), "", between("closeDate", "2026-03-14", "2026-03-21")},
		{"date past weeks", filterOn("date", "IS_RELATIVE", "PAST_2_WEEK"), "", between("closeDate", "2026-03-02", "2026-03-16")},
		{"date next months", filterOn("date", "IS_RELATIVE", "NEXT_2_MONTH"), "", between("closeDate", "2026-04-01", "2026-06-01")},
		{"date this quarter", filterOn("date", "IS_RELATIVE", "THIS_1_QUARTER"), "", between("closeDate", "2026-01-01", "2026-04-01")},
		{"date past years", filterOn("date", "IS_RELATIVE", "PAST_1_YEAR"), "", between("closeDate", "2025-01-01", "2026-01-01")},
		{"date relative in the value's own zone", filterOn("date", "IS_RELATIVE", "THIS_1_DAY;;Pacific/Pago_Pago;;"), "", between("closeDate", "2026-03-17", "2026-03-18")},
		{"date relative ignores the dependency zone", filterOn("date", "IS_RELATIVE", "THIS_1_DAY"), "Pacific/Pago_Pago", between("closeDate", "2026-03-18", "2026-03-19")},
		{"date relative unparseable falls back to yesterday", filterOn("date", "IS_RELATIVE", "garbage"), "", between("closeDate", "2026-03-17", "2026-03-18")},

		{"date time is in past", filterOn("datetime", "IS_IN_PAST", ""), "", leaf("updatedAt", "", "lt", "2026-03-18T10:31:00Z")},
		{"date time is in future", filterOn("datetime", "IS_IN_FUTURE", ""), "", leaf("updatedAt", "", "gt", "2026-03-18T10:31:00Z")},
		{"date time is today in utc", filterOn("datetime", "IS_TODAY", ""), "UTC", between("updatedAt", "2026-03-18T00:00:00Z", "2026-03-19T00:00:00Z")},
		{"date time is today in new york", filterOn("datetime", "IS_TODAY", ""), "America/New_York", between("updatedAt", "2026-03-18T04:00:00Z", "2026-03-19T04:00:00Z")},
		{"date time is a plain date in new york", filterOn("datetime", "IS", "2026-03-10"), "America/New_York", between("updatedAt", "2026-03-10T04:00:00Z", "2026-03-11T04:00:00Z")},
		{"date time is an instant in new york", filterOn("datetime", "IS", "2026-03-10T02:00:00Z"), "America/New_York", between("updatedAt", "2026-03-09T04:00:00Z", "2026-03-10T04:00:00Z")},
		{"date time is across the spring forward", filterOn("datetime", "IS", "2026-03-08"), "America/New_York", between("updatedAt", "2026-03-08T05:00:00Z", "2026-03-09T04:00:00Z")},
		{"date time is after", filterOn("datetime", "IS_AFTER", "2026-03-10T05:00:00+01:00"), "", leaf("updatedAt", "", "gte", "2026-03-10T04:00:00Z")},
		{"date time is before", filterOn("datetime", "IS_BEFORE", "2026-03-10T05:00:00.25Z"), "", leaf("updatedAt", "", "lt", "2026-03-10T05:00:00.25Z")},
		{"date time past hours", filterOn("datetime", "IS_RELATIVE", "PAST_2_HOUR"), "", between("updatedAt", "2026-03-18T08:00:00Z", "2026-03-18T10:00:00Z")},
		{"date time next minutes", filterOn("datetime", "IS_RELATIVE", "NEXT_5_MINUTE"), "", between("updatedAt", "2026-03-18T10:31:00Z", "2026-03-18T10:36:00Z")},
		{"date time this day", filterOn("datetime", "IS_RELATIVE", "THIS_1_DAY"), "", between("updatedAt", "2026-03-18T00:00:00Z", "2026-03-19T00:00:00Z")},
		{"date time this month across daylight saving", filterOn("datetime", "IS_RELATIVE", "THIS_1_MONTH;;America/New_York;;"), "", between("updatedAt", "2026-03-01T05:00:00Z", "2026-04-01T04:00:00Z")},
		{"date time next month in new york", filterOn("datetime", "IS_RELATIVE", "NEXT_1_MONTH;;America/New_York;;"), "", between("updatedAt", "2026-04-01T04:00:00Z", "2026-05-01T04:00:00Z")},
		{"date time past day across the autumn fall back", filterOn("datetime", "IS_RELATIVE", "PAST_1_DAY;;Europe/London;;"), "", between("updatedAt", "2026-03-17T00:00:00Z", "2026-03-18T00:00:00Z")},
		{"date time is empty", filterOn("datetime", "IS_EMPTY", ""), "", isNull("updatedAt", "")},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()
			got, err := toFilter(t, single(tt.filter), recordfilter.Dependencies{TimeZone: tt.timeZone})
			if err != nil {
				t.Fatalf("ToFilter() error = %v", err)
			}
			if diff := cmp.Diff(tt.want, got); diff != "" {
				t.Errorf("ToFilter() mismatch (-want +got):\n%s", diff)
			}
		})
	}
}

func TestToFilter_CurrentRecordAndMember(t *testing.T) {
	t.Parallel()

	selection := func(member, record bool, ids ...string) string {
		out := `{"isCurrentWorkspaceMemberSelected":` + boolText(member) + `,"isCurrentRecordSelected":` + boolText(record) + `,"selectedRecordIds":[`
		for i, id := range ids {
			if i > 0 {
				out += ","
			}
			out += `"` + id + `"`
		}
		return out + "]}"
	}

	tests := []struct {
		name   string
		filter recordfilter.RecordFilter
		deps   recordfilter.Dependencies
		want   records.Filter
	}{
		{
			"relation current member",
			filterOn("relation", "IS", selection(true, false)),
			recordfilter.Dependencies{CurrentWorkspaceMemberID: memberID},
			leaf("companyId", "", "in", []string{memberID}),
		},
		{
			"relation current member alongside selected records",
			filterOn("relation", "IS", selection(true, false, companyID)),
			recordfilter.Dependencies{CurrentWorkspaceMemberID: memberID},
			leaf("companyId", "", "in", []string{companyID, memberID}),
		},
		{
			"relation current member without a member is dropped",
			filterOn("relation", "IS", selection(true, false)),
			recordfilter.Dependencies{},
			records.Filter{},
		},
		{
			"relation current record",
			filterOn("relation", "IS_NOT", selection(false, true)),
			recordfilter.Dependencies{CurrentRecord: &recordfilter.CurrentRecord{ID: recordID, ObjectNameSingular: "person"}},
			notOrNull(leaf("companyId", "", "in", []string{recordID}), "companyId", ""),
		},
		{
			"morph relation resolves the many to one join column",
			filterOn("morph", "IS", selection(false, true)),
			recordfilter.Dependencies{CurrentRecord: &recordfilter.CurrentRecord{ID: recordID, ObjectNameSingular: "person"}},
			leaf("targetPersonId", "", "in", []string{recordID}),
		},
		{
			"morph relation resolves the one to many join column",
			filterOn("morph", "IS", selection(false, true)),
			recordfilter.Dependencies{CurrentRecord: &recordfilter.CurrentRecord{ID: recordID, ObjectNameSingular: "company"}},
			leaf("targetCompaniesId", "", "in", []string{recordID}),
		},
		{
			"morph relation without a matching branch is dropped",
			filterOn("morph", "IS", selection(false, true)),
			recordfilter.Dependencies{CurrentRecord: &recordfilter.CurrentRecord{ID: recordID, ObjectNameSingular: "opportunity"}},
			records.Filter{},
		},
		{
			"morph relation without a current record is dropped",
			filterOn("morph", "IS", selection(false, false, recordID)),
			recordfilter.Dependencies{},
			records.Filter{},
		},
		{
			"actor workspace member current member",
			subFilterOn("actor", "workspaceMemberId", "IS", selection(true, false)),
			recordfilter.Dependencies{CurrentWorkspaceMemberID: memberID},
			leaf("createdBy", "workspaceMemberId", "in", []string{memberID}),
		},
		{
			"actor workspace member current member alongside selected records",
			subFilterOn("actor", "workspaceMemberId", "IS_NOT", selection(true, false, companyID)),
			recordfilter.Dependencies{CurrentWorkspaceMemberID: memberID},
			notOrNull(leaf("createdBy", "workspaceMemberId", "in", []string{companyID, memberID}), "createdBy", "workspaceMemberId"),
		},
		{
			"actor workspace member without a member is dropped",
			subFilterOn("actor", "workspaceMemberId", "IS", selection(true, false)),
			recordfilter.Dependencies{},
			records.Filter{},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()
			got, err := toFilter(t, single(tt.filter), tt.deps)
			if err != nil {
				t.Fatalf("ToFilter() error = %v", err)
			}
			if diff := cmp.Diff(tt.want, got); diff != "" {
				t.Errorf("ToFilter() mismatch (-want +got):\n%s", diff)
			}
		})
	}
}

func boolText(value bool) string {
	if value {
		return "true"
	}
	return "false"
}

func TestToFilter_DroppedFilters(t *testing.T) {
	t.Parallel()

	tests := []struct {
		name   string
		filter recordfilter.RecordFilter
	}{
		{"unknown field", filterOn("missing", "CONTAINS", "x")},
		{"empty value", filterOn("text", "CONTAINS", "")},
		{"empty list value", filterOn("select", "IS", "[]")},
		{"currency codes empty string", subFilterOn("currency", "currencyCode", "IS", `[]`)},
		{"actor source not selected", subFilterOn("actor", "source", "IS", `[]`)},
		{"relation target missing", recordfilter.RecordFilter{FieldMetadataID: "relation", Operand: "CONTAINS", Value: "x", RelationTargetFieldMetadataID: "missing"}},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()
			got, err := toFilter(t, single(tt.filter), recordfilter.Dependencies{})
			if err != nil {
				t.Fatalf("ToFilter() error = %v", err)
			}
			if diff := cmp.Diff(records.Filter{}, got); diff != "" {
				t.Errorf("ToFilter() mismatch (-want +got):\n%s", diff)
			}
		})
	}
}

func TestToFilter_Errors(t *testing.T) {
	t.Parallel()

	tests := []struct {
		name   string
		filter recordfilter.RecordFilter
		deps   recordfilter.Dependencies
	}{
		{"text with a number operand", filterOn("text", "IS", "x"), recordfilter.Dependencies{}},
		{"number with a text operand", filterOn("number", "CONTAINS", "1"), recordfilter.Dependencies{}},
		{"number that is not a number", filterOn("number", "IS", "abc"), recordfilter.Dependencies{}},
		{"is not null is never valid", filterOn("text", "IS_NOT_NULL", ""), recordfilter.Dependencies{}},
		{"vector search on text", filterOn("text", "VECTOR_SEARCH", "x"), recordfilter.Dependencies{}},
		{"select that is not a list", filterOn("select", "IS", "ACTIVE"), recordfilter.Dependencies{}},
		{"unknown operand on date", filterOn("date", "CONTAINS", "x"), recordfilter.Dependencies{}},
		{"date time that is not an instant", filterOn("datetime", "IS_AFTER", "yesterday"), recordfilter.Dependencies{}},
		{"date time plain date for is after", filterOn("datetime", "IS_AFTER", "2026-03-10"), recordfilter.Dependencies{}},
		{"date time is with garbage", filterOn("datetime", "IS", "tomorrow"), recordfilter.Dependencies{}},
		{"date time relative garbage", filterOn("datetime", "IS_RELATIVE", "garbage"), recordfilter.Dependencies{}},
		{"unknown time zone", filterOn("datetime", "IS_TODAY", ""), recordfilter.Dependencies{TimeZone: "Mars/Olympus"}},
		{"unknown relative time zone", filterOn("date", "IS_RELATIVE", "THIS_1_DAY;;Mars/Olympus;;"), recordfilter.Dependencies{}},
		{"unknown actor source", subFilterOn("actor", "source", "IS", `["TELEPATHY"]`), recordfilter.Dependencies{}},
		{"unknown currency subfield", subFilterOn("currency", "symbol", "IS", "1"), recordfilter.Dependencies{}},
		{"unknown links subfield", subFilterOn("links", "nope", "CONTAINS", "x"), recordfilter.Dependencies{}},
		{"unknown phones subfield", subFilterOn("phones", "primaryPhoneCountryCode", "CONTAINS", "1"), recordfilter.Dependencies{}},
		{"unknown emails empty subfield", subFilterOn("emails", "nope", "IS_EMPTY", ""), recordfilter.Dependencies{}},
		{"relation with a text operand", filterOn("relation", "CONTAINS", `["`+companyID+`"]`), recordfilter.Dependencies{}},
		{
			"relation traversal",
			recordfilter.RecordFilter{FieldMetadataID: "relation", Operand: "CONTAINS", Value: "Acme", RelationTargetFieldMetadataID: "text"},
			recordfilter.Dependencies{},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()
			_, err := toFilter(t, single(tt.filter), tt.deps)
			if !errors.Is(err, recordfilter.ErrInvalidFilter) {
				t.Errorf("ToFilter() error = %v, want ErrInvalidFilter", err)
			}
		})
	}
}

func TestToFilter_Groups(t *testing.T) {
	t.Parallel()

	nameIs := func(group string) recordfilter.RecordFilter {
		recordFilter := filterOn("text", "CONTAINS", "a")
		recordFilter.RecordFilterGroupID = group
		return recordFilter
	}
	amountIs := func(group string) recordfilter.RecordFilter {
		recordFilter := filterOn("number", "IS", "1")
		recordFilter.RecordFilterGroupID = group
		return recordFilter
	}
	containsA := leaf("name", "", "ilike", "%a%")
	amountOne := leaf("amount", "", "eq", 1.0)

	tests := []struct {
		name  string
		chart recordfilter.ChartFilter
		want  records.Filter
	}{
		{"no filters", recordfilter.ChartFilter{}, records.Filter{}},
		{
			"one regular filter is returned as is",
			single(filterOn("text", "CONTAINS", "a")),
			containsA,
		},
		{
			"regular filters are anded",
			recordfilter.ChartFilter{RecordFilters: []recordfilter.RecordFilter{filterOn("text", "CONTAINS", "a"), filterOn("number", "IS", "1")}},
			and(containsA, amountOne),
		},
		{
			"and group",
			recordfilter.ChartFilter{
				RecordFilters:      []recordfilter.RecordFilter{nameIs("g1"), amountIs("g1")},
				RecordFilterGroups: []recordfilter.RecordFilterGroup{{ID: "g1", LogicalOperator: "AND"}},
			},
			and(containsA, amountOne),
		},
		{
			"or group",
			recordfilter.ChartFilter{
				RecordFilters:      []recordfilter.RecordFilter{nameIs("g1"), amountIs("g1")},
				RecordFilterGroups: []recordfilter.RecordFilterGroup{{ID: "g1", LogicalOperator: "OR"}},
			},
			or(containsA, amountOne),
		},
		{
			"nested group follows its parent's own filters",
			recordfilter.ChartFilter{
				RecordFilters: []recordfilter.RecordFilter{nameIs("g1"), amountIs("g2")},
				RecordFilterGroups: []recordfilter.RecordFilterGroup{
					{ID: "g2", LogicalOperator: "OR", ParentRecordFilterGroupID: "g1"},
					{ID: "g1", LogicalOperator: "AND"},
				},
			},
			and(containsA, or(amountOne)),
		},
		{
			"group alongside regular filters",
			recordfilter.ChartFilter{
				RecordFilters:      []recordfilter.RecordFilter{filterOn("number", "IS", "1"), nameIs("g1")},
				RecordFilterGroups: []recordfilter.RecordFilterGroup{{ID: "g1", LogicalOperator: "OR"}},
			},
			and(amountOne, or(containsA)),
		},
		{
			"group with only dropped filters is an empty group",
			recordfilter.ChartFilter{
				RecordFilters: []recordfilter.RecordFilter{func() recordfilter.RecordFilter {
					recordFilter := filterOn("missing", "IS", "1")
					recordFilter.RecordFilterGroupID = "g1"
					return recordFilter
				}()},
				RecordFilterGroups: []recordfilter.RecordFilterGroup{{ID: "g1", LogicalOperator: "AND"}},
			},
			and(),
		},
		{
			"group without an outermost group is ignored",
			recordfilter.ChartFilter{
				RecordFilters:      []recordfilter.RecordFilter{nameIs("g1")},
				RecordFilterGroups: []recordfilter.RecordFilterGroup{{ID: "g1", LogicalOperator: "AND", ParentRecordFilterGroupID: "missing"}},
			},
			records.Filter{},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()
			got, err := toFilter(t, tt.chart, recordfilter.Dependencies{})
			if err != nil {
				t.Fatalf("ToFilter() error = %v", err)
			}
			if diff := cmp.Diff(tt.want, got); diff != "" {
				t.Errorf("ToFilter() mismatch (-want +got):\n%s", diff)
			}
		})
	}

	t.Run("unknown logical operator", func(t *testing.T) {
		t.Parallel()
		chart := recordfilter.ChartFilter{
			RecordFilters:      []recordfilter.RecordFilter{nameIs("g1")},
			RecordFilterGroups: []recordfilter.RecordFilterGroup{{ID: "g1", LogicalOperator: "XOR"}},
		}
		_, err := toFilter(t, chart, recordfilter.Dependencies{})
		if !errors.Is(err, recordfilter.ErrInvalidFilter) {
			t.Errorf("ToFilter() error = %v, want ErrInvalidFilter", err)
		}
	})
}
