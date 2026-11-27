package eventstream_test

import (
	"context"
	"encoding/json"
	"errors"
	"testing"
	"time"

	"github.com/google/go-cmp/cmp"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/twentyhq/twenty/packages/twenty-server-go/internal/eventstream"
	"github.com/twentyhq/twenty/packages/twenty-server-go/internal/pgtest"
	"github.com/twentyhq/twenty/packages/twenty-server-go/internal/records"
	"github.com/twentyhq/twenty/packages/twenty-server-go/internal/workspace"
)

const workspaceID = "20202020-1c25-4d02-bf25-6aeccf7ea419"

var (
	alice = eventstream.Owner{UserWorkspaceID: "alice"}
	bob   = eventstream.Owner{UserWorkspaceID: "bob"}
)

func receive(t *testing.T, stream *eventstream.Stream) []eventstream.EventWithQueryIDs {
	t.Helper()
	select {
	case batch := <-stream.Events():
		return batch
	case <-time.After(5 * time.Second):
		t.Fatal("no batch received")
		return nil
	}
}

func TestHub_Publish(t *testing.T) {
	t.Parallel()
	hub := eventstream.NewHub()
	stream, err := hub.Open(workspaceID, "s1", alice)
	if err != nil {
		t.Fatal(err)
	}
	for queryID, object := range map[string]string{"q-person": "person", "q-company": "company"} {
		if ok, err := hub.AddQuery(workspaceID, "s1", alice, queryID, map[string]any{"objectNameSingular": object}); !ok || err != nil {
			t.Fatalf("AddQuery(%s) = %v, %v", queryID, ok, err)
		}
	}
	hub.Publish(workspaceID, eventstream.Event{Action: "created", ObjectNameSingular: "person", RecordID: "p1"})
	hub.Publish(workspaceID, eventstream.Event{Action: "created", ObjectNameSingular: "note", RecordID: "n1"})
	hub.Publish("other-workspace", eventstream.Event{Action: "created", ObjectNameSingular: "person", RecordID: "p2"})

	batch := receive(t, stream)
	if len(batch) != 1 || batch[0].ObjectRecordEvent.RecordID != "p1" {
		t.Fatalf("batch = %+v, want only person p1", batch)
	}
	if diff := cmp.Diff([]string{"q-person"}, batch[0].QueryIDs); diff != "" {
		t.Errorf("QueryIDs (-want +got):\n%s", diff)
	}
	if ok, err := hub.RemoveQuery(workspaceID, "s1", alice, "q-person"); !ok || err != nil {
		t.Fatalf("RemoveQuery = %v, %v", ok, err)
	}
	hub.Publish(workspaceID, eventstream.Event{ObjectNameSingular: "person", RecordID: "p3"})
	select {
	case batch := <-stream.Events():
		t.Errorf("received %+v after the query was removed", batch)
	default:
	}
}

func TestHub_Authorization(t *testing.T) {
	t.Parallel()
	hub := eventstream.NewHub()
	if _, err := hub.Open(workspaceID, "s1", alice); err != nil {
		t.Fatal(err)
	}
	if _, err := hub.Open(workspaceID, "s1", bob); !errors.Is(err, eventstream.ErrStreamExists) {
		t.Errorf("Open by another user = %v, want ErrStreamExists", err)
	}
	if _, err := hub.AddQuery(workspaceID, "s1", bob, "q", nil); !errors.Is(err, eventstream.ErrNotAuthorized) {
		t.Errorf("AddQuery by another user = %v, want ErrNotAuthorized", err)
	}
	if _, err := hub.RemoveQuery(workspaceID, "s1", bob, "q"); !errors.Is(err, eventstream.ErrNotAuthorized) {
		t.Errorf("RemoveQuery by another user = %v, want ErrNotAuthorized", err)
	}
	if ok, err := hub.AddQuery(workspaceID, "missing", alice, "q", nil); ok || err != nil {
		t.Errorf("AddQuery on a missing stream = %v, %v, want false, nil", ok, err)
	}
}

func TestHub_OpenReplacesOwnStream(t *testing.T) {
	t.Parallel()
	hub := eventstream.NewHub()
	first, err := hub.Open(workspaceID, "s1", alice)
	if err != nil {
		t.Fatal(err)
	}
	if _, err := hub.Open(workspaceID, "s1", alice); err != nil {
		t.Fatal(err)
	}
	if _, open := <-first.Events(); open {
		t.Error("replaced stream still open")
	}
	first.Close()
	if ok, _ := hub.AddQuery(workspaceID, "s1", alice, "q", nil); !ok {
		t.Error("closing the replaced stream removed its replacement")
	}
}

func TestFromRecordEvent_Updated(t *testing.T) {
	t.Parallel()
	got := eventstream.FromRecordEvent(records.RecordEvent{
		Object: "person", Kind: records.EventUpdated, RecordID: "p1",
		Before: json.RawMessage(`{"city":"Paris","name":"Ann"}`), After: json.RawMessage(`{"city":"Rome","name":"Ann"}`),
	})
	if diff := cmp.Diff([]string{"city"}, got.Properties.UpdatedFields); diff != "" {
		t.Errorf("UpdatedFields (-want +got):\n%s", diff)
	}
	if want := `{"after":"Rome","before":"Paris"}`; string(got.Properties.Diff["city"]) != want {
		t.Errorf("Diff[city] = %s, want %s", got.Properties.Diff["city"], want)
	}
}

func TestNotifyPublisher_DeliversOnCommit(t *testing.T) {
	t.Parallel()
	pool, err := pgxpool.New(t.Context(), pgtest.New(t))
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(pool.Close)
	hub := eventstream.NewHub()
	ctx, cancel := context.WithCancel(t.Context())
	t.Cleanup(cancel)
	go eventstream.Listen(ctx, pool, hub, nilLogger())

	stream, err := hub.Open(workspace.PinnedWorkspaceID, "s1", alice)
	if err != nil {
		t.Fatal(err)
	}
	if _, err := hub.AddQuery(workspace.PinnedWorkspaceID, "s1", alice, "q", map[string]any{"objectNameSingular": "person"}); err != nil {
		t.Fatal(err)
	}
	publisher := eventstream.NewNotifyPublisher(noopPublisher{})
	event := records.RecordEvent{Object: "person", Kind: records.EventCreated, RecordID: "p1", After: json.RawMessage(`{"id":"p1"}`)}
	deadline := time.Now().Add(5 * time.Second)
	for time.Now().Before(deadline) {
		if err := pgx.BeginFunc(t.Context(), pool, func(tx pgx.Tx) error { return publisher.Publish(t.Context(), tx, event) }); err != nil {
			t.Fatal(err)
		}
		select {
		case batch := <-stream.Events():
			if batch[0].ObjectRecordEvent.RecordID != "p1" || string(batch[0].ObjectRecordEvent.Properties.After) != `{"id":"p1"}` {
				t.Errorf("batch = %+v", batch)
			}
			return
		case <-time.After(200 * time.Millisecond):
		}
	}
	t.Fatal("no event delivered after commit")
}
