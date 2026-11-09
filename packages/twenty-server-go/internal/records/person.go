package records

import (
	"context"
	"encoding/base64"
	"encoding/json"
	"errors"
	"fmt"
	"time"
)

type FullName struct {
	FirstName string `json:"firstName"`
	LastName  string `json:"lastName"`
}
type Emails struct {
	PrimaryEmail     string   `json:"primaryEmail"`
	AdditionalEmails []string `json:"additionalEmails"`
}
type Link struct {
	Label string `json:"label"`
	URL   string `json:"url"`
}
type Links struct {
	PrimaryLink    Link   `json:"primaryLink"`
	SecondaryLinks []Link `json:"secondaryLinks"`
}
type Phone struct {
	Number      string `json:"number"`
	CountryCode string `json:"countryCode"`
	CallingCode string `json:"callingCode"`
}
type Phones struct {
	Primary    Phone   `json:"primaryPhone"`
	Additional []Phone `json:"additionalPhones"`
}
type Actor struct {
	Source            string `json:"source"`
	WorkspaceMemberID string `json:"workspaceMemberId"`
	Name              string `json:"name"`
}

type Person struct {
	ID        string     `json:"id"`
	Name      FullName   `json:"name"`
	Emails    Emails     `json:"emails"`
	Linkedin  Links      `json:"linkedinLink"`
	JobTitle  string     `json:"jobTitle"`
	Phones    Phones     `json:"phones"`
	AvatarURL string     `json:"avatarUrl"`
	Position  float64    `json:"position"`
	CompanyID *string    `json:"companyId"`
	CreatedBy Actor      `json:"createdBy"`
	UpdatedBy Actor      `json:"updatedBy"`
	CreatedAt time.Time  `json:"createdAt"`
	UpdatedAt time.Time  `json:"updatedAt"`
	DeletedAt *time.Time `json:"deletedAt"`
}

type PersonInput struct { // nil leaves a field unchanged on update
	Name      *FullName
	Emails    *Emails
	Linkedin  *Links
	JobTitle  *string
	Phones    *Phones
	CompanyID *string
}

type People interface {
	Find(ctx context.Context, filter Filter, orderBy []OrderBy, page PageRequest) (Page[Person], error)
	Get(ctx context.Context, id string) (Person, error) // ErrNotFound
	Create(ctx context.Context, actor Actor, input PersonInput) (Person, error)
	Update(ctx context.Context, actor Actor, id string, input PersonInput) (Person, error)
	SoftDelete(ctx context.Context, id string) error
	Restore(ctx context.Context, id string) error
	Destroy(ctx context.Context, id string) error
	Aggregate(ctx context.Context, filter Filter, aggregates []Aggregate) (AggregateResult, error)
	GroupBy(ctx context.Context, filter Filter, groupBy []GroupBy, orderBy []OrderBy, aggregates []Aggregate, perGroup PageRequest) ([]Group[Person], error)
}

var ErrNotFound = errors.New("record not found")

// Cursor encodes a record id as the opaque cursor Find hands out.
func Cursor(id string) string {
	return base64.StdEncoding.EncodeToString([]byte(`{"id":"` + id + `"}`))
}

// CursorID returns the record id a cursor points at.
func CursorID(cursor string) (string, error) {
	raw, err := base64.StdEncoding.DecodeString(cursor)
	if err != nil {
		return "", fmt.Errorf("invalid cursor: %w", err)
	}
	var payload struct {
		ID string `json:"id"`
	}
	if err := json.Unmarshal(raw, &payload); err != nil || payload.ID == "" {
		return "", errors.New("invalid cursor")
	}
	return payload.ID, nil
}
