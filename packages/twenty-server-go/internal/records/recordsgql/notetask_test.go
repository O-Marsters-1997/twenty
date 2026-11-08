package recordsgql_test

import (
	"testing"

	"github.com/google/go-cmp/cmp"
)

const createNotes = `mutation Create($data: [NoteCreateInput!]!) { createNotes(data: $data) { id title bodyV2 { markdown } createdBy { source } } }`

const findNotes = `query Find($filter: NoteFilterInput, $orderBy: [NoteOrderByInput], $lastCursor: String, $limit: Int) {
  notes(filter: $filter, orderBy: $orderBy, first: $limit, after: $lastCursor) {
    edges { node { title } cursor }
    pageInfo { hasNextPage endCursor }
    totalCount
  }
}`

func data(t *testing.T, response map[string]any) map[string]any {
	t.Helper()
	got, ok := response["data"].(map[string]any)
	if !ok {
		t.Fatalf("response has no data: %v", response)
	}
	return got
}

func TestNotesOperations(t *testing.T) {
	t.Parallel()
	server := newServer(t)
	note := func(title string) map[string]any {
		return map[string]any{"title": title, "bodyV2": map[string]any{"markdown": "# " + title}}
	}
	created := data(t, send(t, server, "Create", createNotes, map[string]any{"data": []any{note("alpha"), note("beta"), note("gamma")}}))["createNotes"].([]any)
	want := map[string]any{
		"id": created[0].(map[string]any)["id"], "title": "alpha", "bodyV2": map[string]any{"markdown": "# alpha"}, "createdBy": map[string]any{"source": "MANUAL"},
	}
	if diff := cmp.Diff(want, created[0]); diff != "" {
		t.Errorf("created note (-want +got):\n%s", diff)
	}

	t.Run("filter, sort and page", func(t *testing.T) {
		filter := map[string]any{"title": map[string]any{"neq": "beta"}}
		order := []any{map[string]any{"title": "DescNullsLast"}}
		titles := func(response map[string]any) []string {
			var got []string
			for _, edge := range data(t, response)["notes"].(map[string]any)["edges"].([]any) {
				got = append(got, edge.(map[string]any)["node"].(map[string]any)["title"].(string))
			}
			return got
		}
		first := send(t, server, "Find", findNotes, map[string]any{"filter": filter, "orderBy": order, "limit": 1})
		if diff := cmp.Diff([]string{"gamma"}, titles(first)); diff != "" {
			t.Errorf("first page (-want +got):\n%s", diff)
		}
		pageInfo := data(t, first)["notes"].(map[string]any)["pageInfo"].(map[string]any)
		second := send(t, server, "Find", findNotes, map[string]any{"filter": filter, "orderBy": order, "limit": 5, "lastCursor": pageInfo["endCursor"]})
		if diff := cmp.Diff([]string{"alpha"}, titles(second)); diff != "" {
			t.Errorf("second page (-want +got):\n%s", diff)
		}
	})

	t.Run("update, delete, restore and destroy", func(t *testing.T) {
		id := created[1].(map[string]any)["id"]
		updated := send(t, server, "Update", `mutation Update($id: UUID!, $data: NoteUpdateInput!) { updateNote(id: $id, data: $data) { title bodyV2 { markdown } } }`,
			map[string]any{"id": id, "data": map[string]any{"title": "beta 2"}})
		if diff := cmp.Diff(map[string]any{"title": "beta 2", "bodyV2": map[string]any{"markdown": "# beta"}}, data(t, updated)["updateNote"]); diff != "" {
			t.Errorf("updateNote (-want +got):\n%s", diff)
		}
		deleted := send(t, server, "Delete", `mutation Delete($id: UUID!) { deleteNote(id: $id) { deletedAt } }`, map[string]any{"id": id})
		if data(t, deleted)["deleteNote"].(map[string]any)["deletedAt"] == nil {
			t.Errorf("deleteNote = %v, want deletedAt set", deleted)
		}
		count := func() float64 {
			return data(t, send(t, server, "Find", findNotes, nil))["notes"].(map[string]any)["totalCount"].(float64)
		}
		if got := count(); got != 2 {
			t.Errorf("notes after delete = %v, want 2", got)
		}
		send(t, server, "Restore", `mutation Restore($filter: NoteFilterInput!) { restoreNotes(filter: $filter) { id } }`,
			map[string]any{"filter": map[string]any{"deletedAt": map[string]any{"is": "NOT_NULL"}}})
		if got := count(); got != 3 {
			t.Errorf("notes after restore = %v, want 3", got)
		}
		send(t, server, "Destroy", `mutation Destroy($filter: NoteFilterInput!) { destroyNotes(filter: $filter) { id } }`,
			map[string]any{"filter": map[string]any{"title": map[string]any{"startsWith": "al"}}})
		if got := count(); got != 2 {
			t.Errorf("notes after destroy = %v, want 2", got)
		}
	})

	t.Run("aggregates ride on the connection", func(t *testing.T) {
		response := send(t, server, "AggregateNotes", `query AggregateNotes($filter: NoteFilterInput) { notes(filter: $filter) { totalCount countNotEmptyTitle minCreatedAt } }`, nil)
		notes := data(t, response)["notes"].(map[string]any)
		if diff := cmp.Diff(map[string]any{"totalCount": float64(2), "countNotEmptyTitle": float64(2), "minCreatedAt": notes["minCreatedAt"]}, notes); diff != "" {
			t.Errorf("AggregateNotes (-want +got):\n%s", diff)
		}
		if notes["minCreatedAt"] == nil {
			t.Error("minCreatedAt = nil, want a timestamp")
		}
	})

	t.Run("a field outside the schema is a graphql error", func(t *testing.T) {
		response := send(t, server, "Find", findNotes, map[string]any{"orderBy": []any{map[string]any{"nope": "AscNullsFirst"}}})
		if errs, _ := response["errors"].([]any); len(errs) != 1 {
			t.Errorf("response = %v, want one error", response)
		}
	})
}

func TestTasksAndTargetsOperations(t *testing.T) {
	t.Parallel()
	server := newServer(t)
	made := data(t, send(t, server, "Create", `mutation Create($data: [TaskCreateInput!]!) { createTasks(data: $data) { id status dueAt } }`, map[string]any{"data": []any{
		map[string]any{"title": "a", "status": "TODO", "dueAt": "2026-12-01T09:30:00Z"},
		map[string]any{"title": "b", "status": "DONE"},
		map[string]any{"title": "c", "status": "DONE"},
	}}))["createTasks"].([]any)
	if diff := cmp.Diff(map[string]any{"id": made[0].(map[string]any)["id"], "status": "TODO", "dueAt": "2026-12-01T09:30:00Z"}, made[0]); diff != "" {
		t.Errorf("created task (-want +got):\n%s", diff)
	}

	t.Run("filter by status", func(t *testing.T) {
		for name, filter := range map[string]map[string]any{
			"eq": {"status": map[string]any{"eq": "DONE"}},
			"in": {"status": map[string]any{"in": []any{"DONE"}}},
		} {
			response := send(t, server, "Find", `query Find($filter: TaskFilterInput) { tasks(filter: $filter) { totalCount } }`, map[string]any{"filter": filter})
			if got := data(t, response)["tasks"].(map[string]any)["totalCount"]; got != float64(2) {
				t.Errorf("tasks with status %s = %v, want 2 (%v)", name, got, response)
			}
		}
	})

	t.Run("groups by status with records", func(t *testing.T) {
		response := send(t, server, "TasksGroupByRecords", `query TasksGroupByRecords($groupBy: [TaskGroupByInput!]!, $orderBy: [TaskOrderByWithGroupByInput!]) {
  tasksGroupBy(groupBy: $groupBy, orderBy: $orderBy) { groupByDimensionValues totalCount edges { node { title } } }
}`, map[string]any{"groupBy": []any{map[string]any{"status": true}}, "orderBy": []any{map[string]any{"status": "AscNullsLast"}}})
		groups := data(t, response)["tasksGroupBy"].([]any)
		sizes := map[any][2]float64{}
		for _, group := range groups {
			item := group.(map[string]any)
			sizes[item["groupByDimensionValues"].([]any)[0]] = [2]float64{item["totalCount"].(float64), float64(len(item["edges"].([]any)))}
		}
		if diff := cmp.Diff(map[any][2]float64{"TODO": {1, 1}, "DONE": {2, 2}}, sizes); diff != "" {
			t.Errorf("groups (-want +got):\n%s", diff)
		}
	})

	t.Run("targets link a task to a record", func(t *testing.T) {
		taskID := made[0].(map[string]any)["id"]
		created := send(t, server, "Create", `mutation Create($data: TaskTargetCreateInput) { createTaskTarget(data: $data) { id taskId targetPersonId } }`,
			map[string]any{"data": map[string]any{"taskId": taskID}})
		target := data(t, created)["createTaskTarget"].(map[string]any)
		if diff := cmp.Diff(map[string]any{"id": target["id"], "taskId": taskID, "targetPersonId": nil}, target); diff != "" {
			t.Errorf("createTaskTarget (-want +got):\n%s", diff)
		}
		found := send(t, server, "Find", `query Find($filter: TaskTargetFilterInput) { taskTargets(filter: $filter) { totalCount } }`,
			map[string]any{"filter": map[string]any{"taskId": map[string]any{"eq": taskID}}})
		if got := data(t, found)["taskTargets"].(map[string]any)["totalCount"]; got != float64(1) {
			t.Errorf("taskTargets for the task = %v, want 1", got)
		}
	})
}

func TestNoteTargetsOperations(t *testing.T) {
	t.Parallel()
	server := newServer(t)
	note := data(t, send(t, server, "Create", `mutation Create($data: NoteCreateInput) { createNote(data: $data) { id } }`, map[string]any{"data": map[string]any{"title": "n"}}))["createNote"].(map[string]any)
	created := send(t, server, "Create", `mutation Create($data: NoteTargetCreateInput) { createNoteTarget(data: $data) { id noteId } }`, map[string]any{"data": map[string]any{"noteId": note["id"]}})
	target := data(t, created)["createNoteTarget"].(map[string]any)
	if target["noteId"] != note["id"] {
		t.Errorf("createNoteTarget = %v, want noteId %v", target, note["id"])
	}
	grouped := send(t, server, "NoteTargetsGroupByAggregates", `query NoteTargetsGroupByAggregates($groupBy: [NoteTargetGroupByInput!]!) { noteTargetsGroupBy(groupBy: $groupBy) { groupByDimensionValues totalCount } }`,
		map[string]any{"groupBy": []any{map[string]any{"note": true}}})
	if diff := cmp.Diff([]any{map[string]any{"groupByDimensionValues": []any{note["id"]}, "totalCount": float64(1)}}, data(t, grouped)["noteTargetsGroupBy"]); diff != "" {
		t.Errorf("noteTargetsGroupBy (-want +got):\n%s", diff)
	}
}
