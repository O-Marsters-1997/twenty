package main

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"

	"github.com/riverqueue/river"

	"github.com/twentyhq/twenty/packages/twenty-server-go/internal/workflow"
	"github.com/twentyhq/twenty/packages/twenty-server-go/internal/workflow/store"
)

const (
	stepStatusSuccess = "SUCCESS"
	stepStatusFailed  = "FAILED"
	stepStatusPending = "PENDING"
)

type runStore interface {
	Run(ctx context.Context, id string) (store.Run, error)
	Version(ctx context.Context, id string) (store.Version, error)
	Transition(ctx context.Context, id, status, runError string) (store.Run, error)
	SetStepInfo(ctx context.Context, runID, stepID string, info json.RawMessage) error
}

type step struct {
	ID       string              `json:"id"`
	Type     workflow.ActionType `json:"type"`
	Settings json.RawMessage     `json:"settings"`
}

type stepInfo struct {
	Status string `json:"status"`
	Result any    `json:"result,omitempty"`
	Error  string `json:"error,omitempty"`
}

type executor struct {
	store    runStore
	registry *workflow.Registry
}

func registerWorkflowWorkers(workers *river.Workers, exec *executor) {
	river.AddWorker(workers, &runWorkflowWorker{exec: exec})
	river.AddWorker(workers, &resumeStepWorker{exec: exec})
}

type runWorkflowWorker struct {
	river.WorkerDefaults[workflow.RunWorkflowArgs]
	exec *executor
}

func (w *runWorkflowWorker) Work(ctx context.Context, job *river.Job[workflow.RunWorkflowArgs]) error {
	run, err := w.exec.store.Run(ctx, job.Args.RunID)
	if err != nil {
		return fmt.Errorf("load run: %w", err)
	}
	switch run.Status {
	case store.StatusNotStarted, store.StatusEnqueued:
		if run, err = w.exec.store.Transition(ctx, run.ID, store.StatusRunning, ""); err != nil {
			return fmt.Errorf("start run: %w", err)
		}
	case store.StatusRunning:
		infos, err := parseStepInfos(run.State)
		if err != nil {
			return err
		}
		for _, info := range infos {
			if info.Status == stepStatusPending {
				return river.JobCancel(fmt.Errorf("run %s is parked on a pending step", run.ID))
			}
		}
	default:
		return river.JobCancel(fmt.Errorf("run %s is %s", run.ID, run.Status))
	}
	return w.exec.execute(ctx, run)
}

type resumeStepWorker struct {
	river.WorkerDefaults[workflow.ResumeStepArgs]
	exec *executor
}

func (w *resumeStepWorker) Work(ctx context.Context, job *river.Job[workflow.ResumeStepArgs]) error {
	run, err := w.exec.store.Run(ctx, job.Args.RunID)
	if err != nil {
		return fmt.Errorf("load run: %w", err)
	}
	infos, err := parseStepInfos(run.State)
	if err != nil {
		return err
	}
	stepStatus := infos[job.Args.StepID].Status
	if run.Status != store.StatusRunning || (stepStatus != stepStatusPending && stepStatus != stepStatusSuccess) {
		return river.JobCancel(fmt.Errorf("step %q of run %s is not parked", job.Args.StepID, run.ID))
	}
	if stepStatus == stepStatusPending {
		var result any
		if len(job.Args.Input) > 0 {
			if err := json.Unmarshal(job.Args.Input, &result); err != nil {
				return river.JobCancel(fmt.Errorf("decode resume input: %w", err))
			}
		}
		if err := w.exec.record(ctx, run.ID, job.Args.StepID, stepInfo{Status: stepStatusSuccess, Result: result}); err != nil {
			return err
		}
		if run, err = w.exec.store.Run(ctx, run.ID); err != nil {
			return fmt.Errorf("reload run: %w", err)
		}
	}
	return w.exec.execute(ctx, run)
}

func (e *executor) execute(ctx context.Context, run store.Run) error {
	version, err := e.store.Version(ctx, run.VersionID)
	if err != nil {
		return fmt.Errorf("load version: %w", err)
	}
	var steps []step
	if err := json.Unmarshal(version.Steps, &steps); err != nil {
		return e.fail(ctx, run.ID, fmt.Errorf("decode steps: %w", err))
	}
	infos, err := parseStepInfos(run.State)
	if err != nil {
		return e.fail(ctx, run.ID, err)
	}
	stepContext := make(map[string]any, len(infos))
	for id, info := range infos {
		if info.Status == stepStatusSuccess {
			stepContext[id] = info.Result
		}
	}

	for _, current := range steps {
		if infos[current.ID].Status == stepStatusSuccess {
			continue
		}
		action, err := e.registry.Lookup(current.Type)
		if err != nil {
			return e.failStep(ctx, run.ID, current.ID, err.Error())
		}
		input := workflow.StepInput{RunID: run.ID, StepID: current.ID, Settings: current.Settings, Context: stepContext}
		output, err := action.Run(ctx, input)
		switch {
		case err != nil:
			return e.failStep(ctx, run.ID, current.ID, err.Error())
		case output.Error != "":
			return e.failStep(ctx, run.ID, current.ID, output.Error)
		case output.Pending:
			return e.record(ctx, run.ID, current.ID, stepInfo{Status: stepStatusPending})
		}
		if err := e.record(ctx, run.ID, current.ID, stepInfo{Status: stepStatusSuccess, Result: output.Result}); err != nil {
			return err
		}
		stepContext[current.ID] = output.Result
	}
	if _, err := e.store.Transition(ctx, run.ID, store.StatusCompleted, ""); err != nil {
		return fmt.Errorf("complete run: %w", err)
	}
	return nil
}

func (e *executor) record(ctx context.Context, runID, stepID string, info stepInfo) error {
	payload, err := json.Marshal(info)
	if err != nil {
		return fmt.Errorf("encode step info: %w", err)
	}
	if err := e.store.SetStepInfo(ctx, runID, stepID, payload); err != nil {
		return fmt.Errorf("record step %q: %w", stepID, err)
	}
	return nil
}

func (e *executor) failStep(ctx context.Context, runID, stepID, message string) error {
	if err := e.record(ctx, runID, stepID, stepInfo{Status: stepStatusFailed, Error: message}); err != nil {
		return err
	}
	return e.fail(ctx, runID, errors.New(message))
}

func (e *executor) fail(ctx context.Context, runID string, cause error) error {
	if _, err := e.store.Transition(ctx, runID, store.StatusFailed, cause.Error()); err != nil {
		return fmt.Errorf("fail run: %w", err)
	}
	return nil
}

func parseStepInfos(state json.RawMessage) (map[string]stepInfo, error) {
	var parsed struct {
		StepInfos map[string]stepInfo `json:"stepInfos"`
	}
	if len(state) > 0 {
		if err := json.Unmarshal(state, &parsed); err != nil {
			return nil, fmt.Errorf("decode run state: %w", err)
		}
	}
	if parsed.StepInfos == nil {
		parsed.StepInfos = map[string]stepInfo{}
	}
	return parsed.StepInfos, nil
}
