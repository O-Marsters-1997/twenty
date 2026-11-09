package workflowgql

import (
	"context"
	"encoding/json"
	"fmt"
	"time"

	"github.com/twentyhq/twenty/packages/twenty-server-go/internal/auth"
	"github.com/twentyhq/twenty/packages/twenty-server-go/internal/workflow"
	"github.com/twentyhq/twenty/packages/twenty-server-go/internal/workflow/store"
)

type Resolver struct {
	Authoring *workflow.Authoring
}

func userWorkspaceID(ctx context.Context) string {
	principal, _ := auth.PrincipalFrom(ctx)
	return principal.UserWorkspaceID
}

func optionalText(input map[string]any, key string) *string {
	switch value := input[key].(type) {
	case string:
		return &value
	case *string:
		return value
	}
	return nil
}

func text(input map[string]any, key string) string {
	if value := optionalText(input, key); value != nil {
		return *value
	}
	return ""
}

func object(input map[string]any, key string) map[string]any {
	value, _ := input[key].(map[string]any)
	return value
}

func list(input map[string]any, key string) []map[string]any {
	switch items := input[key].(type) {
	case []map[string]any:
		return items
	case []any:
		out := make([]map[string]any, 0, len(items))
		for _, item := range items {
			entry, _ := item.(map[string]any)
			out = append(out, entry)
		}
		return out
	}
	return nil
}

func ids(input map[string]any, key string) []string {
	switch items := input[key].(type) {
	case []string:
		return items
	case []any:
		out := make([]string, 0, len(items))
		for _, item := range items {
			if id, ok := item.(string); ok {
				out = append(out, id)
			}
		}
		return out
	}
	return nil
}

func formatTime(t time.Time) string {
	return t.UTC().Format("2006-01-02T15:04:05.000Z")
}

func toWorkflowDTO(w *store.CoreWorkflow) *WorkflowDTO {
	if w == nil {
		return nil
	}
	return &WorkflowDTO{
		ID: w.ID, Name: w.Name, Statuses: w.Statuses, LastPublishedVersionID: w.LastPublishedVersionID,
		LastPublishedCoreWorkflowVersionID: w.LastPublishedCoreVersionID, ApplicationID: w.ApplicationID,
		WorkspaceWorkflowID: w.WorkspaceWorkflowID, IsSystem: w.IsSystem, Visibility: w.Visibility,
		CanChangeVisibility: w.CanChangeVisibility, CreatedAt: formatTime(w.CreatedAt), UpdatedAt: formatTime(w.UpdatedAt),
	}
}

func rawToAny(raw json.RawMessage) any {
	var value any
	if len(raw) > 0 {
		_ = json.Unmarshal(raw, &value)
	}
	return value
}

func toVersionDTO(v store.CoreVersion) *VersionDTO {
	return &VersionDTO{
		ID: v.ID, CoreWorkflowID: &v.CoreWorkflowID, Label: v.Label, Status: v.Status,
		WorkspaceWorkflowVersionID: v.WorkspaceVersionID, WorkspaceWorkflowID: v.WorkspaceWorkflow,
		Trigger: rawToAny(v.Trigger), Steps: rawToAny(v.Steps), CreatedAt: formatTime(v.CreatedAt), UpdatedAt: formatTime(v.UpdatedAt),
	}
}

func toChangesDTO(changes workflow.StepChanges, err error) (*StepChangesDTO, error) {
	if err != nil {
		return nil, err
	}
	return &StepChangesDTO{TriggerDiff: changes.TriggerDiff, StepsDiff: changes.StepsDiff}, nil
}

func toActionDTO(step workflow.Step) (*ActionDTO, error) {
	raw, err := json.Marshal(step)
	if err != nil {
		return nil, fmt.Errorf("encode step: %w", err)
	}
	var decoded struct {
		ID          string       `json:"id"`
		Name        string       `json:"name"`
		Type        string       `json:"type"`
		Settings    any          `json:"settings"`
		Valid       bool         `json:"valid"`
		NextStepIDs []string     `json:"nextStepIds"`
		Position    *PositionDTO `json:"position"`
	}
	if err := json.Unmarshal(raw, &decoded); err != nil {
		return nil, fmt.Errorf("decode step: %w", err)
	}
	return &ActionDTO{ID: decoded.ID, Name: decoded.Name, Type: decoded.Type, Settings: decoded.Settings, Valid: decoded.Valid, NextStepIDs: decoded.NextStepIDs, Position: decoded.Position}, nil
}

func (r *mutationResolver) CreateCoreWorkflow(ctx context.Context, input map[string]any) (*WorkflowDTO, error) {
	created, err := r.Authoring.CreateWorkflow(ctx, userWorkspaceID(ctx), optionalText(input, "name"), text(input, "visibility"))
	if err != nil {
		return nil, err
	}
	return toWorkflowDTO(&created), nil
}

func (r *mutationResolver) UpdateCoreWorkflow(ctx context.Context, input map[string]any) (*WorkflowDTO, error) {
	updated, err := r.Authoring.UpdateWorkflow(ctx, userWorkspaceID(ctx), text(input, "coreWorkflowId"), text(input, "name"))
	return toWorkflowDTO(updated), err
}

func (r *mutationResolver) UpdateCoreWorkflowVisibility(ctx context.Context, input map[string]any) (*WorkflowDTO, error) {
	updated, err := r.Authoring.UpdateVisibility(ctx, userWorkspaceID(ctx), text(input, "coreWorkflowId"), text(input, "visibility"))
	return toWorkflowDTO(updated), err
}

func (r *mutationResolver) DuplicateCoreWorkflow(ctx context.Context, input map[string]any) (*WorkflowDTO, error) {
	duplicated, err := r.Authoring.DuplicateWorkflow(ctx, userWorkspaceID(ctx), text(input, "coreWorkflowIdToDuplicate"), text(input, "coreWorkflowVersionIdToCopy"))
	if err != nil {
		return nil, err
	}
	return toWorkflowDTO(&duplicated), nil
}

func (r *mutationResolver) DeleteCoreWorkflows(ctx context.Context, input map[string]any) ([]*DeletedWorkflowDTO, error) {
	deleted, err := r.Authoring.DeleteWorkflows(ctx, userWorkspaceID(ctx), ids(input, "coreWorkflowIds"))
	if err != nil {
		return nil, err
	}
	out := make([]*DeletedWorkflowDTO, len(deleted))
	for i, d := range deleted {
		out[i] = &DeletedWorkflowDTO{ID: d.ID, WorkspaceWorkflowID: d.WorkspaceWorkflowID}
	}
	return out, nil
}

func (r *mutationResolver) DiscardCoreWorkflowDraft(ctx context.Context, input map[string]any) (*WorkflowDTO, error) {
	discarded, err := r.Authoring.DiscardDraft(ctx, userWorkspaceID(ctx), text(input, "coreWorkflowVersionId"))
	return toWorkflowDTO(discarded), err
}

func (r *mutationResolver) CreateDraftFromCoreWorkflowVersion(ctx context.Context, input map[string]any) (*VersionDTO, error) {
	version, err := r.Authoring.CreateDraftFromVersion(ctx, userWorkspaceID(ctx), text(input, "coreWorkflowId"), text(input, "coreWorkflowVersionIdToCopy"))
	if err != nil {
		return nil, err
	}
	return toVersionDTO(version), nil
}

func (r *mutationResolver) ActivateCoreWorkflowVersion(ctx context.Context, coreWorkflowVersionID string) (bool, error) {
	return r.Authoring.ActivateVersion(ctx, userWorkspaceID(ctx), coreWorkflowVersionID)
}

func (r *mutationResolver) DeactivateCoreWorkflowVersion(ctx context.Context, coreWorkflowVersionID string) (bool, error) {
	return r.Authoring.DeactivateVersion(ctx, userWorkspaceID(ctx), coreWorkflowVersionID)
}

func (r *mutationResolver) CreateCoreWorkflowVersionStep(ctx context.Context, input map[string]any) (*StepChangesDTO, error) {
	return toChangesDTO(r.Authoring.CreateStep(ctx, userWorkspaceID(ctx), text(input, "coreWorkflowVersionId"), text(input, "stepType"),
		text(input, "id"), text(input, "parentStepId"), text(input, "nextStepId"), object(input, "position"), object(input, "parentStepConnectionOptions")))
}

func (r *mutationResolver) UpdateCoreWorkflowVersionStep(ctx context.Context, input map[string]any) (*ActionDTO, error) {
	step, err := r.Authoring.UpdateStep(ctx, userWorkspaceID(ctx), text(input, "coreWorkflowVersionId"), object(input, "step"))
	if err != nil {
		return nil, err
	}
	return toActionDTO(step)
}

func (r *mutationResolver) UpdateCoreWorkflowVersionTrigger(ctx context.Context, input map[string]any) (*TriggerDTO, error) {
	trigger, err := r.Authoring.UpdateTrigger(ctx, userWorkspaceID(ctx), text(input, "coreWorkflowVersionId"), object(input, "trigger"))
	if err != nil {
		return nil, err
	}
	return &TriggerDTO{Trigger: trigger}, nil
}

func (r *mutationResolver) DeleteCoreWorkflowVersionStep(ctx context.Context, input map[string]any) (*StepChangesDTO, error) {
	return toChangesDTO(r.Authoring.DeleteStep(ctx, userWorkspaceID(ctx), text(input, "coreWorkflowVersionId"), text(input, "stepId")))
}

func (r *mutationResolver) DuplicateCoreWorkflowVersionStep(ctx context.Context, input map[string]any) (*StepChangesDTO, error) {
	return toChangesDTO(r.Authoring.DuplicateStep(ctx, userWorkspaceID(ctx), text(input, "coreWorkflowVersionId"), text(input, "stepId")))
}

func (r *mutationResolver) CreateCoreWorkflowVersionEdge(ctx context.Context, input map[string]any) (*StepChangesDTO, error) {
	return toChangesDTO(r.Authoring.ChangeEdge(ctx, userWorkspaceID(ctx), text(input, "coreWorkflowVersionId"), text(input, "source"), text(input, "target"), object(input, "sourceConnectionOptions"), true))
}

func (r *mutationResolver) DeleteCoreWorkflowVersionEdge(ctx context.Context, input map[string]any) (*StepChangesDTO, error) {
	return toChangesDTO(r.Authoring.ChangeEdge(ctx, userWorkspaceID(ctx), text(input, "coreWorkflowVersionId"), text(input, "source"), text(input, "target"), object(input, "sourceConnectionOptions"), false))
}

func (r *mutationResolver) UpdateCoreWorkflowVersionPositions(ctx context.Context, input map[string]any) (bool, error) {
	items := list(input, "positions")
	positions := make([]workflow.StepPosition, 0, len(items))
	for _, entry := range items {
		positions = append(positions, workflow.StepPosition{ID: text(entry, "id"), Position: object(entry, "position")})
	}
	return r.Authoring.UpdatePositions(ctx, userWorkspaceID(ctx), text(input, "coreWorkflowVersionId"), positions)
}

func (r *queryResolver) Empty(context.Context) (*bool, error) {
	return nil, nil
}

func (r *Resolver) Mutation() MutationResolver { return &mutationResolver{r} }

func (r *Resolver) Query() QueryResolver { return &queryResolver{r} }

type (
	mutationResolver struct{ *Resolver }
	queryResolver    struct{ *Resolver }
)
