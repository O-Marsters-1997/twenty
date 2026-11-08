package store_test

import (
	"errors"
	"slices"
	"testing"

	"github.com/google/go-cmp/cmp"

	"github.com/twentyhq/twenty/packages/twenty-server-go/internal/records"
	"github.com/twentyhq/twenty/packages/twenty-server-go/internal/records/store"
)

func createCompany(t *testing.T, companies *store.Companies, name string, revenue float64) records.Company {
	t.Helper()
	company, err := companies.Create(t.Context(), actor, records.CompanyInput{
		Name:          &name,
		AnnualRevenue: &records.Currency{AmountMicros: &revenue, CurrencyCode: "USD"},
	})
	if err != nil {
		t.Fatalf("create %s: %v", name, err)
	}
	return company
}

func companyNames(page records.Page[records.Company]) []string {
	var names []string
	for _, company := range page.Records {
		names = append(names, company.Name)
	}
	return names
}

func TestCompanies_CreateThenGetRoundTripsComposites(t *testing.T) {
	t.Parallel()
	companies := store.NewCompanies(newPool(t))
	lat, lng, micros := 51.5, -0.12, 2500000.0
	created, err := companies.Create(t.Context(), actor, records.CompanyInput{
		Name:          new("Acme"),
		DomainName:    &records.Links{PrimaryLink: records.Link{Label: "site", URL: "https://acme.test"}, SecondaryLinks: []records.Link{{Label: "docs", URL: "https://docs.acme.test"}}},
		Linkedin:      &records.Links{PrimaryLink: records.Link{URL: "https://l.in/acme"}},
		Address:       &records.Address{Street1: "1 High St", City: "London", Country: "UK", Lat: &lat, Lng: &lng},
		AnnualRevenue: &records.Currency{AmountMicros: &micros, CurrencyCode: "GBP"},
	})
	if err != nil {
		t.Fatalf("create: %v", err)
	}

	got, err := companies.Get(t.Context(), created.ID)
	if err != nil {
		t.Fatalf("get: %v", err)
	}
	if diff := cmp.Diff(created, got); diff != "" {
		t.Errorf("Get differs from Create (-create +get):\n%s", diff)
	}
	if got.Name != "Acme" || got.DomainName.SecondaryLinks[0].URL != "https://docs.acme.test" || got.Address.City != "London" || *got.Address.Lat != 51.5 || *got.AnnualRevenue.AmountMicros != 2500000 || got.AnnualRevenue.CurrencyCode != "GBP" || got.CreatedBy != actor {
		t.Errorf("composites not round-tripped: %+v", got)
	}
}

func TestCompanies_UpdateLeavesNilFieldsUnchanged(t *testing.T) {
	t.Parallel()
	companies := store.NewCompanies(newPool(t))
	created := createCompany(t, companies, "Initech", 10)
	editor := records.Actor{Source: "MANUAL", Name: "Eve Editor"}

	updated, err := companies.Update(t.Context(), editor, created.ID, records.CompanyInput{Address: &records.Address{City: "Austin"}})
	if err != nil {
		t.Fatalf("update: %v", err)
	}

	if updated.Address.City != "Austin" || updated.Name != "Initech" || *updated.AnnualRevenue.AmountMicros != 10 {
		t.Errorf("got %+v, want city changed and name and revenue kept", updated)
	}
	if updated.CreatedBy != actor || updated.UpdatedBy != editor {
		t.Errorf("got createdBy %+v updatedBy %+v, want creator kept and editor recorded", updated.CreatedBy, updated.UpdatedBy)
	}
}

func TestCompanies_GetReportsNotFound(t *testing.T) {
	t.Parallel()
	companies := store.NewCompanies(newPool(t))
	if _, err := companies.Get(t.Context(), "6f2a3a2e-8b0e-4a39-9d5e-2f7d4e2f6a11"); !errors.Is(err, records.ErrNotFound) {
		t.Errorf("got %v, want ErrNotFound", err)
	}
}

func TestCompanies_SoftDeleteHidesUntilRestoreThenDestroyRemoves(t *testing.T) {
	t.Parallel()
	companies := store.NewCompanies(newPool(t))
	company := createCompany(t, companies, "Hooli", 1)
	count := func() int {
		page, err := companies.Find(t.Context(), records.Filter{}, nil, records.PageRequest{})
		if err != nil {
			t.Fatalf("find: %v", err)
		}
		return len(page.Records)
	}

	if err := companies.SoftDelete(t.Context(), company.ID); err != nil {
		t.Fatalf("soft delete: %v", err)
	}
	if got := count(); got != 0 {
		t.Errorf("after soft delete got %d companies, want 0", got)
	}
	if err := companies.Restore(t.Context(), company.ID); err != nil {
		t.Fatalf("restore: %v", err)
	}
	if got := count(); got != 1 {
		t.Errorf("after restore got %d companies, want 1", got)
	}
	if err := companies.Destroy(t.Context(), company.ID); err != nil {
		t.Fatalf("destroy: %v", err)
	}
	if err := companies.Destroy(t.Context(), company.ID); !errors.Is(err, records.ErrNotFound) {
		t.Errorf("second destroy got %v, want ErrNotFound", err)
	}
}

func TestCompanies_FindFiltersSortsAndPages(t *testing.T) {
	t.Parallel()
	companies := store.NewCompanies(newPool(t))
	for i, name := range []string{"Delta", "Alpha", "Charlie", "Bravo"} {
		createCompany(t, companies, name, float64(i+1)*100)
	}
	byName := []records.OrderBy{{Field: "name", Direction: "AscNullsLast"}}

	filtered, err := companies.Find(t.Context(), fieldFilter("annualRevenue", "amountMicros", "gte", 300.0), byName, records.PageRequest{})
	if err != nil {
		t.Fatalf("filter: %v", err)
	}
	if got, want := companyNames(filtered), []string{"Bravo", "Charlie"}; !slices.Equal(got, want) {
		t.Errorf("filter got %v, want %v", got, want)
	}

	first, err := companies.Find(t.Context(), records.Filter{}, byName, records.PageRequest{First: 2})
	if err != nil {
		t.Fatalf("first page: %v", err)
	}
	second, err := companies.Find(t.Context(), records.Filter{}, byName, records.PageRequest{First: 2, After: first.EndCursor})
	if err != nil {
		t.Fatalf("second page: %v", err)
	}
	if got, want := companyNames(first), []string{"Alpha", "Bravo"}; !slices.Equal(got, want) || !first.HasNext || first.TotalCount != 4 {
		t.Errorf("first page got %v hasNext=%v total=%d, want %v hasNext=true total=4", got, first.HasNext, first.TotalCount, want)
	}
	if got, want := companyNames(second), []string{"Charlie", "Delta"}; !slices.Equal(got, want) || second.HasNext || !second.HasPrevious {
		t.Errorf("second page got %v hasNext=%v hasPrevious=%v, want %v last page", got, second.HasNext, second.HasPrevious, want)
	}
}

func TestCompanies_AggregateAndGroupBy(t *testing.T) {
	t.Parallel()
	companies := store.NewCompanies(newPool(t))
	createCompany(t, companies, "Alpha", 100)
	createCompany(t, companies, "Alpha", 300)
	createCompany(t, companies, "Bravo", 200)

	got, err := companies.Aggregate(t.Context(), records.Filter{}, []records.Aggregate{
		{Field: "id", Operation: "count"}, {Field: "annualRevenue", Operation: "sum"},
	})
	if err != nil {
		t.Fatalf("aggregate: %v", err)
	}
	if got["totalCount"] != int64(3) || got["sumAnnualRevenueAmountMicros"] != 600.0 {
		t.Errorf("got %v, want totalCount 3 and sum 600", got)
	}

	groups, err := companies.GroupBy(t.Context(), records.Filter{}, []records.GroupBy{{Field: "name"}}, nil,
		[]records.Aggregate{{Field: "id", Operation: "count"}}, records.PageRequest{First: 10})
	if err != nil {
		t.Fatalf("group by: %v", err)
	}
	if len(groups) != 2 || groups[0].Key[0] != "Alpha" || groups[0].Aggregates["totalCount"] != int64(2) || len(groups[0].Records.Records) != 2 {
		t.Errorf("got %+v, want Alpha group of 2 first", groups)
	}
}
