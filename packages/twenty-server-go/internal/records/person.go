package records

import (
	"context"
	"encoding/base64"
	"encoding/json"
	"errors"
	"fmt"
	"time"
)

type FullName struct{ FirstName, LastName string }
type Emails struct {
	PrimaryEmail     string
	AdditionalEmails []string
}
type Link struct{ Label, URL string }
type Links struct {
	PrimaryLink    Link
	SecondaryLinks []Link
}
type Phone struct{ Number, CountryCode, CallingCode string }
type Phones struct {
	Primary    Phone
	Additional []Phone
}
type Actor struct{ Source, WorkspaceMemberID, Name string }

type Person struct {
	ID        string
	Name      FullName
	Emails    Emails
	Linkedin  Links
	JobTitle  string
	Phones    Phones
	AvatarURL string
	Position  float64
	CompanyID *string
	CreatedBy Actor
	UpdatedBy Actor
	CreatedAt time.Time
	UpdatedAt time.Time
	DeletedAt *time.Time
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
