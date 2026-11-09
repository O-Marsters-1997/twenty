package workflow

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"regexp"
	"slices"
	"strings"

	"github.com/twentyhq/twenty/packages/twenty-server-go/internal/workflow/store"
)

var variableTag = regexp.MustCompile(`{{([^{}]+)}}`)

type Authoring struct {
	Store      *store.Store
	NewAgent   func(ctx context.Context) (string, error)
	CloneAgent func(ctx context.Context, agentID string) (string, error)
}

type StepChanges struct {
	TriggerDiff []any
	StepsDiff   []any
}

type StepPosition struct {
	ID       string
	Position map[string]any
}

type draft struct {
	version store.AuthoredVersion
	trigger Step
	steps   []Step
}

func decodeContent(raw json.RawMessage, target any) error {
	if len(raw) == 0 || string(raw) == "null" {
		return nil
	}
	if err := json.Unmarshal(raw, target); err != nil {
		return fmt.Errorf("decode workflow content: %w", err)
	}
	return nil
}

func encodeContent(trigger Step, steps []Step) (json.RawMessage, json.RawMessage, error) {
	var triggerRaw, stepsRaw json.RawMessage
	var err error
	if trigger != nil {
		if triggerRaw, err = json.Marshal(trigger); err != nil {
			return nil, nil, fmt.Errorf("encode trigger: %w", err)
		}
	}
	if steps != nil {
		if stepsRaw, err = json.Marshal(steps); err != nil {
			return nil, nil, fmt.Errorf("encode steps: %w", err)
		}
	}
	return triggerRaw, stepsRaw, nil
}

func (a *Authoring) loadVersion(ctx context.Context, userWorkspaceID, versionID string) (draft, error) {
	version, err := a.Store.AuthoredVersion(ctx, versionID)
	if err != nil {
		return draft{}, err
	}
	if err := a.Store.AssertEditable(ctx, userWorkspaceID, version.CoreWorkflowID); err != nil {
		return draft{}, err
	}
	d := draft{version: version}
	if err := decodeContent(version.Trigger, &d.trigger); err != nil {
		return draft{}, err
	}
	if err := decodeContent(version.Steps, &d.steps); err != nil {
		return draft{}, err
	}
	return d, nil
}

func (a *Authoring) loadDraft(ctx context.Context, userWorkspaceID, versionID string) (draft, error) {
	d, err := a.loadVersion(ctx, userWorkspaceID, versionID)
	if err != nil {
		return draft{}, err
	}
	if d.version.Status != store.VersionDraft {
		return draft{}, fmt.Errorf("%w: Workflow version is not a draft", store.ErrActionForbidden)
	}
	return d, nil
}

func (a *Authoring) write(ctx context.Context, d draft, trigger Step, steps []Step) error {
	triggerRaw, stepsRaw, err := encodeContent(trigger, steps)
	if err != nil {
		return err
	}
	return a.Store.WriteContent(ctx, d.version.ID, d.version, triggerRaw, stepsRaw)
}

func (a *Authoring) changes(d draft, trigger Step, steps []Step, withTrigger, withSteps bool) StepChanges {
	changes := StepChanges{TriggerDiff: []any{}, StepsDiff: []any{}}
	if withTrigger {
		changes.TriggerDiff = Diff(map[string]any{"trigger": asAny(d.trigger)}, map[string]any{"trigger": asAny(trigger)})
	}
	if withSteps {
		changes.StepsDiff = Diff(map[string]any{"steps": stepsAny(d.steps)}, map[string]any{"steps": stepsAny(steps)})
	}
	return changes
}

func asAny(step Step) any {
	if step == nil {
		return nil
	}
	return step
}

func stepsAny(steps []Step) any {
	if steps == nil {
		return nil
	}
	items := make([]any, len(steps))
	for i, step := range steps {
		items[i] = step
	}
	return items
}

func (a *Authoring) agentFactory(ctx context.Context) func() (string, error) {
	return func() (string, error) {
		if a.NewAgent == nil {
			return "", invalid("AI agent steps are not available")
		}
		return a.NewAgent(ctx)
	}
}

func (a *Authoring) cloneAgentFactory(ctx context.Context) func(Step) (string, error) {
	return func(step Step) (string, error) {
		agentID, _ := inputOf(step)["agentId"].(string)
		if agentID == "" {
			return "", invalid("agent id is required for cloning")
		}
		if a.CloneAgent == nil {
			return "", invalid("AI agent steps are not available")
		}
		return a.CloneAgent(ctx, agentID)
	}
}

func (a *Authoring) CreateWorkflow(ctx context.Context, userWorkspaceID string, name *string, visibility string) (store.AuthoredWorkflow, error) {
	if visibility == "" {
		visibility = store.VisibilityWorkspace
	}
	return a.Store.CreateWorkflow(ctx, name, visibility, userWorkspaceID)
}

func (a *Authoring) UpdateWorkflow(ctx context.Context, userWorkspaceID, id, name string) (*store.AuthoredWorkflow, error) {
	if err := a.Store.AssertEditable(ctx, userWorkspaceID, id); err != nil {
		return nil, err
	}
	if err := a.Store.Rename(ctx, id, name); err != nil {
		return nil, err
	}
	return a.Store.AuthoredWorkflow(ctx, id, userWorkspaceID)
}

func (a *Authoring) UpdateVisibility(ctx context.Context, userWorkspaceID, id, visibility string) (*store.AuthoredWorkflow, error) {
	if err := a.Store.AssertEditable(ctx, userWorkspaceID, id); err != nil {
		return nil, err
	}
	found, err := a.Store.SetVisibility(ctx, id, visibility, userWorkspaceID)
	if err != nil || !found {
		return nil, err
	}
	return a.Store.AuthoredWorkflow(ctx, id, userWorkspaceID)
}

func (a *Authoring) DeleteWorkflows(ctx context.Context, userWorkspaceID string, ids []string) ([]store.DeletedWorkflow, error) {
	if len(ids) == 0 || len(ids) > 500 {
		return nil, invalid("coreWorkflowIds must hold between 1 and 500 ids")
	}
	if err := a.Store.AssertEditable(ctx, userWorkspaceID, ids...); err != nil {
		return nil, err
	}
	return a.Store.DeleteWorkflows(ctx, ids)
}

func (a *Authoring) DiscardDraft(ctx context.Context, userWorkspaceID, versionID string) (*store.AuthoredWorkflow, error) {
	version, err := a.Store.AuthoredVersion(ctx, versionID)
	if errors.Is(err, store.ErrNotFound) {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	if version.Status != store.VersionDraft {
		return nil, fmt.Errorf("%w: Workflow version is not in draft status", store.ErrActionForbidden)
	}
	if err := a.Store.AssertEditable(ctx, userWorkspaceID, version.CoreWorkflowID); err != nil {
		return nil, err
	}
	count, err := a.Store.CountVersions(ctx, version.CoreWorkflowID)
	if err != nil {
		return nil, err
	}
	if count <= 1 {
		return nil, fmt.Errorf("%w: The initial version of a workflow can not be deleted", store.ErrActionForbidden)
	}
	if err := a.Store.DeleteVersion(ctx, versionID); err != nil {
		return nil, err
	}
	return a.Store.AuthoredWorkflow(ctx, version.CoreWorkflowID, userWorkspaceID)
}

func (a *Authoring) DuplicateWorkflow(ctx context.Context, userWorkspaceID, workflowID, versionID string) (store.AuthoredWorkflow, error) {
	if err := a.Store.AssertEditable(ctx, userWorkspaceID, workflowID); err != nil {
		return store.AuthoredWorkflow{}, err
	}
	source, err := a.Store.AuthoredWorkflow(ctx, workflowID, userWorkspaceID)
	if err != nil {
		return store.AuthoredWorkflow{}, err
	}
	if source == nil {
		return store.AuthoredWorkflow{}, fmt.Errorf("%w: Workflow not found", store.ErrActionForbidden)
	}
	version, err := a.Store.AuthoredVersion(ctx, versionID)
	if err != nil || version.CoreWorkflowID != workflowID || len(version.Trigger) == 0 || string(version.Trigger) == "null" {
		return store.AuthoredWorkflow{}, fmt.Errorf("%w: Workflow version to copy not found", store.ErrActionForbidden)
	}
	var trigger Step
	var steps []Step
	if err := errors.Join(decodeContent(version.Trigger, &trigger), decodeContent(version.Steps, &steps)); err != nil {
		return store.AuthoredWorkflow{}, err
	}
	clonedTrigger, clonedSteps, err := a.cloneContent(ctx, trigger, steps)
	if err != nil {
		return store.AuthoredWorkflow{}, err
	}
	name := "(Duplicate)"
	if source.Name != nil {
		name = *source.Name + " (Duplicate)"
	}
	duplicated, err := a.Store.CreateWorkflow(ctx, &name, source.Visibility, userWorkspaceID)
	if err != nil {
		return store.AuthoredWorkflow{}, err
	}
	if err := a.writeInitialDraft(ctx, duplicated.ID, clonedTrigger, clonedSteps); err != nil {
		_, deleteErr := a.Store.DeleteWorkflows(ctx, []string{duplicated.ID})
		return store.AuthoredWorkflow{}, errors.Join(err, deleteErr)
	}
	result, err := a.Store.AuthoredWorkflow(ctx, duplicated.ID, userWorkspaceID)
	if err != nil || result == nil {
		return store.AuthoredWorkflow{}, fmt.Errorf("%w: Workflow duplication failed, please retry", store.ErrActionForbidden)
	}
	return *result, nil
}

func (a *Authoring) writeInitialDraft(ctx context.Context, workflowID string, trigger Step, steps []Step) error {
	draftID, err := a.Store.DraftVersionID(ctx, workflowID)
	if err != nil {
		return err
	}
	initial, err := a.Store.AuthoredVersion(ctx, draftID)
	if err != nil {
		return err
	}
	triggerRaw, stepsRaw, err := encodeContent(trigger, steps)
	if err != nil {
		return err
	}
	return a.Store.WriteContent(ctx, draftID, initial, triggerRaw, stepsRaw)
}

func (a *Authoring) cloneContent(ctx context.Context, trigger Step, steps []Step) (Step, []Step, error) {
	clonedID := make(map[string]string, len(steps))
	cloned := make([]Step, len(steps))
	for i, step := range steps {
		clone, err := CloneStep(step, a.cloneAgentFactory(ctx))
		if err != nil {
			return nil, nil, err
		}
		cloned[i] = clone
		clonedID[step["id"].(string)] = clone["id"].(string)
	}
	remap := func(value any) []any {
		ids := idsOf(value)
		for i, id := range ids {
			if mapped, ok := clonedID[id]; ok {
				ids[i] = mapped
			}
		}
		return anyIDs(ids)
	}
	for i, step := range steps {
		clone := cloned[i]
		clone["nextStepIds"] = remap(step["nextStepIds"])
		switch step["type"] {
		case string(ActionTypeIterator):
			input := cloneMap(inputOf(clone))
			input["initialLoopStepIds"] = remap(inputOf(step)["initialLoopStepIds"])
			clone = withInput(clone, input)
		case string(ActionTypeIfElse):
			branches := branchesOf(step)
			for j, branch := range branches {
				branches[j] = cloneMap(branch)
				branches[j]["nextStepIds"] = remap(branch["nextStepIds"])
			}
			clone = withBranches(clone, branches)
		}
		clone["settings"] = remapVariables(clone["settings"], clonedID)
		cloned[i] = clone
	}
	if trigger != nil {
		trigger = cloneMap(trigger)
		trigger["nextStepIds"] = remap(trigger["nextStepIds"])
	}
	return trigger, cloned, nil
}

func cloneMap(m map[string]any) map[string]any {
	out := make(map[string]any, len(m))
	for key, value := range m {
		out[key] = value
	}
	return out
}

func remapVariables(value any, clonedID map[string]string) any {
	switch typed := value.(type) {
	case string:
		return remapTags(typed, clonedID)
	case []any:
		out := make([]any, len(typed))
		for i, item := range typed {
			out[i] = remapVariables(item, clonedID)
		}
		return out
	case map[string]any:
		out := make(map[string]any, len(typed))
		for key, item := range typed {
			out[remapTags(key, clonedID)] = remapVariables(item, clonedID)
		}
		return out
	}
	return value
}

func remapTags(text string, clonedID map[string]string) string {
	return variableTag.ReplaceAllStringFunc(text, func(tag string) string {
		name := strings.TrimSpace(tag[2 : len(tag)-2])
		stepID, _, _ := strings.Cut(name, ".")
		if mapped, ok := clonedID[stepID]; ok {
			return strings.Replace(tag, stepID, mapped, 1)
		}
		return tag
	})
}

func (a *Authoring) CreateDraftFromVersion(ctx context.Context, userWorkspaceID, workflowID, versionToCopyID string) (store.AuthoredVersion, error) {
	if err := a.Store.AssertEditable(ctx, userWorkspaceID, workflowID); err != nil {
		return store.AuthoredVersion{}, err
	}
	toCopy, err := a.Store.AuthoredVersion(ctx, versionToCopyID)
	if err != nil || toCopy.CoreWorkflowID != workflowID {
		return store.AuthoredVersion{}, fmt.Errorf("%w: WorkflowVersion to copy not found", store.ErrNotFound)
	}
	var trigger Step
	var steps []Step
	if err := errors.Join(decodeContent(toCopy.Trigger, &trigger), decodeContent(toCopy.Steps, &steps)); err != nil {
		return store.AuthoredVersion{}, err
	}
	if trigger == nil || len(steps) == 0 {
		return store.AuthoredVersion{}, invalid("WorkflowVersion to copy has no trigger or no steps")
	}
	existing, err := a.Store.DraftVersionID(ctx, workflowID)
	switch {
	case err == nil:
		current, loadErr := a.Store.AuthoredVersion(ctx, existing)
		if loadErr != nil {
			return store.AuthoredVersion{}, loadErr
		}
		if err := a.Store.WriteContent(ctx, existing, current, toCopy.Trigger, toCopy.Steps); err != nil {
			return store.AuthoredVersion{}, err
		}
		return a.Store.AuthoredVersion(ctx, existing)
	case !errors.Is(err, store.ErrNotFound):
		return store.AuthoredVersion{}, err
	}
	id, err := a.Store.CreateDraft(ctx, workflowID, toCopy.Trigger, toCopy.Steps)
	if err != nil {
		return store.AuthoredVersion{}, err
	}
	return a.Store.AuthoredVersion(ctx, id)
}

func (a *Authoring) ActivateVersion(ctx context.Context, userWorkspaceID, versionID string) (bool, error) {
	d, err := a.loadVersion(ctx, userWorkspaceID, versionID)
	if err != nil {
		return false, err
	}
	if err := assertActivable(d.trigger, d.steps); err != nil {
		return false, err
	}
	return true, a.Store.Activate(ctx, versionID)
}

func (a *Authoring) DeactivateVersion(ctx context.Context, userWorkspaceID, versionID string) (bool, error) {
	if _, err := a.loadVersion(ctx, userWorkspaceID, versionID); err != nil {
		return false, err
	}
	return true, a.Store.Deactivate(ctx, versionID)
}

func (a *Authoring) CreateStep(ctx context.Context, userWorkspaceID, versionID, stepType, id, parentID, nextID string, position, options map[string]any) (StepChanges, error) {
	d, err := a.loadDraft(ctx, userWorkspaceID, versionID)
	if err != nil {
		return StepChanges{}, err
	}
	objectName, err := a.Store.FirstObjectName(ctx)
	if err != nil {
		return StepChanges{}, err
	}
	built, extra, err := BuildStep(stepType, id, position, objectName, a.agentFactory(ctx))
	if err != nil {
		return StepChanges{}, err
	}
	trigger, steps, err := InsertStep(d.trigger, d.steps, built, extra, parentID, nextID, options)
	if err != nil {
		return StepChanges{}, err
	}
	if err := a.write(ctx, d, trigger, steps); err != nil {
		return StepChanges{}, err
	}
	return a.changes(d, trigger, steps, true, true), nil
}

func (a *Authoring) DuplicateStep(ctx context.Context, userWorkspaceID, versionID, stepID string) (StepChanges, error) {
	d, err := a.loadDraft(ctx, userWorkspaceID, versionID)
	if err != nil {
		return StepChanges{}, err
	}
	source := findStep(d.steps, stepID)
	if source == nil {
		return StepChanges{}, fmt.Errorf("%w: Step not found", store.ErrNotFound)
	}
	cloned, err := CloneStep(source, a.cloneAgentFactory(ctx))
	if err != nil {
		return StepChanges{}, err
	}
	trigger, steps, err := InsertStep(d.trigger, d.steps, MarkDuplicate(cloned), nil, "", "", nil)
	if err != nil {
		return StepChanges{}, err
	}
	if err := a.write(ctx, d, trigger, steps); err != nil {
		return StepChanges{}, err
	}
	return a.changes(d, trigger, steps, true, true), nil
}

func (a *Authoring) UpdateStep(ctx context.Context, userWorkspaceID, versionID string, step Step) (Step, error) {
	d, err := a.loadDraft(ctx, userWorkspaceID, versionID)
	if err != nil {
		return nil, err
	}
	if d.steps == nil {
		return nil, invalid("can't update step from undefined steps")
	}
	id, _ := step["id"].(string)
	existing := findStep(d.steps, id)
	if existing == nil {
		return nil, fmt.Errorf("%w: Step not found", store.ErrNotFound)
	}
	updated := step
	var extra []Step
	if existing["type"] != step["type"] {
		objectName, err := a.Store.FirstObjectName(ctx)
		if err != nil {
			return nil, err
		}
		stepType, _ := step["type"].(string)
		built, additional, err := BuildStep(stepType, id, mapOf(step["position"]), objectName, a.agentFactory(ctx))
		if err != nil {
			return nil, err
		}
		built["position"] = existing["position"]
		if built["type"] == string(ActionTypeIfElse) {
			built["nextStepIds"] = []any{}
		} else {
			built["nextStepIds"] = existing["nextStepIds"]
		}
		updated, extra = built, additional
	}
	steps := mapSteps(d.steps, id, func(Step) Step { return updated })
	steps = append(steps, extra...)
	if err := a.write(ctx, d, d.trigger, steps); err != nil {
		return nil, err
	}
	return updated, nil
}

func (a *Authoring) UpdateTrigger(ctx context.Context, userWorkspaceID, versionID string, trigger Step) (Step, error) {
	d, err := a.loadDraft(ctx, userWorkspaceID, versionID)
	if err != nil {
		return nil, err
	}
	return trigger, a.write(ctx, d, trigger, d.steps)
}

func (a *Authoring) DeleteStep(ctx context.Context, userWorkspaceID, versionID, stepID string) (StepChanges, error) {
	d, err := a.loadDraft(ctx, userWorkspaceID, versionID)
	if err != nil {
		return StepChanges{}, err
	}
	deletingTrigger := stepID == TriggerStepID && d.trigger != nil
	if !deletingTrigger {
		if d.steps == nil {
			return StepChanges{}, invalid("can't delete step from undefined steps")
		}
		if findStep(d.steps, stepID) == nil {
			return StepChanges{}, fmt.Errorf("%w: can't delete not existing step", store.ErrNotFound)
		}
	}
	trigger, steps, _ := RemoveStep(d.trigger, d.steps, stepID)
	if steps == nil {
		steps = []Step{}
	}
	if err := a.write(ctx, d, trigger, steps); err != nil {
		return StepChanges{}, err
	}
	return a.changes(d, trigger, steps, true, true), nil
}

func (a *Authoring) ChangeEdge(ctx context.Context, userWorkspaceID, versionID, source, target string, options map[string]any, add bool) (StepChanges, error) {
	d, err := a.loadDraft(ctx, userWorkspaceID, versionID)
	if err != nil {
		return StepChanges{}, err
	}
	trigger, steps, changed, err := ChangeEdge(d.trigger, d.steps, source, target, options, add)
	if err != nil {
		return StepChanges{}, err
	}
	if !changed {
		return a.changes(d, nil, nil, false, false), nil
	}
	if err := a.write(ctx, d, trigger, steps); err != nil {
		return StepChanges{}, err
	}
	return a.changes(d, trigger, steps, source == TriggerStepID, source != TriggerStepID), nil
}

func (a *Authoring) UpdatePositions(ctx context.Context, userWorkspaceID, versionID string, positions []StepPosition) (bool, error) {
	d, err := a.loadDraft(ctx, userWorkspaceID, versionID)
	if err != nil {
		return false, err
	}
	byID := make(map[string]map[string]any, len(positions))
	for _, position := range positions {
		byID[position.ID] = position.Position
	}
	trigger, steps := SetPositions(d.trigger, d.steps, byID)
	return true, a.write(ctx, d, trigger, steps)
}

func assertActivable(trigger Step, steps []Step) error {
	if trigger == nil {
		return invalid("Workflow version does not contain trigger")
	}
	triggerType, _ := trigger["type"].(string)
	if triggerType == "" {
		return invalid("No trigger type provided")
	}
	if len(steps) == 0 {
		return invalid("No steps provided in workflow version")
	}
	settings := mapOf(trigger["settings"])
	switch triggerType {
	case "DATABASE_EVENT":
		if name, _ := settings["eventName"].(string); name == "" {
			return invalid("No event name provided in database event trigger")
		}
	case "CRON":
		return assertCronSettings(settings)
	case "MANUAL", "WEBHOOK":
	default:
		return invalid("Invalid trigger type for enabling workflow trigger")
	}
	return nil
}

func assertCronSettings(settings map[string]any) error {
	kind, _ := settings["type"].(string)
	if kind == "" {
		return invalid("No setting type provided in cron trigger")
	}
	if kind == "CUSTOM" {
		if pattern, _ := settings["pattern"].(string); pattern == "" {
			return invalid("No pattern provided in CUSTOM cron trigger")
		}
		return nil
	}
	schedule := mapOf(settings["schedule"])
	if schedule == nil && slices.Contains([]string{"DAYS", "HOURS", "MINUTES"}, kind) {
		return invalid("No schedule provided in cron trigger")
	}
	number := func(key string) float64 {
		value, _ := schedule[key].(float64)
		return value
	}
	switch kind {
	case "DAYS":
		if number("day") <= 0 || number("hour") < 0 || number("hour") > 23 || number("minute") < 0 || number("minute") > 59 {
			return invalid("Invalid day, hour or minute value in cron trigger")
		}
	case "HOURS":
		if number("hour") <= 0 || number("minute") < 0 || number("minute") > 59 {
			return invalid("Invalid hour or minute value in cron trigger")
		}
	case "MINUTES":
		if number("minute") <= 0 || number("minute") > 60 {
			return invalid("Invalid minute value in cron trigger")
		}
	default:
		return invalid("Invalid setting type provided in cron trigger")
	}
	return nil
}
