package workflow_test

import (
	"context"
	"encoding/json"
	"errors"
	"testing"
	"time"

	"github.com/google/go-cmp/cmp"
	"github.com/riverqueue/river"

	"github.com/twentyhq/twenty/packages/twenty-server-go/internal/workflow"
	"github.com/twentyhq/twenty/packages/twenty-server-go/internal/workflow/store"
)

type fakeLaunchStore struct {
	workflow store.Workflow
	version  store.Version
	created  []store.NewRun
}

func (f *fakeLaunchStore) Workflow(context.Context, string) (store.Workflow, error) {
	return f.workflow, nil
}

func (f *fakeLaunchStore) Version(context.Context, string) (store.Version, error) {
	return f.version, nil
}

func (f *fakeLaunchStore) CreateRun(_ context.Context, run store.NewRun) (store.Run, error) {
	f.created = append(f.created, run)
	return store.Run{ID: "run-1", WorkflowID: run.WorkflowID, VersionID: run.VersionID, State: run.State}, nil
}

func newLauncher(version store.Version) (*workflow.Launcher, *fakeLaunchStore, *[]river.JobArgs) {
	fake := &fakeLaunchStore{version: version, workflow: store.Workflow{ID: "wf", LastPublishedVersionID: version.ID}}
	var queued []river.JobArgs
	launcher := &workflow.Launcher{Store: fake, Queue: func(_ context.Context, args river.JobArgs) error {
		queued = append(queued, args)
		return nil
	}}
	return launcher, fake, &queued
}

func TestLauncher_Launch(t *testing.T) {
	t.Parallel()

	t.Run("each trigger type starts a run with its payload as trigger context", func(t *testing.T) {
		t.Parallel()
		tests := []struct {
			name    string
			trigger workflow.TriggerType
			status  string
			payload string
			want    string
		}{
			{name: "cron", trigger: workflow.TriggerTypeCron, status: "ACTIVE", want: `{}`},
			{name: "manual draft", trigger: workflow.TriggerTypeManual, status: "DRAFT", payload: `{"recordId":"r1"}`, want: `{"recordId":"r1"}`},
			{name: "webhook", trigger: workflow.TriggerTypeWebhook, status: "ACTIVE", payload: `{"a":1}`, want: `{"a":1}`},
		}
		for _, tt := range tests {
			t.Run(tt.name, func(t *testing.T) {
				t.Parallel()
				launcher, fake, queued := newLauncher(store.Version{
					ID: "v1", WorkflowID: "wf", Status: tt.status, Trigger: json.RawMessage(`{"type":"` + string(tt.trigger) + `"}`),
				})

				run, err := launcher.Launch(t.Context(), "v1", tt.trigger, json.RawMessage(tt.payload))
				if err != nil {
					t.Fatalf("Launch() = %v", err)
				}

				var state struct {
					StepInfos map[string]struct {
						Status string          `json:"status"`
						Result json.RawMessage `json:"result"`
					} `json:"stepInfos"`
				}
				if err := json.Unmarshal(fake.created[0].State, &state); err != nil {
					t.Fatal(err)
				}
				trigger := state.StepInfos["trigger"]
				if trigger.Status != "SUCCESS" {
					t.Errorf("trigger status = %q, want SUCCESS", trigger.Status)
				}
				if string(trigger.Result) != tt.want {
					t.Errorf("trigger result = %s, want %s", trigger.Result, tt.want)
				}
				if diff := cmp.Diff([]river.JobArgs{workflow.RunWorkflowArgs{RunID: run.ID}}, *queued); diff != "" {
					t.Errorf("queued (-want +got):\n%s", diff)
				}
			})
		}
	})

	t.Run("refused launches create nothing", func(t *testing.T) {
		t.Parallel()
		tests := []struct {
			name    string
			trigger workflow.TriggerType
			version store.Version
		}{
			{name: "wrong trigger type", trigger: workflow.TriggerTypeCron, version: store.Version{Status: "ACTIVE", Trigger: json.RawMessage(`{"type":"MANUAL"}`)}},
			{name: "inactive cron", trigger: workflow.TriggerTypeCron, version: store.Version{Status: "DRAFT", Trigger: json.RawMessage(`{"type":"CRON"}`)}},
			{name: "inactive webhook", trigger: workflow.TriggerTypeWebhook, version: store.Version{Status: "DEACTIVATED", Trigger: json.RawMessage(`{"type":"WEBHOOK"}`)}},
		}
		for _, tt := range tests {
			t.Run(tt.name, func(t *testing.T) {
				t.Parallel()
				launcher, fake, queued := newLauncher(tt.version)

				_, err := launcher.Launch(t.Context(), "v1", tt.trigger, nil)

				if !errors.Is(err, workflow.ErrNotLaunchable) {
					t.Errorf("Launch() = %v, want ErrNotLaunchable", err)
				}
				if len(fake.created) != 0 || len(*queued) != 0 {
					t.Errorf("created %d runs, queued %d jobs, want none", len(fake.created), len(*queued))
				}
			})
		}
	})
}

func TestLauncher_LaunchWebhook(t *testing.T) {
	t.Parallel()

	t.Run("runs the last published version", func(t *testing.T) {
		t.Parallel()
		launcher, fake, _ := newLauncher(store.Version{ID: "v2", WorkflowID: "wf", Status: "ACTIVE", Trigger: json.RawMessage(`{"type":"WEBHOOK"}`)})

		if _, err := launcher.LaunchWebhook(t.Context(), "wf", json.RawMessage(`{}`)); err != nil {
			t.Fatalf("LaunchWebhook() = %v", err)
		}
		if got := fake.created[0].VersionID; got != "v2" {
			t.Errorf("version = %q, want v2", got)
		}
	})

	t.Run("unpublished workflow is refused", func(t *testing.T) {
		t.Parallel()
		launcher, fake, _ := newLauncher(store.Version{})
		fake.workflow.LastPublishedVersionID = ""

		if _, err := launcher.LaunchWebhook(t.Context(), "wf", nil); !errors.Is(err, workflow.ErrNotLaunchable) {
			t.Errorf("LaunchWebhook() = %v, want ErrNotLaunchable", err)
		}
	})
}

func TestCronSchedule(t *testing.T) {
	t.Parallel()
	from := time.Date(2026, 1, 1, 10, 7, 0, 0, time.UTC)

	t.Run("schedules fire at the next matching time", func(t *testing.T) {
		t.Parallel()
		tests := []struct {
			name    string
			trigger string
			want    time.Time
		}{
			{name: "minutes", trigger: `{"settings":{"type":"MINUTES","schedule":{"minute":15}}}`, want: time.Date(2026, 1, 1, 10, 15, 0, 0, time.UTC)},
			{name: "hours", trigger: `{"settings":{"type":"HOURS","schedule":{"hour":4,"minute":30}}}`, want: time.Date(2026, 1, 1, 12, 30, 0, 0, time.UTC)},
			{name: "days", trigger: `{"settings":{"type":"DAYS","schedule":{"day":1,"hour":9,"minute":0}}}`, want: time.Date(2026, 1, 2, 9, 0, 0, 0, time.UTC)},
			{name: "custom", trigger: `{"settings":{"type":"CUSTOM","pattern":"0 12 * * *"}}`, want: time.Date(2026, 1, 1, 12, 0, 0, 0, time.UTC)},
		}
		for _, tt := range tests {
			t.Run(tt.name, func(t *testing.T) {
				t.Parallel()
				schedule, err := workflow.CronSchedule(json.RawMessage(tt.trigger))
				if err != nil {
					t.Fatalf("CronSchedule() = %v", err)
				}
				if got := schedule.Next(from); !got.Equal(tt.want) {
					t.Errorf("Next() = %v, want %v", got, tt.want)
				}
			})
		}
	})

	t.Run("invalid settings are rejected", func(t *testing.T) {
		t.Parallel()
		for _, trigger := range []string{`{"settings":{"type":"WEEKLY"}}`, `{"settings":{"type":"CUSTOM","pattern":"nope"}}`} {
			if _, err := workflow.CronSchedule(json.RawMessage(trigger)); err == nil {
				t.Errorf("CronSchedule(%s) = nil error, want error", trigger)
			}
		}
	})
}
