package store_test

import (
	"errors"
	"slices"
	"testing"
	"time"

	"github.com/google/go-cmp/cmp"

	"github.com/twentyhq/twenty/packages/twenty-server-go/internal/records"
	"github.com/twentyhq/twenty/packages/twenty-server-go/internal/records/store"
)

func createOpportunity(t *testing.T, opportunities *store.Opportunities, input records.OpportunityInput) records.Opportunity {
	t.Helper()
	opportunity, err := opportunities.Create(t.Context(), actor, input)
	if err != nil {
		t.Fatalf("create: %v", err)
	}
	return opportunity
}

func opportunityNames(page records.Page[records.Opportunity]) []string {
	var names []string
	for _, opportunity := range page.Records {
		names = append(names, opportunity.Name)
	}
	return names
}

func TestOpportunities_CreateThenGetRoundTrips(t *testing.T) {
	t.Parallel()
	pool := newPool(t)
	opportunities := store.NewOpportunities(pool)
	companyID := insertCompany(t, pool)
	micros := 5000000.0
	closeDate := time.Date(2027, 3, 1, 12, 0, 0, 0, time.UTC)

	created := createOpportunity(t, opportunities, records.OpportunityInput{
		Name:      new("Big deal"),
		Amount:    &records.Currency{AmountMicros: &micros, CurrencyCode: "EUR"},
		CloseDate: &closeDate,
		Stage:     new("PROPOSAL"),
		CompanyID: &companyID,
	})

	got, err := opportunities.Get(t.Context(), created.ID)
	if err != nil {
		t.Fatalf("get: %v", err)
	}
	if diff := cmp.Diff(created, got); diff != "" {
		t.Errorf("Get differs from Create (-create +get):\n%s", diff)
	}
	if got.Stage != "PROPOSAL" || !got.CloseDate.Equal(closeDate) || *got.Amount.AmountMicros != micros || got.Amount.CurrencyCode != "EUR" || *got.CompanyID != companyID || got.CreatedBy != actor {
		t.Errorf("not round-tripped: %+v", got)
	}
}

func TestOpportunities_CreateDefaultsStageToNew(t *testing.T) {
	t.Parallel()
	opportunities := store.NewOpportunities(newPool(t))
	if got := createOpportunity(t, opportunities, records.OpportunityInput{Name: new("Lead")}).Stage; got != "NEW" {
		t.Errorf("got stage %q, want NEW", got)
	}
}

func TestOpportunities_UpdateLeavesNilFieldsUnchanged(t *testing.T) {
	t.Parallel()
	opportunities := store.NewOpportunities(newPool(t))
	created := createOpportunity(t, opportunities, records.OpportunityInput{Name: new("Renewal"), Stage: new("MEETING")})
	editor := records.Actor{Source: "MANUAL", Name: "Eve Editor"}

	updated, err := opportunities.Update(t.Context(), editor, created.ID, records.OpportunityInput{Stage: new("CUSTOMER")})
	if err != nil {
		t.Fatalf("update: %v", err)
	}

	if updated.Stage != "CUSTOMER" || updated.Name != "Renewal" {
		t.Errorf("got %+v, want stage changed and name kept", updated)
	}
	if updated.CreatedBy != actor || updated.UpdatedBy != editor {
		t.Errorf("got createdBy %+v updatedBy %+v, want creator kept and editor recorded", updated.CreatedBy, updated.UpdatedBy)
	}
}

func TestOpportunities_UpdateClearsRelationWithEmptyID(t *testing.T) {
	t.Parallel()
	pool := newPool(t)
	opportunities := store.NewOpportunities(pool)
	companyID := insertCompany(t, pool)
	created := createOpportunity(t, opportunities, records.OpportunityInput{CompanyID: &companyID})

	updated, err := opportunities.Update(t.Context(), actor, created.ID, records.OpportunityInput{CompanyID: new("")})
	if err != nil {
		t.Fatalf("update: %v", err)
	}
	if updated.CompanyID != nil {
		t.Errorf("got company %v, want nil", *updated.CompanyID)
	}
}

func TestOpportunities_LifecycleErrors(t *testing.T) {
	t.Parallel()
	opportunities := store.NewOpportunities(newPool(t))
	missing := "6f2a3a2e-8b0e-4a39-9d5e-2f7d4e2f6a11"
	if _, err := opportunities.Get(t.Context(), missing); !errors.Is(err, records.ErrNotFound) {
		t.Errorf("get got %v, want ErrNotFound", err)
	}

	created := createOpportunity(t, opportunities, records.OpportunityInput{Name: new("Gone")})
	if err := opportunities.SoftDelete(t.Context(), created.ID); err != nil {
		t.Fatalf("soft delete: %v", err)
	}
	page, err := opportunities.Find(t.Context(), records.Filter{}, nil, records.PageRequest{})
	if err != nil {
		t.Fatalf("find: %v", err)
	}
	if len(page.Records) != 0 {
		t.Errorf("got %d opportunities after soft delete, want 0", len(page.Records))
	}
	if err := opportunities.Restore(t.Context(), created.ID); err != nil {
		t.Fatalf("restore: %v", err)
	}
	if err := opportunities.Destroy(t.Context(), created.ID); err != nil {
		t.Fatalf("destroy: %v", err)
	}
	if err := opportunities.Destroy(t.Context(), created.ID); !errors.Is(err, records.ErrNotFound) {
		t.Errorf("second destroy got %v, want ErrNotFound", err)
	}
}

func TestOpportunities_FindFiltersSelectAndDateSortsAndPages(t *testing.T) {
	t.Parallel()
	opportunities := store.NewOpportunities(newPool(t))
	day := func(d int) *time.Time { value := time.Date(2027, 1, d, 0, 0, 0, 0, time.UTC); return &value }
	createOpportunity(t, opportunities, records.OpportunityInput{Name: new("A"), Stage: new("NEW"), CloseDate: day(3)})
	createOpportunity(t, opportunities, records.OpportunityInput{Name: new("B"), Stage: new("MEETING"), CloseDate: day(1)})
	createOpportunity(t, opportunities, records.OpportunityInput{Name: new("C"), Stage: new("MEETING"), CloseDate: day(2)})
	byName := []records.OrderBy{{Field: "name", Direction: "AscNullsLast"}}
	find := func(filter records.Filter, order []records.OrderBy, page records.PageRequest) records.Page[records.Opportunity] {
		result, err := opportunities.Find(t.Context(), filter, order, page)
		if err != nil {
			t.Fatalf("find: %v", err)
		}
		return result
	}

	if got, want := opportunityNames(find(fieldFilter("stage", "", "eq", "MEETING"), byName, records.PageRequest{})), []string{"B", "C"}; !slices.Equal(got, want) {
		t.Errorf("stage eq got %v, want %v", got, want)
	}
	if got, want := opportunityNames(find(fieldFilter("stage", "", "in", []string{"NEW", "MEETING"}), byName, records.PageRequest{})), []string{"A", "B", "C"}; !slices.Equal(got, want) {
		t.Errorf("stage in got %v, want %v", got, want)
	}
	if got, want := opportunityNames(find(fieldFilter("closeDate", "", "gte", "2027-01-02T00:00:00Z"), byName, records.PageRequest{})), []string{"A", "C"}; !slices.Equal(got, want) {
		t.Errorf("closeDate gte got %v, want %v", got, want)
	}

	byClose := []records.OrderBy{{Field: "closeDate", Direction: "AscNullsLast"}}
	first := find(records.Filter{}, byClose, records.PageRequest{First: 2})
	second := find(records.Filter{}, byClose, records.PageRequest{First: 2, After: first.EndCursor})
	if got, want := opportunityNames(first), []string{"B", "C"}; !slices.Equal(got, want) || !first.HasNext {
		t.Errorf("first page got %v hasNext=%v, want %v hasNext=true", got, first.HasNext, want)
	}
	if got, want := opportunityNames(second), []string{"A"}; !slices.Equal(got, want) || second.HasNext {
		t.Errorf("second page got %v hasNext=%v, want %v last page", got, second.HasNext, want)
	}
}

func TestOpportunities_AggregateAndGroupByStage(t *testing.T) {
	t.Parallel()
	opportunities := store.NewOpportunities(newPool(t))
	for _, stage := range []string{"NEW", "MEETING", "MEETING"} {
		micros := 100.0
		createOpportunity(t, opportunities, records.OpportunityInput{Stage: new(stage), Amount: &records.Currency{AmountMicros: &micros, CurrencyCode: "USD"}})
	}

	got, err := opportunities.Aggregate(t.Context(), records.Filter{}, []records.Aggregate{{Field: "amount", Operation: "sum"}, {Field: "stage", Operation: "countUniqueValues"}})
	if err != nil {
		t.Fatalf("aggregate: %v", err)
	}
	if got["sumAmountAmountMicros"] != 300.0 || got["countUniqueValuesStage"] != int64(2) {
		t.Errorf("got %v, want sum 300 and 2 distinct stages", got)
	}

	groups, err := opportunities.GroupBy(t.Context(), records.Filter{}, []records.GroupBy{{Field: "stage"}}, nil,
		[]records.Aggregate{{Field: "id", Operation: "count"}}, records.PageRequest{First: 10})
	if err != nil {
		t.Fatalf("group by: %v", err)
	}
	counts := map[any]any{}
	for _, group := range groups {
		counts[group.Key[0]] = group.Aggregates["totalCount"]
		if int64(len(group.Records.Records)) != group.Aggregates["totalCount"] {
			t.Errorf("group %v has %d records, want %v", group.Key[0], len(group.Records.Records), group.Aggregates["totalCount"])
		}
	}
	if diff := cmp.Diff(map[any]any{"NEW": int64(1), "MEETING": int64(2)}, counts); diff != "" {
		t.Errorf("group counts (-want +got):\n%s", diff)
	}
}
