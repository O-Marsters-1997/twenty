package recordsgql_test

import (
	"testing"

	"github.com/google/go-cmp/cmp"
)

const aggregatePeople = `query AggregatePeople($filter: PersonFilterInput) {
  people(filter: $filter) { totalCount countEmptyJobTitle percentageNotEmptyJobTitle countUniqueValuesJobTitle minCreatedAt }
}`

const groupByJobTitle = `query PeopleGroupByAggregates($groupBy: [PersonGroupByInput!]!, $filter: PersonFilterInput, $orderBy: [PersonOrderByWithGroupByInput!], $limit: Int) {
  peopleGroupBy(groupBy: $groupBy, filter: $filter, orderBy: $orderBy, limit: $limit) { groupByDimensionValues totalCount countNotEmptyName }
}`

const groupByRecords = `query PeopleGroupByRecords($groupBy: [PersonGroupByInput!]!) {
  peopleGroupBy(groupBy: $groupBy) { groupByDimensionValues edges { node { name { firstName } } } pageInfo { hasNextPage } }
}`

func TestAggregateAndGroupByOperations(t *testing.T) {
	t.Parallel()
	server := newServer(t)
	person := func(first, jobTitle string) map[string]any {
		return map[string]any{"name": map[string]any{"firstName": first}, "jobTitle": jobTitle}
	}
	send(t, server, "Create", createPeople, map[string]any{"data": []any{
		person("Ada", "Engineer"), person("Bea", "Engineer"), person("Cy", "Designer"), person("Di", ""),
	}})

	t.Run("aggregates ride on the connection", func(t *testing.T) {
		response := send(t, server, "AggregatePeople", aggregatePeople, nil)
		people := response["data"].(map[string]any)["people"].(map[string]any)
		want := map[string]any{
			"totalCount": float64(4), "countEmptyJobTitle": float64(1), "percentageNotEmptyJobTitle": 0.75,
			"countUniqueValuesJobTitle": float64(2), "minCreatedAt": people["minCreatedAt"],
		}
		if diff := cmp.Diff(want, people); diff != "" {
			t.Errorf("AggregatePeople (-want +got):\n%s", diff)
		}
		if people["minCreatedAt"] == nil {
			t.Error("minCreatedAt = nil, want a timestamp")
		}
	})

	t.Run("groups with dimension values and aggregates", func(t *testing.T) {
		response := send(t, server, "PeopleGroupByAggregates", groupByJobTitle, map[string]any{
			"groupBy": []any{map[string]any{"jobTitle": true}},
			"orderBy": []any{map[string]any{"jobTitle": "DescNullsLast"}},
			"limit":   2,
		})
		data, ok := response["data"].(map[string]any)
		if !ok {
			t.Fatalf("response = %v", response)
		}
		got := data["peopleGroupBy"]
		want := []any{
			map[string]any{"groupByDimensionValues": []any{"Engineer"}, "totalCount": float64(2), "countNotEmptyName": float64(2)},
			map[string]any{"groupByDimensionValues": []any{"Designer"}, "totalCount": float64(1), "countNotEmptyName": float64(1)},
		}
		if diff := cmp.Diff(want, got); diff != "" {
			t.Errorf("PeopleGroupByAggregates (-want +got):\n%s", diff)
		}
	})

	t.Run("pages records per group when edges are selected", func(t *testing.T) {
		response := send(t, server, "PeopleGroupByRecords", groupByRecords, map[string]any{"groupBy": []any{map[string]any{"jobTitle": true}}})
		groups := response["data"].(map[string]any)["peopleGroupBy"].([]any)
		sizes := map[any]int{}
		for _, group := range groups {
			item := group.(map[string]any)
			sizes[item["groupByDimensionValues"].([]any)[0]] = len(item["edges"].([]any))
		}
		if diff := cmp.Diff(map[any]int{"Engineer": 2, "Designer": 1, "": 1}, sizes); diff != "" {
			t.Errorf("records per group (-want +got):\n%s", diff)
		}
	})

	t.Run("a group by outside the schema is a graphql error", func(t *testing.T) {
		response := send(t, server, "PeopleGroupByAggregates", groupByJobTitle, map[string]any{"groupBy": []any{map[string]any{"nope": true}}})
		if errs, _ := response["errors"].([]any); len(errs) != 1 {
			t.Errorf("response = %v, want one error", response)
		}
	})
}
