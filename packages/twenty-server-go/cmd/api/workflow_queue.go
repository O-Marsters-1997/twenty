package main

import (
	"context"
	"fmt"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/riverqueue/river"
	"github.com/riverqueue/river/riverdriver/riverpgxv5"
)

type workflowQueue struct{ client *river.Client[pgx.Tx] }

func newWorkflowQueue(pool *pgxpool.Pool) (workflowQueue, error) {
	client, err := river.NewClient(riverpgxv5.New(pool), &river.Config{})
	if err != nil {
		return workflowQueue{}, fmt.Errorf("create insert-only river client: %w", err)
	}
	return workflowQueue{client: client}, nil
}

func (q workflowQueue) Enqueue(ctx context.Context, args river.JobArgs) error {
	if _, err := q.client.Insert(ctx, args, nil); err != nil {
		return fmt.Errorf("insert job: %w", err)
	}
	return nil
}
