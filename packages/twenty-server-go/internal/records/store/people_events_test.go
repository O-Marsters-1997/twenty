package store_test

import (
	"context"
	"errors"
	"testing"

	"github.com/google/go-cmp/cmp"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/riverqueue/river"
	"github.com/riverqueue/river/riverdriver/riverpgxv5"

	"github.com/twentyhq/twenty/packages/twenty-server-go/internal/records"
	"github.com/twentyhq/twenty/packages/twenty-server-go/internal/records/store"
)

type failingPublisher struct{}

var errPublish = errors.New("publish failed")

func (failingPublisher) Publish(context.Context, pgx.Tx, records.RecordEvent) error {
	return errPublish
}

func newEventPeople(t *testing.T, failing bool) (*store.People, *pgxpool.Pool) {
	t.Helper()
	pool := newPool(t)
	client, err := river.NewClient(riverpgxv5.New(pool), &river.Config{})
	if err != nil {
		t.Fatalf("river client: %v", err)
	}
	var publisher records.EventPublisher = records.NewRiverPublisher(client)
	if failing {
		publisher = failingPublisher{}
	}
	return store.NewPeople(pool).WithEvents(publisher), pool
}

func eventKinds(t *testing.T, pool *pgxpool.Pool) []records.EventKind {
	t.Helper()
	rows, err := pool.Query(t.Context(), `SELECT args->'event'->>'kind' FROM river_job WHERE kind = 'record_event' ORDER BY id`)
	if err != nil {
		t.Fatalf("query jobs: %v", err)
	}
	kinds, err := pgx.CollectRows(rows, pgx.RowTo[records.EventKind])
	if err != nil {
		t.Fatalf("read jobs: %v", err)
	}
	return kinds
}

func TestPeople_RecordEvents(t *testing.T) {
	t.Parallel()

	t.Run("each write enqueues its event in order", func(t *testing.T) {
		t.Parallel()
		people, pool := newEventPeople(t, false)
		person := create(t, people, "Ada", "Lovelace", "ada@example.com")
		title := "Engineer"
		if _, err := people.Update(t.Context(), actor, person.ID, records.PersonInput{JobTitle: &title}); err != nil {
			t.Fatalf("Update() = %v", err)
		}
		for _, write := range []func(context.Context, string) error{people.SoftDelete, people.Restore, people.Destroy} {
			if err := write(t.Context(), person.ID); err != nil {
				t.Fatalf("write = %v", err)
			}
		}

		want := []records.EventKind{records.EventCreated, records.EventUpdated, records.EventDeleted, records.EventRestored, records.EventDestroyed}
		if diff := cmp.Diff(want, eventKinds(t, pool)); diff != "" {
			t.Errorf("event kinds (-want +got):\n%s", diff)
		}
	})

	t.Run("a failed publish rolls the write back", func(t *testing.T) {
		t.Parallel()
		people, pool := newEventPeople(t, true)
		_, err := people.Create(t.Context(), actor, records.PersonInput{Name: &records.FullName{FirstName: "Ada"}})
		if !errors.Is(err, errPublish) {
			t.Fatalf("Create() error = %v, want %v", err, errPublish)
		}
		page, err := store.NewPeople(pool).Find(t.Context(), records.Filter{}, nil, records.PageRequest{})
		if err != nil {
			t.Fatalf("Find() = %v", err)
		}
		if page.TotalCount != 0 {
			t.Errorf("people after rollback = %d, want 0", page.TotalCount)
		}
		if got := eventKinds(t, pool); len(got) != 0 {
			t.Errorf("jobs after rollback = %v, want none", got)
		}
	})
}
