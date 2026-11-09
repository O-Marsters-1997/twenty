package workflowgql

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"net/http"
	"slices"

	"github.com/riverqueue/river"

	"github.com/twentyhq/twenty/packages/twenty-server-go/internal/auth"
	"github.com/twentyhq/twenty/packages/twenty-server-go/internal/workflow"
	"github.com/twentyhq/twenty/packages/twenty-server-go/internal/workflow/store"
)

const (
	maxCurrentVersionIDs = 500
	defaultPageSize      = 60
	defaultOrderBy       = "UPDATED_AT"
	defaultDirection     = "DESC"
)

type Enqueuer interface {
	Enqueue(ctx context.Context, args river.JobArgs) error
}

type Resolver struct {
	Store      *store.Store
	Queue      Enqueuer
	HTTPClient *http.Client
}

func reader(ctx context.Context) store.Reader {
	principal, _ := auth.PrincipalFrom(ctx)
	return store.Reader{UserWorkspaceID: principal.UserWorkspaceID}
}

func (r *mutationResolver) StopWorkflowRun(ctx context.Context, workflowRunID string) (*store.Run, error) {
	run, err := r.Store.Run(ctx, workflowRunID)
	if err != nil {
		return nil, err
	}
	if !slices.Contains([]string{store.StatusNotStarted, store.StatusEnqueued, store.StatusRunning}, run.Status) {
		return &run, nil
	}
	stopped, err := r.Store.Transition(ctx, workflowRunID, store.StatusStopped, "")
	if errors.Is(err, store.ErrInvalidTransition) {
		stopped, err = r.Store.Run(ctx, workflowRunID)
	}
	if err != nil {
		return nil, err
	}
	return &stopped, nil
}

func (r *mutationResolver) RetryWorkflowRun(ctx context.Context, workflowRunID string) (*store.Run, error) {
	previous, current, retried, err := r.Store.Retry(ctx, workflowRunID)
	if err != nil {
		return nil, err
	}
	if !retried {
		return &current, nil
	}
	if err := r.Queue.Enqueue(ctx, workflow.RunWorkflowArgs{RunID: workflowRunID}); err != nil {
		if revertErr := r.Store.Revert(ctx, previous); revertErr != nil {
			err = errors.Join(err, revertErr)
		}
		return nil, fmt.Errorf("enqueue retry: %w", err)
	}
	return &current, nil
}

func (r *mutationResolver) SubmitFormStep(ctx context.Context, input map[string]any) (bool, error) {
	runID, _ := input["workflowRunId"].(string)
	stepID, _ := input["stepId"].(string)
	response, isObject := input["response"].(map[string]any)
	if !isObject {
		return false, invalidRequest("a form response must be an object")
	}
	run, err := r.Store.Run(ctx, runID)
	if err != nil {
		return false, err
	}
	steps, err := r.runSteps(ctx, run)
	if err != nil {
		return false, err
	}
	if err := validateFormResponse(steps, run.State, stepID, response); err != nil {
		return false, err
	}
	payload, err := json.Marshal(response)
	if err != nil {
		return false, fmt.Errorf("encode form response: %w", err)
	}
	claimed, err := r.Store.ClaimPendingStep(ctx, runID, stepID, payload)
	if err != nil {
		return false, err
	}
	if !claimed {
		return false, invalidRequest("form step is no longer waiting for an answer")
	}
	if err := r.Queue.Enqueue(ctx, workflow.ResumeStepArgs{RunID: runID, StepID: stepID, Input: payload}); err != nil {
		_, failErr := r.Store.Transition(ctx, runID, store.StatusFailed, "The run could not resume after its form was submitted")
		return false, fmt.Errorf("enqueue resume: %w", errors.Join(err, failErr))
	}
	return true, nil
}

func (r *mutationResolver) runSteps(ctx context.Context, run store.Run) ([]map[string]any, error) {
	var state struct {
		Flow struct {
			Steps []map[string]any `json:"steps"`
		} `json:"flow"`
	}
	if len(run.State) > 0 {
		if err := json.Unmarshal(run.State, &state); err != nil {
			return nil, fmt.Errorf("decode run state: %w", err)
		}
	}
	if state.Flow.Steps != nil || run.VersionID == "" {
		return state.Flow.Steps, nil
	}
	version, err := r.Store.Version(ctx, run.VersionID)
	if err != nil {
		return nil, err
	}
	var steps []map[string]any
	if len(version.Steps) > 0 {
		if err := json.Unmarshal(version.Steps, &steps); err != nil {
			return nil, fmt.Errorf("decode version steps: %w", err)
		}
	}
	return steps, nil
}

func (r *mutationResolver) UpdateWorkflowRunStep(ctx context.Context, input map[string]any) (*WorkflowAction, error) {
	runID, _ := input["workflowRunId"].(string)
	raw, err := json.Marshal(input["step"])
	if err != nil {
		return nil, fmt.Errorf("encode step: %w", err)
	}
	var step WorkflowAction
	if err := json.Unmarshal(raw, &step); err != nil || step.ID == "" {
		return nil, invalidRequest("step is not a workflow action")
	}
	if err := r.Store.ReplaceRunStep(ctx, runID, step.ID, raw); err != nil {
		return nil, err
	}
	return &step, nil
}

func (r *mutationResolver) TestHTTPRequest(ctx context.Context, input map[string]any) (*HTTPTestResult, error) {
	return testHTTPRequest(ctx, r.HTTPClient, input), nil
}

func (r *queryResolver) CoreWorkflows(ctx context.Context, first *int, after *string, orderBy *string, orderByDirection *string, filter *store.CoreWorkflowFilter, includeSystem *bool) (*store.CoreWorkflowConnection, error) {
	page := store.CoreWorkflowPage{
		First:     defaultPageSize,
		After:     after,
		OrderBy:   defaultOrderBy,
		Direction: defaultDirection,
		Filter:    filter,
	}
	if first != nil {
		page.First = *first
	}
	if orderBy != nil {
		page.OrderBy = *orderBy
	}
	if orderByDirection != nil {
		page.Direction = *orderByDirection
	}
	page.IncludeSystem = includeSystem != nil && *includeSystem
	connection, err := r.Store.CoreWorkflows(ctx, reader(ctx), page)
	if err != nil {
		return nil, err
	}
	return &connection, nil
}

func (r *queryResolver) CoreWorkflowByID(ctx context.Context, coreWorkflowID string) (*store.CoreWorkflow, error) {
	return r.Store.CoreWorkflow(ctx, reader(ctx), coreWorkflowID)
}

func (r *queryResolver) CoreWorkflowsWithCurrentVersions(ctx context.Context, input map[string]any) ([]*store.CoreWorkflowWithVersions, error) {
	var ids []string
	switch typed := input["coreWorkflowIds"].(type) {
	case []string:
		ids = typed
	case []any:
		for _, raw := range typed {
			id, _ := raw.(string)
			ids = append(ids, id)
		}
	}
	if len(ids) == 0 || len(ids) > maxCurrentVersionIDs {
		return nil, invalidRequest("coreWorkflowIds must hold between 1 and %d ids", maxCurrentVersionIDs)
	}
	for _, id := range ids {
		if !uuidPattern.MatchString(id) {
			return nil, invalidRequest("coreWorkflowIds holds an invalid id")
		}
	}
	found, err := r.Store.CoreWorkflowsWithCurrentVersions(ctx, reader(ctx), ids)
	if err != nil {
		return nil, err
	}
	pointers := make([]*store.CoreWorkflowWithVersions, len(found))
	for i := range found {
		pointers[i] = &found[i]
	}
	return pointers, nil
}

func (r *queryResolver) CoreWorkflow(ctx context.Context, workspaceWorkflowID string) (*store.CoreWorkflow, error) {
	return r.Store.CoreWorkflowByWorkspaceWorkflowID(ctx, reader(ctx), workspaceWorkflowID)
}

func (r *queryResolver) CoreWorkflowVersions(ctx context.Context, workspaceWorkflowID string) ([]*store.CoreVersion, error) {
	return pointersTo(r.Store.CoreVersionsByWorkspaceWorkflowID(ctx, reader(ctx), workspaceWorkflowID))
}

func (r *queryResolver) CoreWorkflowVersion(ctx context.Context, workspaceWorkflowVersionID string) (*store.CoreVersion, error) {
	return r.Store.CoreVersionByWorkspaceVersionID(ctx, reader(ctx), workspaceWorkflowVersionID)
}

func (r *queryResolver) CoreWorkflowVersionsByCoreWorkflowID(ctx context.Context, coreWorkflowID string) ([]*store.CoreVersion, error) {
	return pointersTo(r.Store.CoreVersionsByWorkflowID(ctx, reader(ctx), coreWorkflowID))
}

func (r *queryResolver) CoreWorkflowVersionByID(ctx context.Context, coreWorkflowVersionID string) (*store.CoreVersion, error) {
	return r.Store.CoreVersion(ctx, reader(ctx), coreWorkflowVersionID)
}

func (r *queryResolver) WorkflowStepConnectedAccountHandle(ctx context.Context, connectedAccountID string) (*store.ConnectedAccount, error) {
	return r.Store.ConnectedAccount(ctx, connectedAccountID)
}

func (r *Resolver) Mutation() MutationResolver { return &mutationResolver{r} }

func (r *Resolver) Query() QueryResolver { return &queryResolver{r} }

type (
	mutationResolver struct{ *Resolver }
	queryResolver    struct{ *Resolver }
)

func pointersTo(versions []store.CoreVersion, err error) ([]*store.CoreVersion, error) {
	if err != nil {
		return nil, err
	}
	pointers := make([]*store.CoreVersion, len(versions))
	for i := range versions {
		pointers[i] = &versions[i]
	}
	return pointers, nil
}
