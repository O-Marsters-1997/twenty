package main

import (
	"context"
	"log/slog"
	"testing"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/riverqueue/river"

	"github.com/twentyhq/twenty/packages/twenty-server-go/internal/pgtest"
)

type pingArgs struct{}

func (pingArgs) Kind() string { return "ping" }

type pingWorker struct {
	river.WorkerDefaults[pingArgs]
	ran chan<- struct{}
}

func (w pingWorker) Work(context.Context, *river.Job[pingArgs]) error {
	w.ran <- struct{}{}
	return nil
}

func TestNewClient(t *testing.T) {
	t.Parallel()
	pool, err := pgxpool.New(t.Context(), pgtest.New(t))
	if err != nil {
		t.Fatalf("connect: %v", err)
	}
	t.Cleanup(pool.Close)

	ran := make(chan struct{}, 1)
	workers := river.NewWorkers()
	river.AddWorker(workers, pingWorker{ran: ran})
	client, err := newClient(pool, workers, slog.New(slog.DiscardHandler))
	if err != nil {
		t.Fatalf("newClient: %v", err)
	}
	if err := client.Start(t.Context()); err != nil {
		t.Fatalf("Start: %v", err)
	}
	t.Cleanup(func() {
		stopCtx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
		defer cancel()
		if err := client.Stop(stopCtx); err != nil {
			t.Errorf("Stop: %v", err)
		}
	})

	if _, err := client.Insert(t.Context(), pingArgs{}, nil); err != nil {
		t.Fatalf("Insert: %v", err)
	}
	select {
	case <-ran:
	case <-time.After(15 * time.Second):
		t.Fatal("enqueued job did not run within 15s")
	}
}
