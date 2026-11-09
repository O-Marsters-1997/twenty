package workflow

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"

	"github.com/riverqueue/river"
	"github.com/robfig/cron/v3"

	"github.com/twentyhq/twenty/packages/twenty-server-go/internal/workflow/store"
)

type TriggerType string

const (
	TriggerTypeCron    TriggerType = "CRON"
	TriggerTypeManual  TriggerType = "MANUAL"
	TriggerTypeWebhook TriggerType = "WEBHOOK"
)

const versionStatusActive = "ACTIVE"

var ErrNotLaunchable = errors.New("workflow version cannot be launched by this trigger")

type LaunchStore interface {
	Workflow(ctx context.Context, id string) (store.Workflow, error)
	Version(ctx context.Context, id string) (store.Version, error)
	CreateRun(ctx context.Context, run store.NewRun) (store.Run, error)
}

type Enqueuer func(ctx context.Context, args river.JobArgs) error

type Launcher struct {
	Store LaunchStore
	Queue Enqueuer
}

func (l *Launcher) Launch(ctx context.Context, versionID string, trigger TriggerType, payload json.RawMessage) (store.Run, error) {
	version, err := l.Store.Version(ctx, versionID)
	if err != nil {
		return store.Run{}, fmt.Errorf("load version: %w", err)
	}
	var definition struct {
		Type TriggerType `json:"type"`
	}
	if err := json.Unmarshal(version.Trigger, &definition); err != nil {
		return store.Run{}, fmt.Errorf("decode trigger: %w", err)
	}
	if definition.Type != trigger {
		return store.Run{}, fmt.Errorf("version %s has a %q trigger, not %q: %w", version.ID, definition.Type, trigger, ErrNotLaunchable)
	}
	if trigger != TriggerTypeManual && version.Status != versionStatusActive {
		return store.Run{}, fmt.Errorf("version %s is %s: %w", version.ID, version.Status, ErrNotLaunchable)
	}
	if len(payload) == 0 {
		payload = json.RawMessage(`{}`)
	}
	state, err := json.Marshal(map[string]any{"stepInfos": map[string]any{
		"trigger": map[string]any{"status": "SUCCESS", "result": payload},
	}})
	if err != nil {
		return store.Run{}, fmt.Errorf("encode trigger payload: %w", err)
	}
	run, err := l.Store.CreateRun(ctx, store.NewRun{WorkflowID: version.WorkflowID, VersionID: version.ID, Name: version.Name, State: state})
	if err != nil {
		return store.Run{}, fmt.Errorf("create run: %w", err)
	}
	if err := l.Queue(ctx, RunWorkflowArgs{RunID: run.ID}); err != nil {
		return store.Run{}, fmt.Errorf("enqueue run %s: %w", run.ID, err)
	}
	return run, nil
}

func (l *Launcher) LaunchWebhook(ctx context.Context, workflowID string, payload json.RawMessage) (store.Run, error) {
	workflow, err := l.Store.Workflow(ctx, workflowID)
	if err != nil {
		return store.Run{}, fmt.Errorf("load workflow: %w", err)
	}
	if workflow.LastPublishedVersionID == "" {
		return store.Run{}, fmt.Errorf("workflow %s is not published: %w", workflowID, ErrNotLaunchable)
	}
	return l.Launch(ctx, workflow.LastPublishedVersionID, TriggerTypeWebhook, payload)
}

func CronSchedule(trigger json.RawMessage) (cron.Schedule, error) {
	var definition struct {
		Settings struct {
			Type     string `json:"type"`
			Pattern  string `json:"pattern"`
			Schedule struct {
				Day    int `json:"day"`
				Hour   int `json:"hour"`
				Minute int `json:"minute"`
			} `json:"schedule"`
		} `json:"settings"`
	}
	if err := json.Unmarshal(trigger, &definition); err != nil {
		return nil, fmt.Errorf("decode cron trigger: %w", err)
	}
	settings := definition.Settings
	var pattern string
	switch settings.Type {
	case "CUSTOM":
		pattern = settings.Pattern
	case "DAYS":
		pattern = fmt.Sprintf("%d %d */%d * *", settings.Schedule.Minute, settings.Schedule.Hour, settings.Schedule.Day)
	case "HOURS":
		pattern = fmt.Sprintf("%d */%d * * *", settings.Schedule.Minute, settings.Schedule.Hour)
	case "MINUTES":
		pattern = fmt.Sprintf("*/%d * * * *", settings.Schedule.Minute)
	default:
		return nil, fmt.Errorf("unsupported cron schedule type %q", settings.Type)
	}
	schedule, err := cron.ParseStandard(pattern)
	if err != nil {
		return nil, fmt.Errorf("cron pattern %q: %w", pattern, err)
	}
	return schedule, nil
}
