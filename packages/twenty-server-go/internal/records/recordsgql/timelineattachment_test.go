package recordsgql_test

import (
	"testing"

	"github.com/google/go-cmp/cmp"
)

const createAttachments = `mutation Create($data: [AttachmentCreateInput!]!) { createAttachments(data: $data) { id name fileCategory file createdBy { source } } }`

const findAttachments = `query Find($filter: AttachmentFilterInput, $orderBy: [AttachmentOrderByInput]) {
  attachments(filter: $filter, orderBy: $orderBy) { totalCount edges { node { name fileCategory } } }
}`

const aggregateAttachments = `query AggregateAttachments { attachments { totalCount countUniqueValuesFileCategory countEmptyId } }`

const attachmentsGroupByRecords = `query AttachmentsGroupByRecords($groupBy: [AttachmentGroupByInput!]!) {
  attachmentsGroupBy(groupBy: $groupBy) { groupByDimensionValues totalCount edges { node { name } } }
}`

const createTimelineActivity = `mutation Create($data: TimelineActivityCreateInput) { createTimelineActivity(data: $data) { id linkedRecordCachedName properties happensAt } }`

const aggregateTimelineActivities = `query AggregateTimelineActivities { timelineActivities { totalCount countNotEmptyLinkedRecordId minHappensAt } }`

func data(t *testing.T, response map[string]any) map[string]any {
	t.Helper()
	payload, ok := response["data"].(map[string]any)
	if !ok {
		t.Fatalf("response = %v, want data", response)
	}
	return payload
}

func TestAttachmentOperations(t *testing.T) {
	t.Parallel()
	server := newServer(t)
	item := func(name, category string) map[string]any {
		return map[string]any{"name": name, "fileCategory": category, "file": []any{map[string]any{"fileId": "f1"}}}
	}
	created := data(t, send(t, server, "Create", createAttachments, map[string]any{"data": []any{item("a.png", "IMAGE"), item("b.png", "IMAGE"), item("c.mp4", "VIDEO")}}))
	first := created["createAttachments"].([]any)[0].(map[string]any)
	wantFirst := map[string]any{"id": first["id"], "name": "a.png", "fileCategory": "IMAGE", "file": []any{map[string]any{"fileId": "f1"}}, "createdBy": map[string]any{"source": "MANUAL"}}
	if diff := cmp.Diff(wantFirst, first); diff != "" {
		t.Errorf("createAttachments[0] (-want +got):\n%s", diff)
	}

	t.Run("filters and sorts", func(t *testing.T) {
		response := data(t, send(t, server, "Find", findAttachments, map[string]any{
			"filter":  map[string]any{"fileCategory": map[string]any{"eq": "IMAGE"}},
			"orderBy": []any{map[string]any{"name": "DescNullsLast"}},
		}))
		want := map[string]any{"totalCount": float64(2), "edges": []any{
			map[string]any{"node": map[string]any{"name": "b.png", "fileCategory": "IMAGE"}},
			map[string]any{"node": map[string]any{"name": "a.png", "fileCategory": "IMAGE"}},
		}}
		if diff := cmp.Diff(want, response["attachments"]); diff != "" {
			t.Errorf("attachments (-want +got):\n%s", diff)
		}
	})

	t.Run("aggregates include id-suffixed fields", func(t *testing.T) {
		got := data(t, send(t, server, "AggregateAttachments", aggregateAttachments, nil))["attachments"]
		want := map[string]any{"totalCount": float64(3), "countUniqueValuesFileCategory": float64(2), "countEmptyId": float64(0)}
		if diff := cmp.Diff(want, got); diff != "" {
			t.Errorf("AggregateAttachments (-want +got):\n%s", diff)
		}
	})

	t.Run("groups with records", func(t *testing.T) {
		groups := data(t, send(t, server, "AttachmentsGroupByRecords", attachmentsGroupByRecords, map[string]any{"groupBy": []any{map[string]any{"fileCategory": true}}}))["attachmentsGroupBy"].([]any)
		sizes := map[any]int{}
		for _, group := range groups {
			entry := group.(map[string]any)
			sizes[entry["groupByDimensionValues"].([]any)[0]] = len(entry["edges"].([]any))
		}
		if diff := cmp.Diff(map[any]int{"IMAGE": 2, "VIDEO": 1}, sizes); diff != "" {
			t.Errorf("records per group (-want +got):\n%s", diff)
		}
	})
}

func TestTimelineActivityOperations(t *testing.T) {
	t.Parallel()
	server := newServer(t)
	response := data(t, send(t, server, "Create", createTimelineActivity, map[string]any{"data": map[string]any{
		"linkedRecordCachedName": "Ada", "happensAt": "2026-03-01T09:00:00Z", "properties": map[string]any{"diff": map[string]any{}},
	}}))
	activity := response["createTimelineActivity"].(map[string]any)
	want := map[string]any{"id": activity["id"], "linkedRecordCachedName": "Ada", "properties": map[string]any{"diff": map[string]any{}}, "happensAt": "2026-03-01T09:00:00Z"}
	if diff := cmp.Diff(want, activity); diff != "" {
		t.Errorf("createTimelineActivity (-want +got):\n%s", diff)
	}

	got := data(t, send(t, server, "AggregateTimelineActivities", aggregateTimelineActivities, nil))["timelineActivities"]
	wantAggregate := map[string]any{"totalCount": float64(1), "countNotEmptyLinkedRecordId": float64(0), "minHappensAt": "2026-03-01T09:00:00Z"}
	if diff := cmp.Diff(wantAggregate, got); diff != "" {
		t.Errorf("AggregateTimelineActivities (-want +got):\n%s", diff)
	}
}
