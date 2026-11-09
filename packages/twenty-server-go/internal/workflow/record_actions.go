package workflow

import (
	"context"
	"encoding/json"
	"fmt"

	"github.com/twentyhq/twenty/packages/twenty-server-go/internal/records"
)

// Records is the generic record access the record actions need.
type Records interface {
	Create(ctx context.Context, object string, data map[string]any) (any, error)
	Update(ctx context.Context, object, id string, data map[string]any) (any, error)
	Delete(ctx context.Context, object, id string) error
	Find(ctx context.Context, object string, filter records.Filter) ([]any, error)
}

type recordSettings struct {
	ObjectName     string         `json:"objectName"`
	ObjectRecord   map[string]any `json:"objectRecord"`
	ObjectRecordID string         `json:"objectRecordId"`
	Filter         records.Filter `json:"filter"`
}

type recordAction struct {
	actionType ActionType
	run        func(ctx context.Context, settings recordSettings) (any, error)
}

// NewRecordActions returns the CREATE_RECORD, UPDATE_RECORD, DELETE_RECORD,
// UPSERT_RECORD and FIND_RECORDS actions backed by store.
func NewRecordActions(store Records) []Action {
	return []Action{
		&recordAction{actionType: ActionTypeCreateRecord, run: func(ctx context.Context, s recordSettings) (any, error) {
			return store.Create(ctx, s.ObjectName, s.ObjectRecord)
		}},
		&recordAction{actionType: ActionTypeUpdateRecord, run: func(ctx context.Context, s recordSettings) (any, error) {
			return store.Update(ctx, s.ObjectName, s.ObjectRecordID, s.ObjectRecord)
		}},
		&recordAction{actionType: ActionTypeDeleteRecord, run: func(ctx context.Context, s recordSettings) (any, error) {
			return nil, store.Delete(ctx, s.ObjectName, s.ObjectRecordID)
		}},
		&recordAction{actionType: ActionTypeUpsertRecord, run: func(ctx context.Context, s recordSettings) (any, error) {
			return upsertRecord(ctx, store, s)
		}},
		&recordAction{actionType: ActionTypeFindRecords, run: func(ctx context.Context, s recordSettings) (any, error) {
			return store.Find(ctx, s.ObjectName, s.Filter)
		}},
	}
}

func upsertRecord(ctx context.Context, store Records, s recordSettings) (any, error) {
	id, _ := s.ObjectRecord["id"].(string)
	if id == "" {
		return store.Create(ctx, s.ObjectName, s.ObjectRecord)
	}
	idFilter := records.Filter{Field: &records.FieldFilter{Field: "id", Operand: "eq", Value: id}}
	existing, err := store.Find(ctx, s.ObjectName, idFilter)
	if err != nil {
		return nil, fmt.Errorf("find record to upsert: %w", err)
	}
	if len(existing) == 0 {
		return store.Create(ctx, s.ObjectName, s.ObjectRecord)
	}
	return store.Update(ctx, s.ObjectName, id, s.ObjectRecord)
}

func (a *recordAction) Type() ActionType { return a.actionType }

func (a *recordAction) Run(ctx context.Context, input StepInput) (StepOutput, error) {
	var settings recordSettings
	if err := json.Unmarshal(input.Settings, &settings); err != nil {
		return StepOutput{Error: fmt.Sprintf("decode settings: %v", err)}, nil
	}
	result, err := a.run(ctx, settings)
	if err != nil {
		return StepOutput{Error: err.Error()}, nil
	}
	return StepOutput{Result: result}, nil
}
