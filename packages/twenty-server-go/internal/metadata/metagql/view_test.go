package metagql_test

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
	"github.com/twentyhq/twenty/packages/twenty-server-go/internal/metadata/metagql"
	"github.com/twentyhq/twenty/packages/twenty-server-go/internal/metadata/store"
	"github.com/twentyhq/twenty/packages/twenty-server-go/internal/pgtest"
)

type verifier struct{}

func (verifier) Verify(context.Context, string) (auth.Principal, error) {
	return auth.Principal{UserID: "user-1"}, nil
}

type harness struct {
	server *httptest.Server
	pool   *pgxpool.Pool
}

func newHarness(t *testing.T) harness {
	t.Helper()
	pool, err := pgxpool.New(t.Context(), pgtest.New(t))
	if err != nil {
		t.Fatalf("connect: %v", err)
	}
	t.Cleanup(pool.Close)
	logger := slog.New(slog.NewTextHandler(io.Discard, nil))
	upstream, err := url.Parse("http://node.invalid")
	if err != nil {
		t.Fatal(err)
	}
	front := frontdoor.NewHandler(frontdoor.DefaultTable(), upstream, verifier{}, metagql.NewHandler(store.NewViews(pool), logger), logger)
	server := httptest.NewServer(front)
	t.Cleanup(server.Close)
	return harness{server: server, pool: pool}
}

func (h harness) send(t *testing.T, operation, query string, variables map[string]any) map[string]any {
	t.Helper()
	body, err := json.Marshal(map[string]any{"operationName": operation, "query": query, "variables": variables})
	if err != nil {
		t.Fatal(err)
	}
	req, err := http.NewRequestWithContext(t.Context(), http.MethodPost, h.server.URL+"/metadata", bytes.NewReader(body))
	if err != nil {
		t.Fatal(err)
	}
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer token")
	resp, err := h.server.Client().Do(req)
	if err != nil {
		t.Fatal(err)
	}
	defer func() { _ = resp.Body.Close() }()
	var decoded map[string]any
	if err := json.NewDecoder(resp.Body).Decode(&decoded); err != nil {
		t.Fatalf("decode %s response: %v", operation, err)
	}
	if errs, bad := decoded["errors"]; bad {
		t.Fatalf("%s returned errors: %v", operation, errs)
	}
	return decoded["data"].(map[string]any)
}

const viewFragment = `fragment ViewFragment on View {
  id name objectMetadataId type key icon position isCompact kanbanAggregateOperation
  kanbanAggregateOperationFieldMetadataId mainGroupByFieldMetadataId shouldHideEmptyGroups
  kanbanColumnWidth groupLoadLimit anyFieldFilterValue calendarFieldMetadataId
  calendarEndFieldMetadataId calendarLayout visibility createdByUserWorkspaceId applicationId isActive
  viewFields { id fieldMetadataId viewId isVisible position size aggregateOperation viewFieldGroupId isActive createdAt updatedAt deletedAt }
  viewFieldGroups { id name position isVisible viewId isActive createdAt updatedAt deletedAt viewFields { id } }
  viewFilters { id fieldMetadataId operand value viewFilterGroupId positionInViewFilterGroup subFieldName relationTargetFieldMetadataId viewId createdAt updatedAt deletedAt }
  viewFilterGroups { id parentViewFilterGroupId logicalOperator positionInViewFilterGroup viewId }
  viewSorts { id fieldMetadataId direction subFieldName viewId createdAt deletedAt updatedAt }
  viewGroups { id isVisible fieldValue position viewId createdAt updatedAt deletedAt }
}`

func TestViewOperationsRoundTrip(t *testing.T) {
	t.Parallel()
	h := newHarness(t)
	var objectID, fieldID string
	err := h.pool.QueryRow(t.Context(), `SELECT o.id::text, f.id::text FROM core."objectMetadata" o JOIN core."fieldMetadata" f ON f."objectMetadataId" = o.id WHERE o."nameSingular" = 'person' AND f.name = 'jobTitle'`).Scan(&objectID, &fieldID)
	if err != nil {
		t.Fatalf("find person metadata: %v", err)
	}

	seeded := h.send(t, "FindManyViews", `query FindManyViews($objectMetadataId: String, $viewTypes: [ViewType!]) { getViews(objectMetadataId: $objectMetadataId, viewTypes: $viewTypes) { ...ViewFragment } } `+viewFragment, map[string]any{"objectMetadataId": objectID})
	if len(seeded["getViews"].([]any)) == 0 {
		t.Fatalf("FindManyViews = %v, want the seeded person views", seeded)
	}

	created := h.send(t, "CreateView", `mutation CreateView($input: CreateViewInput!) { createView(input: $input) { ...ViewFragment } } `+viewFragment,
		map[string]any{"input": map[string]any{"name": "Engineers", "objectMetadataId": objectID, "icon": "IconList", "type": "TABLE", "position": 4.5}})["createView"].(map[string]any)
	viewID := created["id"].(string)
	if created["name"] != "Engineers" || created["position"] != 4.5 || created["visibility"] != "WORKSPACE" {
		t.Errorf("createView = %v, want Engineers at 4.5 in the workspace", created)
	}

	h.send(t, "CreateManyViewFields", `mutation CreateManyViewFields($inputs: [CreateViewFieldInput!]!) { createManyViewFields(inputs: $inputs) { id } }`,
		map[string]any{"inputs": []any{map[string]any{"viewId": viewID, "fieldMetadataId": fieldID, "position": 1, "size": 180, "isVisible": true}}})
	filter := h.send(t, "CreateViewFilter", `mutation CreateViewFilter($input: CreateViewFilterInput!) { createViewFilter(input: $input) { id operand value } }`,
		map[string]any{"input": map[string]any{"viewId": viewID, "fieldMetadataId": fieldID, "operand": "CONTAINS", "value": "eng"}})["createViewFilter"].(map[string]any)
	h.send(t, "UpdateViewFilter", `mutation UpdateViewFilter($input: UpdateViewFilterInput!) { updateViewFilter(input: $input) { id } }`,
		map[string]any{"input": map[string]any{"id": filter["id"], "update": map[string]any{"operand": "IS", "value": []any{"a", "b"}}}})
	h.send(t, "CreateViewSort", `mutation CreateViewSort($input: CreateViewSortInput!) { createViewSort(input: $input) { id } }`,
		map[string]any{"input": map[string]any{"viewId": viewID, "fieldMetadataId": fieldID, "direction": "DESC"}})
	h.send(t, "CreateManyViewGroups", `mutation CreateManyViewGroups($inputs: [CreateViewGroupInput!]!) { createManyViewGroups(inputs: $inputs) { id } }`,
		map[string]any{"inputs": []any{map[string]any{"viewId": viewID, "fieldValue": "Open"}}})
	h.send(t, "UpdateView", `mutation UpdateView($id: String!, $input: UpdateViewInput!) { updateView(id: $id, input: $input) { id } }`,
		map[string]any{"id": viewID, "input": map[string]any{"name": "Senior engineers", "isCompact": true}})

	listed := h.send(t, "FindAllViews", `query FindAllViews($viewTypes: [ViewType!]) { getViews(viewTypes: $viewTypes) { ...ViewFragment } } `+viewFragment, map[string]any{"viewTypes": []any{"TABLE"}})["getViews"].([]any)
	var got map[string]any
	for _, view := range listed {
		if view.(map[string]any)["id"] == viewID {
			got = view.(map[string]any)
		}
	}
	if got == nil {
		t.Fatalf("FindAllViews does not include view %s", viewID)
	}
	if got["name"] != "Senior engineers" || got["isCompact"] != true {
		t.Errorf("updated view = %v, want renamed and compact", got["name"])
	}
	filters := got["viewFilters"].([]any)
	if diff := cmp.Diff([]any{"a", "b"}, filters[0].(map[string]any)["value"]); diff != "" || filters[0].(map[string]any)["operand"] != "IS" {
		t.Errorf("filter = %v (-want +got):\n%s", filters[0], diff)
	}
	if len(got["viewFields"].([]any)) != 1 || len(got["viewSorts"].([]any)) != 1 || len(got["viewGroups"].([]any)) != 1 {
		t.Errorf("view = %v, want one field, sort and group", got)
	}
	createdAt := got["viewFields"].([]any)[0].(map[string]any)["createdAt"].(string)
	if len(createdAt) != len("2006-01-02T15:04:05.000Z") || createdAt[len(createdAt)-1] != 'Z' {
		t.Errorf("createdAt = %q, want millisecond ISO format", createdAt)
	}

	destroyed := h.send(t, "DestroyViewSort", `mutation DestroyViewSort($input: DestroyViewSortInput!) { destroyViewSort(input: $input) }`,
		map[string]any{"input": map[string]any{"id": got["viewSorts"].([]any)[0].(map[string]any)["id"]}})
	if destroyed["destroyViewSort"] != true {
		t.Errorf("destroyViewSort = %v, want true", destroyed)
	}
	if h.send(t, "DestroyView", `mutation DestroyView($id: String!) { destroyView(id: $id) }`, map[string]any{"id": viewID})["destroyView"] != true {
		t.Errorf("destroyView did not report success")
	}
}
