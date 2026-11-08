package recordsgql_test

import (
	"testing"

	"github.com/google/go-cmp/cmp"

	"github.com/twentyhq/twenty/packages/twenty-server-go/internal/records"
	"github.com/twentyhq/twenty/packages/twenty-server-go/internal/records/store"
)

const findCompanies = `query FindCompanies($filter: CompanyFilterInput, $orderBy: [CompanyOrderByInput], $limit: Int) {
  companies(filter: $filter, orderBy: $orderBy, first: $limit) {
    edges { node { name domainName { primaryLinkUrl } address { addressCity addressLat } annualRevenue { amountMicros currencyCode } createdBy { source } } }
    pageInfo { hasNextPage }
    totalCount
  }
}`

const aggregateCompanies = `query AggregateCompanies($filter: CompanyFilterInput) {
  companies(filter: $filter) { totalCount sumAnnualRevenueAmountMicros countNotEmptyAddress minCreatedAt }
}`

const companiesGroupBy = `query CompaniesGroupByAggregates($groupBy: [CompanyGroupByInput!]!) {
  companiesGroupBy(groupBy: $groupBy) { groupByDimensionValues totalCount maxAnnualRevenueAmountMicros }
}`

const aggregateOpportunities = `query AggregateOpportunities($filter: OpportunityFilterInput) {
  opportunities(filter: $filter) { totalCount sumAmountAmountMicros countUniqueValuesStage minCloseDate }
}`

const opportunitiesGroupBy = `query OpportunitiesGroupByRecords($groupBy: [OpportunityGroupByInput!]!, $filter: OpportunityFilterInput) {
  opportunitiesGroupBy(groupBy: $groupBy, filter: $filter) { groupByDimensionValues edges { node { name stage closeDate } } }
}`

func TestCompanyOperations(t *testing.T) {
	t.Parallel()
	server, pool := newServerWithPool(t)
	companies := store.NewCompanies(pool)
	for name, revenue := range map[string]float64{"Acme": 100, "Bolt": 300} {
		city := "Paris"
		if _, err := companies.Create(t.Context(), records.Actor{Source: "MANUAL"}, records.CompanyInput{
			Name:          &name,
			DomainName:    &records.Links{PrimaryLink: records.Link{URL: "https://" + name + ".test"}},
			Address:       &records.Address{City: city},
			AnnualRevenue: &records.Currency{AmountMicros: &revenue, CurrencyCode: "EUR"},
		}); err != nil {
			t.Fatalf("create %s: %v", name, err)
		}
	}

	t.Run("lists with a nested filter and composite fields", func(t *testing.T) {
		response := send(t, server, "FindCompanies", findCompanies, map[string]any{
			"filter": map[string]any{"annualRevenue": map[string]any{"amountMicros": map[string]any{"gte": 200}}},
			"limit":  10,
		})
		want := map[string]any{"data": map[string]any{"companies": map[string]any{
			"totalCount": float64(1),
			"pageInfo":   map[string]any{"hasNextPage": false},
			"edges": []any{map[string]any{"node": map[string]any{
				"name":          "Bolt",
				"domainName":    map[string]any{"primaryLinkUrl": "https://Bolt.test"},
				"address":       map[string]any{"addressCity": "Paris", "addressLat": nil},
				"annualRevenue": map[string]any{"amountMicros": float64(300), "currencyCode": "EUR"},
				"createdBy":     map[string]any{"source": "MANUAL"},
			}}},
		}}}
		if diff := cmp.Diff(want, response); diff != "" {
			t.Errorf("FindCompanies (-want +got):\n%s", diff)
		}
	})

	t.Run("aggregates currency by amountMicros", func(t *testing.T) {
		response := send(t, server, "AggregateCompanies", aggregateCompanies, nil)
		got := response["data"].(map[string]any)["companies"].(map[string]any)
		if got["totalCount"] != float64(2) || got["sumAnnualRevenueAmountMicros"] != float64(400) || got["countNotEmptyAddress"] != float64(2) || got["minCreatedAt"] == nil {
			t.Errorf("AggregateCompanies = %v, want 2 companies summing 400", got)
		}
	})

	t.Run("groups by a text field", func(t *testing.T) {
		response := send(t, server, "CompaniesGroupByAggregates", companiesGroupBy, map[string]any{"groupBy": []any{map[string]any{"name": true}}})
		want := []any{
			map[string]any{"groupByDimensionValues": []any{"Acme"}, "totalCount": float64(1), "maxAnnualRevenueAmountMicros": float64(100)},
			map[string]any{"groupByDimensionValues": []any{"Bolt"}, "totalCount": float64(1), "maxAnnualRevenueAmountMicros": float64(300)},
		}
		if diff := cmp.Diff(want, response["data"].(map[string]any)["companiesGroupBy"]); diff != "" {
			t.Errorf("CompaniesGroupByAggregates (-want +got):\n%s", diff)
		}
	})
}

func TestOpportunityOperations(t *testing.T) {
	t.Parallel()
	server, pool := newServerWithPool(t)
	opportunities := store.NewOpportunities(pool)
	for name, stage := range map[string]string{"One": "NEW", "Two": "MEETING", "Three": "MEETING"} {
		micros := 50.0
		if _, err := opportunities.Create(t.Context(), records.Actor{Source: "MANUAL"}, records.OpportunityInput{
			Name: &name, Stage: &stage, Amount: &records.Currency{AmountMicros: &micros, CurrencyCode: "USD"},
		}); err != nil {
			t.Fatalf("create %s: %v", name, err)
		}
	}

	t.Run("aggregates over a select enum filter", func(t *testing.T) {
		response := send(t, server, "AggregateOpportunities", aggregateOpportunities, map[string]any{
			"filter": map[string]any{"stage": map[string]any{"in": []any{"MEETING"}}},
		})
		want := map[string]any{"data": map[string]any{"opportunities": map[string]any{
			"totalCount": float64(2), "sumAmountAmountMicros": float64(100), "countUniqueValuesStage": float64(1), "minCloseDate": nil,
		}}}
		if diff := cmp.Diff(want, response); diff != "" {
			t.Errorf("AggregateOpportunities (-want +got):\n%s", diff)
		}
	})

	t.Run("groups records by stage", func(t *testing.T) {
		response := send(t, server, "OpportunitiesGroupByRecords", opportunitiesGroupBy, map[string]any{"groupBy": []any{map[string]any{"stage": true}}})
		sizes := map[any]int{}
		for _, group := range response["data"].(map[string]any)["opportunitiesGroupBy"].([]any) {
			item := group.(map[string]any)
			sizes[item["groupByDimensionValues"].([]any)[0]] = len(item["edges"].([]any))
		}
		if diff := cmp.Diff(map[any]int{"NEW": 1, "MEETING": 2}, sizes); diff != "" {
			t.Errorf("records per stage (-want +got):\n%s", diff)
		}
	})

	t.Run("an unknown stage is a graphql error", func(t *testing.T) {
		response := send(t, server, "AggregateOpportunities", aggregateOpportunities, map[string]any{
			"filter": map[string]any{"stage": map[string]any{"eq": "BOGUS"}},
		})
		if errs, _ := response["errors"].([]any); len(errs) == 0 {
			t.Errorf("response = %v, want an error", response)
		}
	})
}
