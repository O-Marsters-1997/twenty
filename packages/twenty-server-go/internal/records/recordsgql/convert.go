package recordsgql

import (
	"bytes"
	"encoding/json"
	"errors"
	"fmt"
	"slices"
	"sort"

	"github.com/twentyhq/twenty/packages/twenty-server-go/internal/model"
	"github.com/twentyhq/twenty/packages/twenty-server-go/internal/records"
)

func isComposite(object model.Object, name string) bool {
	index := slices.IndexFunc(object.Fields, func(field model.Field) bool { return field.Name == name })
	return index >= 0 && len(object.Fields[index].Columns) > 1
}

func sortedKeys(values map[string]any) []string {
	keys := make([]string, 0, len(values))
	for key := range values {
		keys = append(keys, key)
	}
	sort.Strings(keys)
	return keys
}

func plainMap(input any) (map[string]any, error) {
	raw, err := json.Marshal(input)
	if err != nil {
		return nil, fmt.Errorf("encode input: %w", err)
	}
	decoder := json.NewDecoder(bytes.NewReader(raw))
	decoder.UseNumber()
	var plain map[string]any
	if err := decoder.Decode(&plain); err != nil {
		return nil, fmt.Errorf("decode input: %w", err)
	}
	return plain, nil
}

func parseFilter(object model.Object, input map[string]any) (records.Filter, error) {
	input, err := plainMap(input)
	if err != nil {
		return records.Filter{}, err
	}
	var conjuncts []records.Filter
	for _, key := range sortedKeys(input) {
		switch key {
		case "and", "or":
			group, err := parseGroup(object, input[key])
			if err != nil {
				return records.Filter{}, err
			}
			if key == "and" {
				conjuncts = append(conjuncts, records.Filter{And: group})
			} else {
				conjuncts = append(conjuncts, records.Filter{Or: group})
			}
		case "not":
			nested, ok := input[key].(map[string]any)
			if !ok {
				return records.Filter{}, errors.New("not filter must be an object")
			}
			inner, err := parseFilter(object, nested)
			if err != nil {
				return records.Filter{}, err
			}
			conjuncts = append(conjuncts, records.Filter{Not: &inner})
		default:
			operators, ok := input[key].(map[string]any)
			if !ok {
				return records.Filter{}, fmt.Errorf("filter on %s must be an object", key)
			}
			if isComposite(object, key) {
				for _, subField := range sortedKeys(operators) {
					subOperators, ok := operators[subField].(map[string]any)
					if !ok {
						return records.Filter{}, fmt.Errorf("filter on %s.%s must be an object", key, subField)
					}
					conjuncts = append(conjuncts, operatorFilters(key, subField, subOperators)...)
				}
				continue
			}
			conjuncts = append(conjuncts, operatorFilters(key, "", operators)...)
		}
	}
	return records.Filter{And: conjuncts}, nil
}

func parseGroup(object model.Object, raw any) ([]records.Filter, error) {
	items, _ := raw.([]any)
	var group []records.Filter
	for _, item := range items {
		if item == nil {
			continue
		}
		nested, ok := item.(map[string]any)
		if !ok {
			return nil, errors.New("and/or entries must be objects")
		}
		filter, err := parseFilter(object, nested)
		if err != nil {
			return nil, err
		}
		group = append(group, filter)
	}
	return group, nil
}

func operatorFilters(field, subField string, operators map[string]any) []records.Filter {
	var filters []records.Filter
	for _, operand := range sortedKeys(operators) {
		filters = append(filters, records.Filter{Field: &records.FieldFilter{
			Field: field, SubField: subField, Operand: records.Operand(operand), Value: normalise(operators[operand]),
		}})
	}
	return filters
}

func normalise(value any) any {
	switch typed := value.(type) {
	case json.Number:
		number, err := typed.Float64()
		if err != nil {
			return typed.String()
		}
		return number
	case []any:
		strings := make([]string, 0, len(typed))
		for _, item := range typed {
			text, ok := item.(string)
			if !ok {
				return typed
			}
			strings = append(strings, text)
		}
		return strings
	}
	return value
}

func parseOrderBy(input []map[string]any) ([]records.OrderBy, error) {
	var orderBy []records.OrderBy
	for _, raw := range input {
		item, err := plainMap(raw)
		if err != nil {
			return nil, err
		}
		for _, field := range sortedKeys(item) {
			switch typed := item[field].(type) {
			case string:
				orderBy = append(orderBy, records.OrderBy{Field: field, Direction: records.OrderDirection(typed)})
			case map[string]any:
				for _, subField := range sortedKeys(typed) {
					if direction, ok := typed[subField].(string); ok {
						orderBy = append(orderBy, records.OrderBy{Field: field, SubField: subField, Direction: records.OrderDirection(direction)})
					}
				}
			}
		}
	}
	return orderBy, nil
}

func toPerson(person records.Person) *Person {
	secondaryLinks := make([]*SecondaryLink, len(person.Linkedin.SecondaryLinks))
	for i, link := range person.Linkedin.SecondaryLinks {
		secondaryLinks[i] = &SecondaryLink{Label: &link.Label, URL: &link.URL}
	}
	additionalPhones := make([]*AdditionalPhone, len(person.Phones.Additional))
	for i, phone := range person.Phones.Additional {
		additionalPhones[i] = &AdditionalPhone{Number: &phone.Number, CallingCode: &phone.CallingCode, CountryCode: &phone.CountryCode}
	}
	additionalEmails := person.Emails.AdditionalEmails
	if additionalEmails == nil {
		additionalEmails = []string{}
	}
	return &Person{
		ID:           person.ID,
		Name:         &FullName{FirstName: &person.Name.FirstName, LastName: &person.Name.LastName},
		Emails:       &Emails{PrimaryEmail: &person.Emails.PrimaryEmail, AdditionalEmails: additionalEmails},
		LinkedinLink: &Links{PrimaryLinkLabel: &person.Linkedin.PrimaryLink.Label, PrimaryLinkURL: &person.Linkedin.PrimaryLink.URL, SecondaryLinks: secondaryLinks},
		JobTitle:     &person.JobTitle,
		Phones: &Phones{
			PrimaryPhoneNumber: &person.Phones.Primary.Number, PrimaryPhoneCountryCode: &person.Phones.Primary.CountryCode,
			PrimaryPhoneCallingCode: &person.Phones.Primary.CallingCode, AdditionalPhones: additionalPhones,
		},
		AvatarURL: &person.AvatarURL,
		Position:  person.Position,
		CompanyID: person.CompanyID,
		CreatedBy: toActor(person.CreatedBy),
		UpdatedBy: toActor(person.UpdatedBy),
		CreatedAt: person.CreatedAt,
		UpdatedAt: person.UpdatedAt,
		DeletedAt: person.DeletedAt,
	}
}

func toActor(actor records.Actor) *Actor {
	result := &Actor{Source: actor.Source, Name: actor.Name}
	if actor.WorkspaceMemberID != "" {
		result.WorkspaceMemberID = &actor.WorkspaceMemberID
	}
	return result
}

func deref(value *string) string {
	if value == nil {
		return ""
	}
	return *value
}

type personInputFields struct {
	Name         *FullNameCreateInput
	Emails       *EmailsCreateInput
	LinkedinLink *LinksCreateInput
	JobTitle     *string
	Phones       *PhonesCreateInput
	CompanyID    *string
}

func personInputOf(data *PersonCreateInput) records.PersonInput {
	if data == nil {
		return records.PersonInput{}
	}
	return toPersonInput(personInputFields{data.Name, data.Emails, data.LinkedinLink, data.JobTitle, data.Phones, data.CompanyID})
}

func personUpdateInputOf(data PersonUpdateInput) records.PersonInput {
	return toPersonInput(personInputFields{data.Name, data.Emails, data.LinkedinLink, data.JobTitle, data.Phones, data.CompanyID})
}

func personEdges(page records.Page[records.Person]) ([]*PersonEdge, *PageInfo) {
	return edgesOf(page, func(person records.Person, cursor string) *PersonEdge {
		return &PersonEdge{Node: toPerson(person), Cursor: cursor}
	}, func(person records.Person) string { return person.ID })
}

func toPersonInput(in personInputFields) records.PersonInput {
	var input records.PersonInput
	input.JobTitle, input.CompanyID = in.JobTitle, in.CompanyID
	if in.Name != nil {
		input.Name = &records.FullName{FirstName: deref(in.Name.FirstName), LastName: deref(in.Name.LastName)}
	}
	if in.Emails != nil {
		input.Emails = &records.Emails{PrimaryEmail: deref(in.Emails.PrimaryEmail), AdditionalEmails: in.Emails.AdditionalEmails}
	}
	if in.LinkedinLink != nil {
		links := &records.Links{PrimaryLink: records.Link{Label: deref(in.LinkedinLink.PrimaryLinkLabel), URL: deref(in.LinkedinLink.PrimaryLinkURL)}}
		for _, link := range in.LinkedinLink.SecondaryLinks {
			links.SecondaryLinks = append(links.SecondaryLinks, records.Link{Label: deref(link.Label), URL: deref(link.URL)})
		}
		input.Linkedin = links
	}
	if in.Phones != nil {
		phones := &records.Phones{Primary: records.Phone{
			Number: deref(in.Phones.PrimaryPhoneNumber), CountryCode: deref(in.Phones.PrimaryPhoneCountryCode), CallingCode: deref(in.Phones.PrimaryPhoneCallingCode),
		}}
		for _, phone := range in.Phones.AdditionalPhones {
			phones.Additional = append(phones.Additional, records.Phone{Number: deref(phone.Number), CountryCode: deref(phone.CountryCode), CallingCode: deref(phone.CallingCode)})
		}
		input.Phones = phones
	}
	return input
}
