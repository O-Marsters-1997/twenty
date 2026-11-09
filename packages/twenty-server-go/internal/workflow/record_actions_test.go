package workflow_test

import (
	"context"
	"encoding/json"
	"errors"
	"strings"
	"testing"

	"github.com/google/go-cmp/cmp"

	"github.com/twentyhq/twenty/packages/twenty-server-go/internal/records"
	"github.com/twentyhq/twenty/packages/twenty-server-go/internal/workflow"
)

type fakeRecords struct {
	rows map[string]map[string]any
	err  error
}

func newFakeRecords() *fakeRecords { return &fakeRecords{rows: map[string]map[string]any{}} }

func (f *fakeRecords) Create(_ context.Context, _ string, data map[string]any) (any, error) {
	if f.err != nil {
		return nil, f.err
	}
	id, _ := data["id"].(string)
	f.rows[id] = data
	return data, nil
}

func (f *fakeRecords) Update(_ context.Context, _, id string, data map[string]any) (any, error) {
	if f.err != nil {
		return nil, f.err
	}
	row, ok := f.rows[id]
	if !ok {
		return nil, records.ErrNotFound
	}
	for key, value := range data {
		row[key] = value
	}
	return row, nil
}

func (f *fakeRecords) Delete(_ context.Context, _, id string) error {
	if f.err != nil {
		return f.err
	}
	if _, ok := f.rows[id]; !ok {
		return records.ErrNotFound
	}
	delete(f.rows, id)
	return nil
}

func (f *fakeRecords) Find(_ context.Context, _ string, filter records.Filter) ([]any, error) {
	if f.err != nil {
		return nil, f.err
	}
	var found []any
	for _, row := range f.rows {
		if filter.Field == nil || row[filter.Field.Field] == filter.Field.Value {
			found = append(found, row)
		}
	}
	return found, nil
}

func runRecordAction(t *testing.T, store workflow.Records, actionType workflow.ActionType, settings string) workflow.StepOutput {
	t.Helper()
	registry, err := workflow.NewRegistry(workflow.NewRecordActions(store)...)
	if err != nil {
		t.Fatalf("NewRegistry() error = %v", err)
	}
	action, err := registry.Lookup(actionType)
	if err != nil {
		t.Fatalf("Lookup(%s) error = %v", actionType, err)
	}
	out, err := action.Run(context.Background(), workflow.StepInput{Settings: json.RawMessage(settings)})
	if err != nil {
		t.Fatalf("Run() error = %v", err)
	}
	return out
}

func TestRecordActions(t *testing.T) {
	t.Run("create returns the record", func(t *testing.T) {
		out := runRecordAction(t, newFakeRecords(), workflow.ActionTypeCreateRecord,
			`{"objectName":"person","objectRecord":{"id":"p1","jobTitle":"CTO"}}`)
		want := map[string]any{"id": "p1", "jobTitle": "CTO"}
		if diff := cmp.Diff(want, out.Result); diff != "" {
			t.Errorf("Result (-want +got):\n%s", diff)
		}
	})

	t.Run("update changes the stored record", func(t *testing.T) {
		store := newFakeRecords()
		store.rows["p1"] = map[string]any{"id": "p1", "jobTitle": "CTO"}
		out := runRecordAction(t, store, workflow.ActionTypeUpdateRecord,
			`{"objectName":"person","objectRecordId":"p1","objectRecord":{"jobTitle":"CEO"}}`)
		want := map[string]any{"id": "p1", "jobTitle": "CEO"}
		if diff := cmp.Diff(want, out.Result); diff != "" {
			t.Errorf("Result (-want +got):\n%s", diff)
		}
	})

	t.Run("delete removes the record", func(t *testing.T) {
		store := newFakeRecords()
		store.rows["p1"] = map[string]any{"id": "p1"}
		out := runRecordAction(t, store, workflow.ActionTypeDeleteRecord, `{"objectName":"person","objectRecordId":"p1"}`)
		if out.Error != "" || len(store.rows) != 0 {
			t.Errorf("Error = %q, rows = %v, want no error and no rows", out.Error, store.rows)
		}
	})

	t.Run("upsert creates then updates", func(t *testing.T) {
		store := newFakeRecords()
		runRecordAction(t, store, workflow.ActionTypeUpsertRecord, `{"objectName":"person","objectRecord":{"id":"p1","jobTitle":"CTO"}}`)
		runRecordAction(t, store, workflow.ActionTypeUpsertRecord, `{"objectName":"person","objectRecord":{"id":"p1","jobTitle":"CEO"}}`)
		want := map[string]map[string]any{"p1": {"id": "p1", "jobTitle": "CEO"}}
		if diff := cmp.Diff(want, store.rows); diff != "" {
			t.Errorf("rows (-want +got):\n%s", diff)
		}
	})

	t.Run("find returns the matches", func(t *testing.T) {
		store := newFakeRecords()
		store.rows["p1"] = map[string]any{"id": "p1", "jobTitle": "CTO"}
		store.rows["p2"] = map[string]any{"id": "p2", "jobTitle": "CEO"}
		out := runRecordAction(t, store, workflow.ActionTypeFindRecords,
			`{"objectName":"person","filter":{"Field":{"Field":"jobTitle","Operand":"eq","Value":"CEO"}}}`)
		want := []any{map[string]any{"id": "p2", "jobTitle": "CEO"}}
		if diff := cmp.Diff(want, out.Result); diff != "" {
			t.Errorf("Result (-want +got):\n%s", diff)
		}
	})
}

func TestRecordActions_Errors(t *testing.T) {
	dbDown := errors.New("db down")
	tests := []struct {
		name       string
		actionType workflow.ActionType
		settings   string
		storeErr   error
		want       string
	}{
		{"create write fails", workflow.ActionTypeCreateRecord, `{"objectName":"person","objectRecord":{}}`, dbDown, "db down"},
		{"update missing record", workflow.ActionTypeUpdateRecord, `{"objectName":"person","objectRecordId":"x"}`, nil, records.ErrNotFound.Error()},
		{"delete missing record", workflow.ActionTypeDeleteRecord, `{"objectName":"person","objectRecordId":"x"}`, nil, records.ErrNotFound.Error()},
		{"upsert lookup fails", workflow.ActionTypeUpsertRecord, `{"objectName":"person","objectRecord":{"id":"p1"}}`, dbDown, "db down"},
		{"find fails", workflow.ActionTypeFindRecords, `{"objectName":"person"}`, dbDown, "db down"},
		{"bad settings", workflow.ActionTypeCreateRecord, `{`, nil, "decode settings"},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			store := newFakeRecords()
			store.err = tt.storeErr
			out := runRecordAction(t, store, tt.actionType, tt.settings)
			if !strings.Contains(out.Error, tt.want) {
				t.Errorf("Error = %q, want it to contain %q", out.Error, tt.want)
			}
		})
	}
}
