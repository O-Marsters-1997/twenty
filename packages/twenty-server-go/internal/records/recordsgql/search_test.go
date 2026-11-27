package recordsgql_test

import (
	"net/http/httptest"
	"slices"
	"testing"

	"github.com/google/go-cmp/cmp"

	"github.com/twentyhq/twenty/packages/twenty-server-go/internal/records"
	"github.com/twentyhq/twenty/packages/twenty-server-go/internal/records/store"
	"github.com/twentyhq/twenty/packages/twenty-server-go/internal/workspace"
)

const searchQuery = `query Search($searchInput: String!, $limit: Int!, $after: String, $excludedObjectNameSingulars: [String!], $includedObjectNameSingulars: [String!], $filter: ObjectRecordFilterInput) {
  search(searchInput: $searchInput, limit: $limit, after: $after, excludedObjectNameSingulars: $excludedObjectNameSingulars, includedObjectNameSingulars: $includedObjectNameSingulars, filter: $filter) {
    edges { node { recordId objectNameSingular objectLabelSingular label imageUrl tsRankCD tsRank } cursor }
    pageInfo { hasNextPage endCursor }
  }
}`

const combinedFindManyRecords = `query CombinedFindManyRecords($filterCompany: CompanyFilterInput, $orderByCompany: [CompanyOrderByInput], $afterCompany: String, $beforeCompany: String, $firstCompany: Int, $lastCompany: Int,
  $filterPerson: PersonFilterInput, $orderByPerson: [PersonOrderByInput], $afterPerson: String, $beforePerson: String, $firstPerson: Int, $lastPerson: Int) {
  companies(filter: $filterCompany, orderBy: $orderByCompany, after: $afterCompany, before: $beforeCompany, first: $firstCompany, last: $lastCompany) {
    edges { node { name } cursor }
    pageInfo { hasNextPage hasPreviousPage startCursor endCursor }
    totalCount
  }
  people(filter: $filterPerson, orderBy: $orderByPerson, after: $afterPerson, before: $beforePerson, first: $firstPerson, last: $lastPerson) {
    edges { node { name { firstName } } cursor }
    pageInfo { hasNextPage hasPreviousPage startCursor endCursor }
    totalCount
  }
}`

func seedSearchRecords(t *testing.T) *httptest.Server {
	t.Helper()
	server, pool := newServerWithPool(t)
	actor := records.Actor{Source: "MANUAL"}
	for _, name := range []string{"Acme", "Acme Labs", "Bolt"} {
		if _, err := store.NewCompanies(pool).Create(t.Context(), actor, records.CompanyInput{Name: &name}); err != nil {
			t.Fatalf("create company %s: %v", name, err)
		}
	}
	for _, first := range []string{"Acme", "Zed"} {
		if _, err := store.NewPeople(pool).Create(t.Context(), actor, records.PersonInput{Name: &records.FullName{FirstName: first, LastName: "Person"}}); err != nil {
			t.Fatalf("create person %s: %v", first, err)
		}
	}
	if _, err := pool.Exec(t.Context(), `UPDATE `+workspace.SchemaName()+`.company SET "deletedAt" = now() WHERE name = 'Acme Labs'`); err != nil {
		t.Fatalf("soft delete: %v", err)
	}
	return server
}

func searchLabels(t *testing.T, response map[string]any) []string {
	t.Helper()
	data, ok := response["data"].(map[string]any)
	if !ok {
		t.Fatalf("response has no data: %v", response)
	}
	found := []string{}
	for _, edge := range data["search"].(map[string]any)["edges"].([]any) {
		node := edge.(map[string]any)["node"].(map[string]any)
		found = append(found, node["objectNameSingular"].(string)+":"+node["label"].(string))
	}
	slices.Sort(found)
	return found
}

func TestSearch(t *testing.T) {
	t.Parallel()
	server := seedSearchRecords(t)

	tests := []struct {
		name      string
		variables map[string]any
		want      []string
	}{
		{"matches a prefix across objects and skips soft-deleted records", map[string]any{"searchInput": "acm", "limit": 10}, []string{"company:Acme", "person:Acme Person"}},
		{"restricts to included objects", map[string]any{"searchInput": "acm", "limit": 10, "includedObjectNameSingulars": []string{"person"}}, []string{"person:Acme Person"}},
		{"excludes objects", map[string]any{"searchInput": "acm", "limit": 10, "excludedObjectNameSingulars": []string{"person"}}, []string{"company:Acme"}},
		{"applies the object record filter", map[string]any{"searchInput": "acm", "limit": 10, "filter": map[string]any{"deletedAt": map[string]any{"is": "NOT_NULL"}}}, []string{"company:Acme Labs"}},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got := searchLabels(t, send(t, server, "Search", searchQuery, tt.variables))
			if diff := cmp.Diff(tt.want, got); diff != "" {
				t.Errorf("Search(%v) (-want +got):\n%s", tt.variables, diff)
			}
		})
	}

	t.Run("returns the object label and ranks", func(t *testing.T) {
		response := send(t, server, "Search", searchQuery, map[string]any{"searchInput": "bolt", "limit": 10})
		node := response["data"].(map[string]any)["search"].(map[string]any)["edges"].([]any)[0].(map[string]any)["node"].(map[string]any)
		if node["objectLabelSingular"] != "Company" || node["tsRank"].(float64) <= 0 || node["tsRankCD"].(float64) <= 0 {
			t.Errorf("node = %v, want the Company label and positive ranks", node)
		}
	})

	t.Run("pages with the cursor", func(t *testing.T) {
		first := send(t, server, "Search", searchQuery, map[string]any{"searchInput": "", "limit": 2})
		pageInfo := first["data"].(map[string]any)["search"].(map[string]any)["pageInfo"].(map[string]any)
		if pageInfo["hasNextPage"] != true {
			t.Fatalf("first page pageInfo = %v, want a next page", pageInfo)
		}
		second := send(t, server, "Search", searchQuery, map[string]any{"searchInput": "", "limit": 2, "after": pageInfo["endCursor"]})
		got := slices.Concat(searchLabels(t, first), searchLabels(t, second))
		slices.Sort(got)
		want := []string{"company:Acme", "company:Bolt", "person:Acme Person", "person:Zed Person"}
		if diff := cmp.Diff(want, got); diff != "" {
			t.Errorf("two pages of an empty search (-want +got):\n%s", diff)
		}
	})
}

func TestCombinedFindManyRecords(t *testing.T) {
	t.Parallel()
	server := seedSearchRecords(t)

	response := send(t, server, "CombinedFindManyRecords", combinedFindManyRecords, map[string]any{
		"orderByCompany": []any{map[string]any{"name": "AscNullsFirst"}}, "firstCompany": 1, "firstPerson": 5,
	})
	data, ok := response["data"].(map[string]any)
	if !ok {
		t.Fatalf("response has no data: %v", response)
	}
	companies, people := data["companies"].(map[string]any), data["people"].(map[string]any)
	if companies["totalCount"] != float64(2) || people["totalCount"] != float64(2) {
		t.Errorf("totals = companies %v, people %v, want 2 and 2", companies["totalCount"], people["totalCount"])
	}
	if companies["pageInfo"].(map[string]any)["hasNextPage"] != true {
		t.Errorf("companies pageInfo = %v, want a next page", companies["pageInfo"])
	}
	if name := companies["edges"].([]any)[0].(map[string]any)["node"].(map[string]any)["name"]; name != "Acme" {
		t.Errorf("first company = %v, want Acme", name)
	}
	if got := len(people["edges"].([]any)); got != 2 {
		t.Errorf("people edges = %d, want 2", got)
	}
}
