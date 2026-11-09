package main

import (
	"context"
	"log/slog"
	"testing"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/riverqueue/river"

	"github.com/twentyhq/twenty/packages/twenty-server-go/internal/pgtest"
	"github.com/twentyhq/twenty/packages/twenty-server-go/internal/records"
	"github.com/twentyhq/twenty/packages/twenty-server-go/internal/workflow"
	"github.com/twentyhq/twenty/packages/twenty-server-go/internal/workflow/store"
	"github.com/twentyhq/twenty/packages/twenty-server-go/internal/workspace"
)

func seedWorkflow(t *testing.T, pool *pgxpool.Pool, status, eventName string) {
	t.Helper()
	schema := `"` + workspace.SchemaName() + `".`
	var workflowID, versionID string
	err := pool.QueryRow(t.Context(), `INSERT INTO `+schema+`workflow (name, statuses) VALUES ('Classify', ARRAY[$1]::`+schema+`workflow_statuses_enum[]) RETURNING id::text`, status).Scan(&workflowID)
	if err != nil {
		t.Fatalf("seed workflow: %v", err)
	}
	err = pool.QueryRow(t.Context(), `INSERT INTO `+schema+`"workflowVersion" ("workflowId", name, trigger, steps)
		VALUES ($1, 'v1', jsonb_build_object('type', 'DATABASE_EVENT', 'settings', jsonb_build_object('eventName', $2::text)), '[]') RETURNING id::text`, workflowID, eventName).Scan(&versionID)
	if err != nil {
		t.Fatalf("seed version: %v", err)
	}
	if _, err := pool.Exec(t.Context(), `UPDATE `+schema+`workflow SET "lastPublishedVersionId" = $2 WHERE id = $1`, workflowID, versionID); err != nil {
		t.Fatalf("publish version: %v", err)
	}
}

func startEventWorkers(t *testing.T, pool *pgxpool.Pool) *river.Client[pgx.Tx] {
	t.Helper()
	registry, err := workflow.NewRegistry()
	if err != nil {
		t.Fatal(err)
	}
	workflows := store.New(pool)
	workers := river.NewWorkers()
	registerWorkflowWorkers(workers, &executor{store: workflows, registry: registry})
	registerRecordEventWorker(workers, pool, workflows)
	client, err := newClient(pool, workers, slog.New(slog.DiscardHandler))
	if err != nil {
		t.Fatal(err)
	}
	if err := client.Start(t.Context()); err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() {
		stopCtx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
		defer cancel()
		if err := client.Stop(stopCtx); err != nil {
			t.Errorf("Stop: %v", err)
		}
	})
	return client
}

func runStatuses(t *testing.T, pool *pgxpool.Pool) []string {
	t.Helper()
	rows, err := pool.Query(t.Context(), `SELECT status::text FROM `+workspace.SchemaName()+`."workflowRun"`)
	if err != nil {
		t.Fatal(err)
	}
	defer rows.Close()
	var statuses []string
	for rows.Next() {
		var status string
		if err := rows.Scan(&status); err != nil {
			t.Fatal(err)
		}
		statuses = append(statuses, status)
	}
	return statuses
}

func TestRecordEventWorker_Work(t *testing.T) {
	t.Parallel()
	event := records.RecordEventArgs{Event: records.RecordEvent{Object: "person", Kind: records.EventCreated, RecordID: "p1", After: []byte(`{"id":"p1"}`)}}

	t.Run("an active matching workflow runs to completion as a river job", func(t *testing.T) {
		t.Parallel()
		pool, err := pgxpool.New(t.Context(), pgtest.New(t))
		if err != nil {
			t.Fatal(err)
		}
		t.Cleanup(pool.Close)
		seedWorkflow(t, pool, "ACTIVE", "person.created")
		client := startEventWorkers(t, pool)
		if _, err := client.Insert(t.Context(), event, nil); err != nil {
			t.Fatal(err)
		}

		deadline := time.Now().Add(15 * time.Second)
		for {
			statuses := runStatuses(t, pool)
			if len(statuses) == 1 && statuses[0] == store.StatusCompleted {
				return
			}
			if time.Now().After(deadline) {
				t.Fatalf("run statuses = %v, want one COMPLETED", statuses)
			}
			time.Sleep(100 * time.Millisecond)
		}
	})

	t.Run("inactive or non-matching workflows get no run", func(t *testing.T) {
		t.Parallel()
		pool, err := pgxpool.New(t.Context(), pgtest.New(t))
		if err != nil {
			t.Fatal(err)
		}
		t.Cleanup(pool.Close)
		seedWorkflow(t, pool, "DRAFT", "person.created")
		seedWorkflow(t, pool, "ACTIVE", "person.updated")
		client := startEventWorkers(t, pool)
		if _, err := client.Insert(t.Context(), event, nil); err != nil {
			t.Fatal(err)
		}

		deadline := time.Now().Add(15 * time.Second)
		for {
			var pending int
			err := pool.QueryRow(t.Context(), `SELECT count(*) FROM river_job WHERE kind = 'record_event' AND state <> 'completed'`).Scan(&pending)
			if err != nil {
				t.Fatal(err)
			}
			if pending == 0 {
				break
			}
			if time.Now().After(deadline) {
				t.Fatal("record event job never completed")
			}
			time.Sleep(100 * time.Millisecond)
		}
		if statuses := runStatuses(t, pool); len(statuses) != 0 {
			t.Errorf("run statuses = %v, want none", statuses)
		}
	})
}
