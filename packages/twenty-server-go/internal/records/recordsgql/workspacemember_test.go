package recordsgql_test

import (
	"testing"

	"github.com/google/go-cmp/cmp"
	"github.com/google/uuid"
)

const createWorkspaceMembers = `mutation Create($data: [WorkspaceMemberCreateInput!]!) {
  createWorkspaceMembers(data: $data) { id name { firstName } dateFormat locale calendarStartDay createdBy { source } }
}`

const findWorkspaceMembers = `query Find($filter: WorkspaceMemberFilterInput, $orderBy: [WorkspaceMemberOrderByInput]) {
  workspaceMembers(filter: $filter, orderBy: $orderBy) { edges { node { name { firstName } dateFormat } } totalCount }
}`

const aggregateWorkspaceMembers = `query AggregateWorkspaceMembers($filter: WorkspaceMemberFilterInput) {
  workspaceMembers(filter: $filter) { totalCount countNotEmptyLocale countUniqueValuesDateFormat }
}`

func TestWorkspaceMemberOperations(t *testing.T) {
	t.Parallel()
	server := newServer(t)
	member := func(first, dateFormat string) map[string]any {
		return map[string]any{"name": map[string]any{"firstName": first}, "userId": uuid.NewString(), "dateFormat": dateFormat}
	}
	created := send(t, server, "Create", createWorkspaceMembers, map[string]any{"data": []any{member("Ada", "DAY_FIRST"), member("Bea", "MONTH_FIRST"), member("Cy", "DAY_FIRST")}})
	members, ok := created["data"].(map[string]any)["createWorkspaceMembers"].([]any)
	if !ok || len(members) != 3 {
		t.Fatalf("createWorkspaceMembers = %v, want 3 members", created)
	}
	want := map[string]any{
		"id": members[0].(map[string]any)["id"], "name": map[string]any{"firstName": "Ada"}, "dateFormat": "DAY_FIRST",
		"locale": "en", "calendarStartDay": float64(7), "createdBy": map[string]any{"source": "MANUAL"},
	}
	if diff := cmp.Diff(want, members[0]); diff != "" {
		t.Errorf("created member (-want +got):\n%s", diff)
	}

	t.Run("filters and sorts on a select field", func(t *testing.T) {
		response := send(t, server, "Find", findWorkspaceMembers, map[string]any{
			"filter":  map[string]any{"dateFormat": map[string]any{"in": []any{"DAY_FIRST"}}},
			"orderBy": []any{map[string]any{"name": map[string]any{"firstName": "DescNullsLast"}}},
		})
		connection := response["data"].(map[string]any)["workspaceMembers"].(map[string]any)
		var got []any
		for _, edge := range connection["edges"].([]any) {
			got = append(got, edge.(map[string]any)["node"].(map[string]any)["name"].(map[string]any)["firstName"])
		}
		if diff := cmp.Diff([]any{"Cy", "Ada"}, got); diff != "" || connection["totalCount"] != float64(2) {
			t.Errorf("members = %v total %v (-want +got):\n%s", got, connection["totalCount"], diff)
		}
	})

	t.Run("aggregates ride on the connection", func(t *testing.T) {
		response := send(t, server, "AggregateWorkspaceMembers", aggregateWorkspaceMembers, nil)
		got := response["data"].(map[string]any)["workspaceMembers"]
		want := map[string]any{"totalCount": float64(3), "countNotEmptyLocale": float64(3), "countUniqueValuesDateFormat": float64(2)}
		if diff := cmp.Diff(want, got); diff != "" {
			t.Errorf("AggregateWorkspaceMembers (-want +got):\n%s", diff)
		}
	})

	t.Run("update, delete, restore and destroy", func(t *testing.T) {
		id := members[1].(map[string]any)["id"]
		updated := send(t, server, "Update", `mutation Update($id: UUID!) { updateWorkspaceMember(id: $id, data: {locale: "fr", timeFormat: HOUR_24}) { locale timeFormat dateFormat } }`, map[string]any{"id": id})
		if diff := cmp.Diff(map[string]any{"locale": "fr", "timeFormat": "HOUR_24", "dateFormat": "MONTH_FIRST"}, updated["data"].(map[string]any)["updateWorkspaceMember"]); diff != "" {
			t.Errorf("updateWorkspaceMember (-want +got):\n%s", diff)
		}
		deleted := send(t, server, "Delete", `mutation Delete($id: UUID!) { deleteWorkspaceMember(id: $id) { deletedAt } }`, map[string]any{"id": id})
		if deleted["data"].(map[string]any)["deleteWorkspaceMember"].(map[string]any)["deletedAt"] == nil {
			t.Errorf("deleteWorkspaceMember = %v, want deletedAt set", deleted)
		}
		restored := send(t, server, "Restore", `mutation Restore($filter: WorkspaceMemberFilterInput!) { restoreWorkspaceMembers(filter: $filter) { id } }`,
			map[string]any{"filter": map[string]any{"deletedAt": map[string]any{"is": "NOT_NULL"}}})
		if got := len(restored["data"].(map[string]any)["restoreWorkspaceMembers"].([]any)); got != 1 {
			t.Errorf("restoreWorkspaceMembers restored %d, want 1", got)
		}
		destroyed := send(t, server, "Destroy", `mutation Destroy($id: UUID!) { destroyWorkspaceMember(id: $id) { id } }`, map[string]any{"id": id})
		if destroyed["data"].(map[string]any)["destroyWorkspaceMember"].(map[string]any)["id"] != id {
			t.Errorf("destroyWorkspaceMember = %v, want id %v", destroyed, id)
		}
	})
}
