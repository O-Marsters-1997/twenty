package recordsgql

import (
	"bytes"
	"encoding/json"
	"fmt"
	"slices"
	"sort"

	"github.com/twentyhq/twenty/packages/twenty-server-go/internal/model"
	"github.com/twentyhq/twenty/packages/twenty-server-go/internal/records"
)

func personObject() model.Object {
	index := slices.IndexFunc(model.Objects, func(object model.Object) bool { return object.NameSingular == "person" })
	return model.Objects[index]
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
	return records.ParseFilter(object, input)
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
