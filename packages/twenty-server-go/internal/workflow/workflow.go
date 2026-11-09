// Package workflow defines the action contract and registry for workflow runs.
package workflow

import (
	"context"
	"encoding/json"
)

// RunStatus is the lifecycle state of a workflow run.
type RunStatus string

const (
	RunStatusNotStarted RunStatus = "NOT_STARTED"
	RunStatusRunning    RunStatus = "RUNNING"
	RunStatusCompleted  RunStatus = "COMPLETED"
	RunStatusFailed     RunStatus = "FAILED"
	RunStatusEnqueued   RunStatus = "ENQUEUED"
	RunStatusStopping   RunStatus = "STOPPING"
	RunStatusStopped    RunStatus = "STOPPED"
)

// ActionType names a kind of workflow step. CODE is intentionally absent.
type ActionType string

const (
	ActionTypeClassify     ActionType = "CLASSIFY"
	ActionTypeAIAgent      ActionType = "AI_AGENT"
	ActionTypeSendEmail    ActionType = "SEND_EMAIL"
	ActionTypeDraftEmail   ActionType = "DRAFT_EMAIL"
	ActionTypeCreateRecord ActionType = "CREATE_RECORD"
	ActionTypeUpdateRecord ActionType = "UPDATE_RECORD"
	ActionTypeDeleteRecord ActionType = "DELETE_RECORD"
	ActionTypeUpsertRecord ActionType = "UPSERT_RECORD"
	ActionTypeFindRecords  ActionType = "FIND_RECORDS"
	ActionTypeForm         ActionType = "FORM"
	ActionTypeFilter       ActionType = "FILTER"
	ActionTypeIfElse       ActionType = "IF_ELSE"
	ActionTypeIterator     ActionType = "ITERATOR"
	ActionTypeDelay        ActionType = "DELAY"
	ActionTypeHTTPRequest  ActionType = "HTTP_REQUEST"
	ActionTypeEmpty        ActionType = "EMPTY"
)

// StepInput is what a step receives when it runs.
type StepInput struct {
	RunID    string
	StepID   string
	Settings json.RawMessage
	Context  map[string]any // outputs of earlier steps, keyed by step id, plus the trigger payload
}

// StepOutput is what a step returns.
type StepOutput struct {
	Result  any
	Error   string
	Pending bool // FORM and DELAY park the run until resumed
}

// Action runs one kind of workflow step.
type Action interface {
	Type() ActionType
	Run(ctx context.Context, input StepInput) (StepOutput, error)
}
