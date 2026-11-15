package recordsgql_test

import (
	"bytes"
	"encoding/json"
	"io"
	"log/slog"
	"net/http"
	"net/http/httptest"
	"regexp"
	"slices"
	"testing"

	"github.com/google/go-cmp/cmp"
	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/twentyhq/twenty/packages/twenty-server-go/internal/auth"
	"github.com/twentyhq/twenty/packages/twenty-server-go/internal/model"
	"github.com/twentyhq/twenty/packages/twenty-server-go/internal/pgtest"
	"github.com/twentyhq/twenty/packages/twenty-server-go/internal/records/recordsgql"
	"github.com/twentyhq/twenty/packages/twenty-server-go/internal/records/store"
)

var duplicateCriteria = map[string][][]string{
	"person":  {{"nameFirstName", "nameLastName"}, {"emailsPrimaryEmail"}},
	"company": {{"name"}},
}

func newDynamicServer(t *testing.T, singulars ...string) *httptest.Server {
	t.Helper()
	pool, err := pgxpool.New(t.Context(), pgtest.New(t))
	if err != nil {
		t.Fatalf("connect: %v", err)
	}
	t.Cleanup(pool.Close)
	newStore := func(object model.Object) recordsgql.DynamicStore { return store.NewDynamic(pool, object) }
	var objects []recordsgql.DynamicObject
	for _, singular := range singulars {
		object := model.Objects[slices.IndexFunc(model.Objects, func(candidate model.Object) bool { return candidate.NameSingular == singular })]
		objects = append(objects, recordsgql.DynamicObject{Object: object, Store: newStore(object), DuplicateCriteria: duplicateCriteria[singular]})
	}
	dynamic := recordsgql.NewDynamic(objects, newStore, slog.New(slog.NewTextHandler(io.Discard, nil)))
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		dynamic.ServeHTTP(w, r.WithContext(auth.WithPrincipal(r.Context(), auth.Principal{UserID: "user-1"})))
	}))
	t.Cleanup(server.Close)
	return server
}

func call(t *testing.T, server *httptest.Server, query string, variables map[string]any) map[string]any {
	t.Helper()
	body, err := json.Marshal(map[string]any{"query": query, "variables": variables})
	if err != nil {
		t.Fatal(err)
	}
	request, err := http.NewRequestWithContext(t.Context(), http.MethodPost, server.URL, bytes.NewReader(body))
	if err != nil {
		t.Fatal(err)
	}
	response, err := server.Client().Do(request)
	if err != nil {
		t.Fatal(err)
	}
	defer func() { _ = response.Body.Close() }()
	var decoded map[string]any
	if err := json.NewDecoder(response.Body).Decode(&decoded); err != nil {
		t.Fatalf("decode response: %v", err)
	}
	return decoded
}

func dataOf(t *testing.T, response map[string]any) map[string]any {
	t.Helper()
	data, ok := response["data"].(map[string]any)
	if !ok {
		t.Fatalf("response has no data: %v", response)
	}
	return data
}

func TestDynamic_RecordOperations(t *testing.T) {
	t.Parallel()
	server := newDynamicServer(t, "person", "company")

	company := dataOf(t, call(t, server,
		`mutation CreateOneCompany($data: CompanyCreateInput!) { createCompany(data: $data) { id name domainName { primaryLinkUrl } __typename } }`,
		map[string]any{"data": map[string]any{"name": "Analytical Engines", "domainName": map[string]any{"primaryLinkUrl": "https://engines.example"}}}))["createCompany"].(map[string]any)
	companyID := company["id"].(string)
	wantCompany := map[string]any{"id": companyID, "name": "Analytical Engines", "domainName": map[string]any{"primaryLinkUrl": "https://engines.example"}, "__typename": "Company"}
	if diff := cmp.Diff(wantCompany, company); diff != "" {
		t.Errorf("createCompany mismatch (-want +got):\n%s", diff)
	}

	const createPerson = `mutation CreateOnePerson($data: PersonCreateInput!) { createPerson(data: $data) { id name { firstName lastName } emails { primaryEmail } jobTitle companyId createdAt createdBy { source } } }`
	ada := dataOf(t, call(t, server, createPerson, map[string]any{"data": map[string]any{
		"name": map[string]any{"firstName": "Ada", "lastName": "Lovelace"}, "emails": map[string]any{"primaryEmail": "ada@x.org"}, "companyId": companyID,
	}}))["createPerson"].(map[string]any)
	adaID := ada["id"].(string)
	if !regexp.MustCompile(`^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{3}Z$`).MatchString(ada["createdAt"].(string)) {
		t.Errorf("createdAt = %v, want ISO timestamp with milliseconds", ada["createdAt"])
	}
	delete(ada, "createdAt")
	wantAda := map[string]any{
		"id": adaID, "name": map[string]any{"firstName": "Ada", "lastName": "Lovelace"}, "emails": map[string]any{"primaryEmail": "ada@x.org"},
		"jobTitle": nil, "companyId": companyID, "createdBy": map[string]any{"source": "MANUAL"},
	}
	if diff := cmp.Diff(wantAda, ada); diff != "" {
		t.Errorf("createPerson mismatch (-want +got):\n%s", diff)
	}

	duplicate := dataOf(t, call(t, server, createPerson, map[string]any{"data": map[string]any{
		"name": map[string]any{"firstName": "Ada", "lastName": "Lovelace"}, "jobTitle": "Mathematician",
	}}))["createPerson"].(map[string]any)
	duplicateID := duplicate["id"].(string)

	found := dataOf(t, call(t, server,
		`query FindManyPeople($filter: PersonFilterInput, $first: Int) { people(filter: $filter, first: $first) { edges { node { id company { id name people { totalCount } } } cursor } pageInfo { hasNextPage } totalCount } }`,
		map[string]any{"filter": map[string]any{"id": map[string]any{"eq": adaID}}, "first": 5}))["people"].(map[string]any)
	edges := found["edges"].([]any)
	if len(edges) != 1 {
		t.Fatalf("people = %v, want one edge", found)
	}
	wantNode := map[string]any{"id": adaID, "company": map[string]any{"id": companyID, "name": "Analytical Engines", "people": map[string]any{"totalCount": float64(1)}}}
	if diff := cmp.Diff(wantNode, edges[0].(map[string]any)["node"]); diff != "" {
		t.Errorf("FindManyPeople node mismatch (-want +got):\n%s", diff)
	}
	if diff := cmp.Diff(map[string]any{"hasNextPage": false}, found["pageInfo"]); diff != "" {
		t.Errorf("FindManyPeople pageInfo mismatch (-want +got):\n%s", diff)
	}

	duplicates := dataOf(t, call(t, server,
		`query FindDuplicatePerson($ids: [UUID!]!) { personDuplicates(ids: $ids) { edges { node { id } } } }`,
		map[string]any{"ids": []any{adaID}}))["personDuplicates"].([]any)
	wantDuplicates := []any{map[string]any{"edges": []any{map[string]any{"node": map[string]any{"id": duplicateID}}}}}
	if diff := cmp.Diff(wantDuplicates, duplicates); diff != "" {
		t.Errorf("personDuplicates mismatch (-want +got):\n%s", diff)
	}

	groups := dataOf(t, call(t, server,
		`query PeopleGroupByAggregates($groupBy: [PersonGroupByInput!]!) { peopleGroupBy(groupBy: $groupBy) { groupByDimensionValues countNotEmptyEmails } }`,
		map[string]any{"groupBy": []any{map[string]any{"jobTitle": true}}}))["peopleGroupBy"].([]any)
	wantGroups := []any{
		map[string]any{"groupByDimensionValues": []any{"Mathematician"}, "countNotEmptyEmails": float64(0)},
		map[string]any{"groupByDimensionValues": []any{nil}, "countNotEmptyEmails": float64(1)},
	}
	if diff := cmp.Diff(wantGroups, groups); diff != "" {
		t.Errorf("peopleGroupBy mismatch (-want +got):\n%s", diff)
	}

	merged := dataOf(t, call(t, server,
		`mutation MergePeople($ids: [UUID!]!, $conflictPriorityIndex: Int!, $dryRun: Boolean) { mergePeople(ids: $ids, conflictPriorityIndex: $conflictPriorityIndex, dryRun: $dryRun) { id jobTitle emails { primaryEmail } } }`,
		map[string]any{"ids": []any{adaID, duplicateID}, "conflictPriorityIndex": 0}))["mergePeople"].(map[string]any)
	wantMerged := map[string]any{"id": adaID, "jobTitle": "Mathematician", "emails": map[string]any{"primaryEmail": "ada@x.org"}}
	if diff := cmp.Diff(wantMerged, merged); diff != "" {
		t.Errorf("mergePeople mismatch (-want +got):\n%s", diff)
	}
	remaining := dataOf(t, call(t, server, `query FindManyPeople { people { totalCount } }`, nil))["people"]
	if diff := cmp.Diff(map[string]any{"totalCount": float64(1)}, remaining); diff != "" {
		t.Errorf("people after merge mismatch (-want +got):\n%s", diff)
	}

	deleted := dataOf(t, call(t, server, `mutation DeleteOnePerson($id: UUID!) { deletePerson(id: $id) { id } }`, map[string]any{"id": adaID}))["deletePerson"]
	if diff := cmp.Diff(map[string]any{"id": adaID}, deleted); diff != "" {
		t.Errorf("deletePerson mismatch (-want +got):\n%s", diff)
	}
	restored := dataOf(t, call(t, server,
		`mutation RestoreManyPeople($filter: PersonFilterInput!) { restorePeople(filter: $filter) { id } }`,
		map[string]any{"filter": map[string]any{"id": map[string]any{"eq": adaID}, "deletedAt": map[string]any{"is": "NOT_NULL"}}}))["restorePeople"]
	if diff := cmp.Diff([]any{map[string]any{"id": adaID}}, restored); diff != "" {
		t.Errorf("restorePeople mismatch (-want +got):\n%s", diff)
	}
	destroyed := dataOf(t, call(t, server, `mutation DestroyOnePerson($id: UUID!) { destroyPerson(id: $id) { id } }`, map[string]any{"id": adaID}))["destroyPerson"]
	if diff := cmp.Diff(map[string]any{"id": adaID}, destroyed); diff != "" {
		t.Errorf("destroyPerson mismatch (-want +got):\n%s", diff)
	}
}

func TestDynamic_ServesAnyRegisteredObject(t *testing.T) {
	t.Parallel()
	server := newDynamicServer(t, "task")

	call(t, server, `mutation CreateOneTask($data: TaskCreateInput!) { createTask(data: $data) { id } }`, map[string]any{"data": map[string]any{"title": "Write ADR", "status": "TODO"}})
	tasks := dataOf(t, call(t, server, `query FindManyTasks { tasks { edges { node { title status __typename } } totalCount } }`, nil))["tasks"]
	want := map[string]any{
		"edges":      []any{map[string]any{"node": map[string]any{"title": "Write ADR", "status": "TODO", "__typename": "Task"}}},
		"totalCount": float64(1),
	}
	if diff := cmp.Diff(want, tasks); diff != "" {
		t.Errorf("tasks mismatch (-want +got):\n%s", diff)
	}
}

func TestDynamic_RejectsUnknownFields(t *testing.T) {
	t.Parallel()
	server := newDynamicServer(t, "person")
	call(t, server, `mutation CreateOnePerson { createPerson(data: {jobTitle: "Engineer"}) { id } }`, nil)

	tests := []struct {
		name  string
		query string
	}{
		{"selection", `query FindManyPeople { people { edges { node { notAField } } } }`},
		{"input", `mutation CreateOnePerson { createPerson(data: {notAField: "x"}) { id } }`},
		{"root", `query Other { nothing { id } }`},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			response := call(t, server, tt.query, nil)
			errs, ok := response["errors"].([]any)
			if !ok || len(errs) != 1 {
				t.Fatalf("response = %v, want one error", response)
			}
			code := errs[0].(map[string]any)["extensions"].(map[string]any)["code"]
			if code != "BAD_USER_INPUT" {
				t.Errorf("error code = %v, want BAD_USER_INPUT", code)
			}
		})
	}
}
