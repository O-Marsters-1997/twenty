package recordsgql_test

import (
	"testing"

	"github.com/google/go-cmp/cmp"
)

const aggregateDashboards = `query AggregateDashboards($filter: DashboardFilterInput) {
  dashboards(filter: $filter) { totalCount countNotEmptyTitle minCreatedAt }
}`

const dashboardsGroupBy = `query DashboardsGroupByAggregates($groupBy: [DashboardGroupByInput!]!, $filter: DashboardFilterInput, $orderBy: [DashboardOrderByWithGroupByInput!]) {
  dashboardsGroupBy(groupBy: $groupBy, filter: $filter, orderBy: $orderBy) { groupByDimensionValues totalCount edges { node { title } } }
}`

func TestDashboardOperations(t *testing.T) {
	t.Parallel()
	server := newServer(t)
	filter := map[string]any{"title": map[string]any{"like": "Q%"}}
	created := send(t, server, "Create", `mutation Create($data: [DashboardCreateInput!]!) { createDashboards(data: $data) { id title createdBy { source } } }`,
		map[string]any{"data": []any{map[string]any{"title": "Q1"}, map[string]any{"title": "Q1"}, map[string]any{"title": "Q2"}}})
	dashboards, ok := created["data"].(map[string]any)["createDashboards"].([]any)
	if !ok || len(dashboards) != 3 {
		t.Fatalf("createDashboards = %v, want 3 dashboards", created)
	}

	t.Run("aggregates ride on the connection", func(t *testing.T) {
		response := send(t, server, "AggregateDashboards", aggregateDashboards, map[string]any{"filter": filter})
		connection := response["data"].(map[string]any)["dashboards"].(map[string]any)
		want := map[string]any{"totalCount": float64(3), "countNotEmptyTitle": float64(3), "minCreatedAt": connection["minCreatedAt"]}
		if diff := cmp.Diff(want, connection); diff != "" || connection["minCreatedAt"] == nil {
			t.Errorf("AggregateDashboards (-want +got):\n%s", diff)
		}
	})

	t.Run("groups with dimension values and records", func(t *testing.T) {
		response := send(t, server, "DashboardsGroupByAggregates", dashboardsGroupBy, map[string]any{
			"groupBy": []any{map[string]any{"title": true}},
			"filter":  filter,
			"orderBy": []any{map[string]any{"title": "AscNullsLast"}},
		})
		groups, ok := response["data"].(map[string]any)["dashboardsGroupBy"].([]any)
		if !ok {
			t.Fatalf("response = %v", response)
		}
		type summary struct {
			Key     any
			Total   any
			Records int
		}
		var got []summary
		for _, group := range groups {
			item := group.(map[string]any)
			got = append(got, summary{item["groupByDimensionValues"].([]any)[0], item["totalCount"], len(item["edges"].([]any))})
		}
		if diff := cmp.Diff([]summary{{"Q1", float64(2), 2}, {"Q2", float64(1), 1}}, got); diff != "" {
			t.Errorf("groups (-want +got):\n%s", diff)
		}
	})

	t.Run("update, delete and destroy", func(t *testing.T) {
		id := dashboards[0].(map[string]any)["id"]
		updated := send(t, server, "Update", `mutation Update($id: UUID!) { updateDashboard(id: $id, data: {title: "Renamed"}) { title } }`, map[string]any{"id": id})
		if diff := cmp.Diff(map[string]any{"title": "Renamed"}, updated["data"].(map[string]any)["updateDashboard"]); diff != "" {
			t.Errorf("updateDashboard (-want +got):\n%s", diff)
		}
		deleted := send(t, server, "Delete", `mutation Delete($id: UUID!) { deleteDashboard(id: $id) { deletedAt } }`, map[string]any{"id": id})
		if deleted["data"].(map[string]any)["deleteDashboard"].(map[string]any)["deletedAt"] == nil {
			t.Errorf("deleteDashboard = %v, want deletedAt set", deleted)
		}
		destroyed := send(t, server, "Destroy", `mutation Destroy($id: UUID!) { destroyDashboard(id: $id) { id } }`, map[string]any{"id": id})
		if destroyed["data"].(map[string]any)["destroyDashboard"].(map[string]any)["id"] != id {
			t.Errorf("destroyDashboard = %v, want id %v", destroyed, id)
		}
	})

	t.Run("a field outside the schema is a graphql error", func(t *testing.T) {
		response := send(t, server, "Find", `query Find($orderBy: [DashboardOrderByInput]) { dashboards(orderBy: $orderBy) { totalCount } }`, map[string]any{"orderBy": []any{map[string]any{"nope": "AscNullsFirst"}}})
		if errs, _ := response["errors"].([]any); len(errs) != 1 {
			t.Errorf("response = %v, want one error", response)
		}
	})
}
