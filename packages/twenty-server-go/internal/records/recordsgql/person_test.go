package recordsgql_test

import (
	"bytes"
	"context"
	"encoding/json"
	"io"
	"log/slog"
	"net/http"
	"net/http/httptest"
	"net/url"
	"testing"

	"github.com/google/go-cmp/cmp"
	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/twentyhq/twenty/packages/twenty-server-go/internal/auth"
	"github.com/twentyhq/twenty/packages/twenty-server-go/internal/frontdoor"
	"github.com/twentyhq/twenty/packages/twenty-server-go/internal/pgtest"
	"github.com/twentyhq/twenty/packages/twenty-server-go/internal/records/recordsgql"
	"github.com/twentyhq/twenty/packages/twenty-server-go/internal/records/store"
)

type verifier struct{}

func (verifier) Verify(context.Context, string) (auth.Principal, error) {
	return auth.Principal{UserID: "user-1"}, nil
}

func newServer(t *testing.T) *httptest.Server {
	t.Helper()
	server, _ := newServerWithPool(t)
	return server
}

func newServerWithPool(t *testing.T) (*httptest.Server, *pgxpool.Pool) {
	t.Helper()
	pool, err := pgxpool.New(t.Context(), pgtest.New(t))
	if err != nil {
		t.Fatalf("connect: %v", err)
	}
	t.Cleanup(pool.Close)
	table := frontdoor.OperationTable{frontdoor.EndpointWorkspace: {}}
	for _, name := range []string{"Create", "Find", "Update", "Delete", "Restore", "Destroy", "AggregatePeople", "PeopleGroupByAggregates", "PeopleGroupByRecords",
		"FindCompanies", "AggregateCompanies", "CompaniesGroupByAggregates", "CompaniesGroupByRecords", "FindOpportunities", "AggregateOpportunities", "OpportunitiesGroupByAggregates", "OpportunitiesGroupByRecords",
		"AggregateNotes", "TasksGroupByRecords", "NoteTargetsGroupByAggregates",
		"AggregateWorkspaceMembers", "AggregateDashboards", "DashboardsGroupByAggregates",
		"AggregateTimelineActivities", "TimelineActivitiesGroupByAggregates", "AggregateAttachments", "AttachmentsGroupByRecords"} {
		table[frontdoor.EndpointWorkspace][name] = frontdoor.RouteGo
	}
	logger := slog.New(slog.NewTextHandler(io.Discard, nil))
	upstream, err := url.Parse("http://node.invalid")
	if err != nil {
		t.Fatal(err)
	}
	server := httptest.NewServer(frontdoor.NewHandler(table, upstream, verifier{}, recordsgql.NewHandler(&recordsgql.Resolver{
		Store:              store.NewPeople(pool),
		Companies:          store.NewCompanies(pool),
		Opportunities:      store.NewOpportunities(pool),
		WorkspaceMembers:   store.NewWorkspaceMembers(pool),
		Dashboards:         store.NewDashboards(pool),
		TimelineActivities: store.NewTimelineActivities(pool),
		Attachments:        store.NewAttachments(pool),
		Notes:              store.NewNotes(pool),
		NoteTargets:        store.NewNoteTargets(pool),
		Tasks:              store.NewTasks(pool),
		TaskTargets:        store.NewTaskTargets(pool),
	}, logger), logger))
	t.Cleanup(server.Close)
	return server, pool
}

func send(t *testing.T, server *httptest.Server, operation, query string, variables map[string]any) map[string]any {
	t.Helper()
	body, err := json.Marshal(map[string]any{"operationName": operation, "query": query, "variables": variables})
	if err != nil {
		t.Fatal(err)
	}
	req, err := http.NewRequestWithContext(t.Context(), http.MethodPost, server.URL+"/graphql", bytes.NewReader(body))
	if err != nil {
		t.Fatal(err)
	}
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer token")
	resp, err := server.Client().Do(req)
	if err != nil {
		t.Fatal(err)
	}
	defer func() { _ = resp.Body.Close() }()
	var decoded map[string]any
	if err := json.NewDecoder(resp.Body).Decode(&decoded); err != nil {
		t.Fatalf("decode %s response: %v", operation, err)
	}
	return decoded
}

const createPeople = `mutation Create($data: [PersonCreateInput!]!) { createPeople(data: $data) { id name { firstName lastName } emails { primaryEmail additionalEmails } createdBy { source } } }`

const findMany = `query Find($filter: PersonFilterInput, $orderBy: [PersonOrderByInput], $lastCursor: String, $limit: Int) {
  people(filter: $filter, orderBy: $orderBy, first: $limit, after: $lastCursor) {
    edges { node { id name { firstName } deletedAt } cursor }
    pageInfo { hasNextPage endCursor }
    totalCount
  }
}`

func names(t *testing.T, response map[string]any) []string {
	t.Helper()
	data, ok := response["data"].(map[string]any)
	if !ok {
		t.Fatalf("response has no data: %v", response)
	}
	var got []string
	for _, edge := range data["people"].(map[string]any)["edges"].([]any) {
		node := edge.(map[string]any)["node"].(map[string]any)
		got = append(got, node["name"].(map[string]any)["firstName"].(string))
	}
	return got
}

func TestPeopleOperationsRoundTrip(t *testing.T) {
	t.Parallel()
	server := newServer(t)

	created := send(t, server, "Create", createPeople, map[string]any{"data": []any{
		map[string]any{"name": map[string]any{"firstName": "Ada", "lastName": "Lovelace"}, "emails": map[string]any{"primaryEmail": "ada@x.org"}},
		map[string]any{"name": map[string]any{"firstName": "Alan", "lastName": "Turing"}, "emails": map[string]any{"primaryEmail": "alan@x.org"}},
		map[string]any{"name": map[string]any{"firstName": "Grace", "lastName": "Hopper"}},
	}})
	people := created["data"].(map[string]any)["createPeople"].([]any)
	if len(people) != 3 {
		t.Fatalf("createPeople = %v, want 3 people", created)
	}
	want := map[string]any{
		"id":        people[0].(map[string]any)["id"],
		"name":      map[string]any{"firstName": "Ada", "lastName": "Lovelace"},
		"emails":    map[string]any{"primaryEmail": "ada@x.org", "additionalEmails": []any{}},
		"createdBy": map[string]any{"source": "MANUAL"},
	}
	if diff := cmp.Diff(want, people[0]); diff != "" {
		t.Errorf("created person (-want +got):\n%s", diff)
	}

	t.Run("filter, sort and page", func(t *testing.T) {
		filter := map[string]any{"or": []any{
			map[string]any{"name": map[string]any{"firstName": map[string]any{"startsWith": "al"}}},
			map[string]any{"name": map[string]any{"lastName": map[string]any{"ilike": "%OPPER"}}},
		}}
		order := []any{map[string]any{"name": map[string]any{"firstName": "DescNullsLast"}}}

		first := send(t, server, "Find", findMany, map[string]any{"filter": filter, "orderBy": order, "limit": 1})
		if diff := cmp.Diff([]string{"Grace"}, names(t, first)); diff != "" {
			t.Errorf("first page (-want +got):\n%s", diff)
		}
		pageInfo := first["data"].(map[string]any)["people"].(map[string]any)["pageInfo"].(map[string]any)
		second := send(t, server, "Find", findMany, map[string]any{"filter": filter, "orderBy": order, "limit": 5, "lastCursor": pageInfo["endCursor"]})
		if diff := cmp.Diff([]string{"Alan"}, names(t, second)); diff != "" {
			t.Errorf("second page (-want +got):\n%s", diff)
		}
		if pageInfo["hasNextPage"] != true {
			t.Errorf("hasNextPage = %v, want true", pageInfo["hasNextPage"])
		}
	})

	t.Run("a field outside the schema is a graphql error", func(t *testing.T) {
		response := send(t, server, "Find", findMany, map[string]any{"orderBy": []any{map[string]any{"nope": "AscNullsFirst"}}})
		if errs, _ := response["errors"].([]any); len(errs) != 1 {
			t.Errorf("response = %v, want one error", response)
		}
	})

	t.Run("delete, restore and destroy", func(t *testing.T) {
		id := people[2].(map[string]any)["id"]
		deleted := send(t, server, "Delete", `mutation Delete($id: UUID!) { deletePerson(id: $id) { id deletedAt } }`, map[string]any{"id": id})
		if deleted["data"].(map[string]any)["deletePerson"].(map[string]any)["deletedAt"] == nil {
			t.Errorf("deletePerson = %v, want deletedAt set", deleted)
		}
		if got := names(t, send(t, server, "Find", findMany, nil)); len(got) != 2 {
			t.Errorf("people after delete = %v, want 2", got)
		}
		onlyDeleted := map[string]any{"deletedAt": map[string]any{"is": "NOT_NULL"}}
		send(t, server, "Restore", `mutation Restore($filter: PersonFilterInput!) { restorePeople(filter: $filter) { id } }`, map[string]any{"filter": onlyDeleted})
		if got := names(t, send(t, server, "Find", findMany, nil)); len(got) != 3 {
			t.Errorf("people after restore = %v, want 3", got)
		}
		send(t, server, "Destroy", `mutation Destroy($id: UUID!) { destroyPerson(id: $id) { id } }`, map[string]any{"id": id})
		if got := names(t, send(t, server, "Find", findMany, nil)); len(got) != 2 {
			t.Errorf("people after destroy = %v, want 2", got)
		}
	})
}
