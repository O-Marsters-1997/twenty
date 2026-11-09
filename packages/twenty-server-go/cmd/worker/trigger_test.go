package main

import (
	"context"
	"encoding/json"
	"errors"
	"io"
	"log/slog"
	"testing"

	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/riverqueue/river"

	"github.com/twentyhq/twenty/packages/twenty-server-go/internal/pgtest"
	"github.com/twentyhq/twenty/packages/twenty-server-go/internal/workflow"
	"github.com/twentyhq/twenty/packages/twenty-server-go/internal/workflow/store"
)

type triggerStore struct {
	versions []store.Version
	runs     []store.NewRun
}

func (s *triggerStore) Workflow(context.Context, string) (store.Workflow, error) {
	return store.Workflow{}, nil
}

func (s *triggerStore) Version(_ context.Context, id string) (store.Version, error) {
	for _, version := range s.versions {
		if version.ID == id {
			return version, nil
		}
	}
	return store.Version{}, store.ErrNotFound
}

func (s *triggerStore) CreateRun(_ context.Context, run store.NewRun) (store.Run, error) {
	s.runs = append(s.runs, run)
	return store.Run{ID: "run-1"}, nil
}

func (s *triggerStore) ActiveVersions(context.Context) ([]store.Version, error) {
	return s.versions, nil
}

func cronVersion(id, minute string) store.Version {
	return store.Version{
		ID: id, WorkflowID: "wf", Status: "ACTIVE",
		Trigger: json.RawMessage(`{"type":"CRON","settings":{"type":"MINUTES","schedule":{"minute":` + minute + `}}}`),
	}
}

func TestCronTriggerWorker_Work(t *testing.T) {
	t.Parallel()

	t.Run("fires the trigger and starts a run", func(t *testing.T) {
		t.Parallel()
		fake := &triggerStore{versions: []store.Version{cronVersion("v1", "5")}}
		var queued []river.JobArgs
		worker := &cronTriggerWorker{launcher: &workflow.Launcher{Store: fake, Queue: func(_ context.Context, args river.JobArgs) error {
			queued = append(queued, args)
			return nil
		}}}

		job := &river.Job[workflow.CronTriggerArgs]{Args: workflow.CronTriggerArgs{TriggerID: "v1"}}
		if err := worker.Work(t.Context(), job); err != nil {
			t.Fatalf("Work() = %v", err)
		}
		if len(fake.runs) != 1 || len(queued) != 1 {
			t.Errorf("runs = %d, queued = %d, want 1 each", len(fake.runs), len(queued))
		}
	})

	t.Run("a trigger that is gone cancels the job", func(t *testing.T) {
		t.Parallel()
		worker := &cronTriggerWorker{launcher: &workflow.Launcher{Store: &triggerStore{}}}

		job := &river.Job[workflow.CronTriggerArgs]{Args: workflow.CronTriggerArgs{TriggerID: "missing"}}
		var cancelErr *river.JobCancelError
		if err := worker.Work(t.Context(), job); !errors.As(err, &cancelErr) {
			t.Errorf("Work() = %v, want JobCancelError", err)
		}
	})
}

func TestCronScheduler_sync(t *testing.T) {
	t.Parallel()
	workers := river.NewWorkers()
	river.AddWorker(workers, &cronTriggerWorker{})
	pool, err := pgxpool.New(t.Context(), pgtest.New(t))
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(pool.Close)
	client, err := newClient(pool, workers, slog.New(slog.NewTextHandler(io.Discard, nil)))
	if err != nil {
		t.Fatal(err)
	}
	fake := &triggerStore{versions: []store.Version{
		cronVersion("v1", "5"),
		cronVersion("v2", "10"),
		{ID: "manual", Status: "ACTIVE", Trigger: json.RawMessage(`{"type":"MANUAL"}`)},
		{ID: "bad", Status: "ACTIVE", Trigger: json.RawMessage(`{"type":"CRON","settings":{"type":"WEEKLY"}}`)},
	}}
	scheduler := newCronScheduler(fake, client.PeriodicJobs(), slog.New(slog.NewTextHandler(io.Discard, nil)))

	if err := scheduler.sync(t.Context()); err != nil {
		t.Fatalf("sync() = %v", err)
	}
	if len(scheduler.scheduled) != 2 {
		t.Fatalf("scheduled %d triggers, want v1 and v2 only: %v", len(scheduler.scheduled), scheduler.scheduled)
	}

	fake.versions = []store.Version{cronVersion("v1", "20")}
	if err := scheduler.sync(t.Context()); err != nil {
		t.Fatalf("second sync() = %v", err)
	}
	if len(scheduler.scheduled) != 1 || scheduler.scheduled["v1"] != string(fake.versions[0].Trigger) {
		t.Errorf("scheduled = %v, want only v1 with its new trigger", scheduler.scheduled)
	}
}
