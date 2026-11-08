package store_test

import (
	"errors"
	"slices"
	"testing"

	"github.com/google/go-cmp/cmp"
	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/twentyhq/twenty/packages/twenty-server-go/internal/pgtest"
	"github.com/twentyhq/twenty/packages/twenty-server-go/internal/records"
	"github.com/twentyhq/twenty/packages/twenty-server-go/internal/records/store"
	"github.com/twentyhq/twenty/packages/twenty-server-go/internal/workspace"
)

var actor = records.Actor{Source: "MANUAL", Name: "Ada Admin"}

func newPool(t *testing.T) *pgxpool.Pool {
	t.Helper()
	pool, err := pgxpool.New(t.Context(), pgtest.New(t))
	if err != nil {
		t.Fatalf("connect: %v", err)
	}
	t.Cleanup(pool.Close)
	return pool
}

func newPeople(t *testing.T) *store.People {
	t.Helper()
	return store.NewPeople(newPool(t))
}

func nullFirstNames(t *testing.T, pool *pgxpool.Pool) {
	t.Helper()
	_, err := pool.Exec(t.Context(), `UPDATE `+workspace.SchemaName()+`.person SET "nameFirstName" = NULL WHERE "nameFirstName" = ''`)
	if err != nil {
		t.Fatalf("null first names: %v", err)
	}
}

func create(t *testing.T, people *store.People, first, last, email string) records.Person {
	t.Helper()
	person, err := people.Create(t.Context(), actor, records.PersonInput{
		Name:   &records.FullName{FirstName: first, LastName: last},
		Emails: &records.Emails{PrimaryEmail: email},
	})
	if err != nil {
		t.Fatalf("create %s: %v", first, err)
	}
	return person
}

func firstNames(page records.Page[records.Person]) []string {
	var names []string
	for _, person := range page.Records {
		names = append(names, person.Name.FirstName)
	}
	return names
}

func fieldFilter(field, sub string, operand records.Operand, value any) records.Filter {
	return records.Filter{Field: &records.FieldFilter{Field: field, SubField: sub, Operand: operand, Value: value}}
}

func TestCreateThenGetReturnsEveryComposite(t *testing.T) {
	t.Parallel()
	people := newPeople(t)
	created, err := people.Create(t.Context(), actor, records.PersonInput{
		Name:     &records.FullName{FirstName: "Grace", LastName: "Hopper"},
		Emails:   &records.Emails{PrimaryEmail: "grace@navy.mil", AdditionalEmails: []string{"g@cobol.org"}},
		Linkedin: &records.Links{PrimaryLink: records.Link{Label: "me", URL: "https://l.in/g"}, SecondaryLinks: []records.Link{{Label: "x", URL: "https://x"}}},
		JobTitle: new("Rear Admiral"),
		Phones:   &records.Phones{Primary: records.Phone{Number: "555", CountryCode: "US", CallingCode: "+1"}, Additional: []records.Phone{{Number: "1", CountryCode: "GB", CallingCode: "+44"}}},
	})
	if err != nil {
		t.Fatalf("create: %v", err)
	}

	got, err := people.Get(t.Context(), created.ID)
	if err != nil {
		t.Fatalf("get: %v", err)
	}
	if diff := cmp.Diff(created, got); diff != "" {
		t.Errorf("Get differs from Create (-create +get):\n%s", diff)
	}
	want := records.Person{
		Name:      records.FullName{FirstName: "Grace", LastName: "Hopper"},
		JobTitle:  "Rear Admiral",
		CreatedBy: actor,
		UpdatedBy: actor,
	}
	if got.Name != want.Name || got.JobTitle != want.JobTitle || got.CreatedBy != want.CreatedBy || got.UpdatedBy != want.UpdatedBy {
		t.Errorf("got %+v, want name, job title and actors of %+v", got, want)
	}
	if !slices.Equal(got.Emails.AdditionalEmails, []string{"g@cobol.org"}) || got.Phones.Additional[0].CallingCode != "+44" || got.Linkedin.SecondaryLinks[0].URL != "https://x" {
		t.Errorf("array composites not round-tripped: %+v", got)
	}
}

func TestUpdateLeavesNilFieldsUnchanged(t *testing.T) {
	t.Parallel()
	people := newPeople(t)
	created := create(t, people, "Alan", "Turing", "alan@bletchley.uk")
	editor := records.Actor{Source: "MANUAL", Name: "Eve Editor"}

	updated, err := people.Update(t.Context(), editor, created.ID, records.PersonInput{JobTitle: new("Cryptanalyst")})
	if err != nil {
		t.Fatalf("update: %v", err)
	}

	if updated.JobTitle != "Cryptanalyst" || updated.Name != created.Name || updated.Emails.PrimaryEmail != "alan@bletchley.uk" {
		t.Errorf("got %+v, want job title changed and name and email kept", updated)
	}
	if updated.CreatedBy != actor || updated.UpdatedBy != editor {
		t.Errorf("got createdBy %+v updatedBy %+v, want creator kept and editor recorded", updated.CreatedBy, updated.UpdatedBy)
	}
}

func TestGetReportsNotFound(t *testing.T) {
	t.Parallel()
	people := newPeople(t)
	if _, err := people.Get(t.Context(), "6f2a3a2e-8b0e-4a39-9d5e-2f7d4e2f6a11"); !errors.Is(err, records.ErrNotFound) {
		t.Errorf("got %v, want ErrNotFound", err)
	}
}

func TestSoftDeleteHidesFromListsUntilRestore(t *testing.T) {
	t.Parallel()
	people := newPeople(t)
	person := create(t, people, "Linus", "T", "l@kernel.org")
	find := func(filter records.Filter) []string {
		page, err := people.Find(t.Context(), filter, nil, records.PageRequest{})
		if err != nil {
			t.Fatalf("find: %v", err)
		}
		return firstNames(page)
	}

	if err := people.SoftDelete(t.Context(), person.ID); err != nil {
		t.Fatalf("soft delete: %v", err)
	}
	if got := find(records.Filter{}); len(got) != 0 {
		t.Errorf("got %v after soft delete, want none", got)
	}
	if got := find(fieldFilter("deletedAt", "", "is", "NOT_NULL")); !slices.Equal(got, []string{"Linus"}) {
		t.Errorf("got %v when filtering on deletedAt, want the deleted person", got)
	}
	if err := people.Restore(t.Context(), person.ID); err != nil {
		t.Fatalf("restore: %v", err)
	}
	if got := find(records.Filter{}); !slices.Equal(got, []string{"Linus"}) {
		t.Errorf("got %v after restore, want Linus", got)
	}
}

func TestDestroyRemovesTheRow(t *testing.T) {
	t.Parallel()
	people := newPeople(t)
	person := create(t, people, "Ken", "T", "k@bell.com")
	if err := people.Destroy(t.Context(), person.ID); err != nil {
		t.Fatalf("destroy: %v", err)
	}
	if _, err := people.Get(t.Context(), person.ID); !errors.Is(err, records.ErrNotFound) {
		t.Errorf("got %v, want ErrNotFound", err)
	}
	if err := people.Destroy(t.Context(), person.ID); !errors.Is(err, records.ErrNotFound) {
		t.Errorf("destroying twice: got %v, want ErrNotFound", err)
	}
}

func TestFindFiltersEveryOperand(t *testing.T) {
	t.Parallel()
	people := newPeople(t)
	ada := create(t, people, "Ada", "Lovelace", "ada@analytical.org")
	create(t, people, "Alan", "Turing", "alan@bletchley.uk")
	grace := create(t, people, "Grace", "Hopper", "grace@navy.mil")
	if _, err := people.Update(t.Context(), actor, grace.ID, records.PersonInput{Emails: &records.Emails{PrimaryEmail: "grace@navy.mil", AdditionalEmails: []string{"g@cobol.org"}}}); err != nil {
		t.Fatalf("update: %v", err)
	}
	not := fieldFilter("name", "firstName", "eq", "Ada")

	tests := []struct {
		name   string
		filter records.Filter
		want   []string
	}{
		{"eq on composite subfield", fieldFilter("name", "firstName", "eq", "Ada"), []string{"Ada"}},
		{"neq", fieldFilter("name", "firstName", "neq", "Ada"), []string{"Alan", "Grace"}},
		{"in on id", fieldFilter("id", "", "in", []string{ada.ID, grace.ID}), []string{"Ada", "Grace"}},
		{"like", fieldFilter("name", "lastName", "like", "%ing"), []string{"Alan"}},
		{"ilike", fieldFilter("name", "lastName", "ilike", "%OPPER"), []string{"Grace"}},
		{"startsWith", fieldFilter("name", "firstName", "startsWith", "al"), []string{"Alan"}},
		{"gt on position", fieldFilter("position", "", "gt", grace.Position), []string{"Ada", "Alan"}},
		{"gte", fieldFilter("position", "", "gte", grace.Position), []string{"Ada", "Alan", "Grace"}},
		{"lt", fieldFilter("position", "", "lt", grace.Position), nil},
		{"lte", fieldFilter("position", "", "lte", grace.Position), []string{"Grace"}},
		{"is NULL on relation column", fieldFilter("companyId", "", "is", "NULL"), []string{"Ada", "Alan", "Grace"}},
		{"is NOT_NULL", fieldFilter("companyId", "", "is", "NOT_NULL"), nil},
		{"containsAny on array subfield", fieldFilter("emails", "additionalEmails", "containsAny", []string{"g@cobol.org"}), []string{"Grace"}},
		{"containsIlike on array subfield", fieldFilter("emails", "additionalEmails", "containsIlike", "%COBOL%"), []string{"Grace"}},
		{"and", records.Filter{And: []records.Filter{fieldFilter("name", "firstName", "startsWith", "A"), fieldFilter("name", "lastName", "eq", "Turing")}}, []string{"Alan"}},
		{"or", records.Filter{Or: []records.Filter{fieldFilter("name", "firstName", "eq", "Ada"), fieldFilter("name", "firstName", "eq", "Grace")}}, []string{"Ada", "Grace"}},
		{"not", records.Filter{Not: &not}, []string{"Alan", "Grace"}},
		{"nested groups", records.Filter{And: []records.Filter{{Or: []records.Filter{fieldFilter("name", "firstName", "eq", "Ada"), fieldFilter("name", "firstName", "eq", "Alan")}}, {Not: &records.Filter{Field: &records.FieldFilter{Field: "name", SubField: "firstName", Operand: "eq", Value: "Ada"}}}}}, []string{"Alan"}},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			page, err := people.Find(t.Context(), tt.filter, []records.OrderBy{{Field: "name", SubField: "firstName", Direction: "AscNullsLast"}}, records.PageRequest{})
			if err != nil {
				t.Fatalf("find: %v", err)
			}
			if diff := cmp.Diff(tt.want, firstNames(page)); diff != "" {
				t.Errorf("(-want +got):\n%s", diff)
			}
			if page.TotalCount != len(tt.want) {
				t.Errorf("total count %d, want %d", page.TotalCount, len(tt.want))
			}
		})
	}
}

func TestFindRejectsUnknownFieldsAndOperandsAsInvalid(t *testing.T) {
	t.Parallel()
	people := newPeople(t)
	tests := []struct {
		name    string
		filter  records.Filter
		orderBy []records.OrderBy
	}{
		{"filter on missing field", fieldFilter("nope", "", "eq", "x"), nil},
		{"filter on missing subfield", fieldFilter("name", "middle", "eq", "x"), nil},
		{"filter on composite without subfield", fieldFilter("name", "", "eq", "x"), nil},
		{"filter on relation without column", fieldFilter("noteTargets", "", "is", "NULL"), nil},
		{"sort on missing field", records.Filter{}, []records.OrderBy{{Field: "nope", Direction: "AscNullsFirst"}}},
		{"injected field name", fieldFilter(`id" = "id" OR 1=1 --`, "", "eq", "x"), nil},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			_, err := people.Find(t.Context(), tt.filter, tt.orderBy, records.PageRequest{})
			if !errors.Is(err, records.ErrUnknownField) {
				t.Errorf("got %v, want ErrUnknownField", err)
			}
		})
	}
}

func TestFindPagesForwardAndBackwardByCursor(t *testing.T) {
	t.Parallel()
	pool := newPool(t)
	people := store.NewPeople(pool)
	for _, name := range []string{"Eve", "Bob", "Dan", "Ann", "Cat"} {
		create(t, people, name, "X", name+"@x.org")
	}
	create(t, people, "", "NoFirstName", "n@x.org")
	nullFirstNames(t, pool)
	byName := []records.OrderBy{{Field: "name", SubField: "firstName", Direction: "AscNullsFirst"}}
	find := func(page records.PageRequest) records.Page[records.Person] {
		t.Helper()
		got, err := people.Find(t.Context(), records.Filter{}, byName, page)
		if err != nil {
			t.Fatalf("find %+v: %v", page, err)
		}
		return got
	}

	first := find(records.PageRequest{First: 2})
	second := find(records.PageRequest{First: 2, After: first.EndCursor})
	third := find(records.PageRequest{First: 2, After: second.EndCursor})

	if diff := cmp.Diff([][]string{{"", "Ann"}, {"Bob", "Cat"}, {"Dan", "Eve"}}, [][]string{firstNames(first), firstNames(second), firstNames(third)}); diff != "" {
		t.Errorf("forward pages (-want +got):\n%s", diff)
	}
	if first.TotalCount != 6 || !first.HasNext || first.HasPrevious || !second.HasNext || !second.HasPrevious || third.HasNext {
		t.Errorf("got totals/flags first=%+v second=%+v third=%+v", first, second, third)
	}

	back := find(records.PageRequest{Last: 2, Before: third.StartCursor})
	if diff := cmp.Diff([]string{"Bob", "Cat"}, firstNames(back)); diff != "" {
		t.Errorf("backward page (-want +got):\n%s", diff)
	}
	if !back.HasNext || !back.HasPrevious {
		t.Errorf("got hasNext=%v hasPrevious=%v, want both", back.HasNext, back.HasPrevious)
	}
	if tail := find(records.PageRequest{Last: 1}); !slices.Equal(firstNames(tail), []string{"Eve"}) {
		t.Errorf("got %v for last 1, want Eve", firstNames(tail))
	}
}

func TestFindPagesDescendingNullsFirst(t *testing.T) {
	t.Parallel()
	pool := newPool(t)
	people := store.NewPeople(pool)
	for _, name := range []string{"Bob", "Ann", ""} {
		create(t, people, name, "X", name+"@x.org")
	}
	nullFirstNames(t, pool)
	order := []records.OrderBy{{Field: "name", SubField: "firstName", Direction: "DescNullsFirst"}}
	page, err := people.Find(t.Context(), records.Filter{}, order, records.PageRequest{First: 1})
	if err != nil {
		t.Fatalf("find: %v", err)
	}
	next, err := people.Find(t.Context(), records.Filter{}, order, records.PageRequest{First: 5, After: page.EndCursor})
	if err != nil {
		t.Fatalf("find next: %v", err)
	}
	if got := append(firstNames(page), firstNames(next)...); !slices.Equal(got, []string{"", "Bob", "Ann"}) {
		t.Errorf("got %v, want empty name first then descending", got)
	}
}
