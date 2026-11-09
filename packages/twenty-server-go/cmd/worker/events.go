package main

import (
	"context"
	"encoding/json"
	"fmt"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/riverqueue/river"

	"github.com/twentyhq/twenty/packages/twenty-server-go/internal/records"
	"github.com/twentyhq/twenty/packages/twenty-server-go/internal/workflow"
	"github.com/twentyhq/twenty/packages/twenty-server-go/internal/workflow/store"
)

type eventStore interface {
	DatabaseEventVersions(ctx context.Context, eventName string) ([]store.Version, error)
	CreateRunTx(ctx context.Context, tx pgx.Tx, run store.NewRun) (store.Run, error)
}

type recordEventWorker struct {
	river.WorkerDefaults[records.RecordEventArgs]
	pool  *pgxpool.Pool
	store eventStore
}

func registerRecordEventWorker(workers *river.Workers, pool *pgxpool.Pool, events eventStore) {
	river.AddWorker(workers, &recordEventWorker{pool: pool, store: events})
}

func (w *recordEventWorker) Work(ctx context.Context, job *river.Job[records.RecordEventArgs]) error {
	event := job.Args.Event
	eventName := event.Object + "." + string(event.Kind)
	versions, err := w.store.DatabaseEventVersions(ctx, eventName)
	if err != nil {
		return fmt.Errorf("find %s triggers: %w", eventName, err)
	}
	if len(versions) == 0 {
		return nil
	}
	state, err := triggerState(eventName, event)
	if err != nil {
		return river.JobCancel(err)
	}
	client := river.ClientFromContext[pgx.Tx](ctx)
	return pgx.BeginFunc(ctx, w.pool, func(tx pgx.Tx) error {
		for _, version := range versions {
			run, err := w.store.CreateRunTx(ctx, tx, store.NewRun{WorkflowID: version.WorkflowID, VersionID: version.ID, Name: version.Name, State: state})
			if err != nil {
				return fmt.Errorf("create run for workflow %s: %w", version.WorkflowID, err)
			}
			if _, err := client.InsertTx(ctx, tx, workflow.RunWorkflowArgs{RunID: run.ID}, nil); err != nil {
				return fmt.Errorf("enqueue run %s: %w", run.ID, err)
			}
		}
		return nil
	})
}

func triggerState(eventName string, event records.RecordEvent) (json.RawMessage, error) {
	state, err := json.Marshal(map[string]any{"stepInfos": map[string]any{"trigger": stepInfo{
		Status: stepStatusSuccess,
		Result: map[string]any{
			"name":       eventName,
			"recordId":   event.RecordID,
			"properties": map[string]json.RawMessage{"before": event.Before, "after": event.After},
		},
	}}})
	if err != nil {
		return nil, fmt.Errorf("encode trigger state: %w", err)
	}
	return state, nil
}
