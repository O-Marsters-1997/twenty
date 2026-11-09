package workflow

import "encoding/json"

// RunWorkflowArgs is the River job that executes a workflow run from its first step.
type RunWorkflowArgs struct {
	RunID string `json:"runId"`
}

func (RunWorkflowArgs) Kind() string { return "workflow_run" }

// ResumeStepArgs is the River job that continues a run parked on a Pending step.
type ResumeStepArgs struct {
	RunID  string          `json:"runId"`
	StepID string          `json:"stepId"`
	Input  json.RawMessage `json:"input"`
}

func (ResumeStepArgs) Kind() string { return "workflow_resume_step" }

type CronTriggerArgs struct {
	TriggerID string `json:"triggerId"`
}

func (CronTriggerArgs) Kind() string { return "workflow_cron_trigger" }
