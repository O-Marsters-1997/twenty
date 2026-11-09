package store_test

import (
	"context"
	"errors"
	"testing"
	"time"

	"github.com/google/go-cmp/cmp"
	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/twentyhq/twenty/packages/twenty-server-go/internal/messaging"
	"github.com/twentyhq/twenty/packages/twenty-server-go/internal/messaging/store"
	"github.com/twentyhq/twenty/packages/twenty-server-go/internal/pgtest"
)

func newCalendarPool(t *testing.T) *pgxpool.Pool {
	t.Helper()
	pool, err := pgxpool.New(t.Context(), pgtest.New(t))
	if err != nil {
		t.Fatalf("connect: %v", err)
	}
	t.Cleanup(pool.Close)
	return pool
}

func seedChannel(t *testing.T, pool *pgxpool.Pool, syncEnabled, authFailed bool) string {
	t.Helper()
	tx, err := pool.Begin(t.Context())
	if err != nil {
		t.Fatalf("begin: %v", err)
	}
	t.Cleanup(func() { _ = tx.Rollback(context.Background()) })
	if _, err := tx.Exec(t.Context(), `SET LOCAL session_replication_role = replica`); err != nil {
		t.Fatalf("disable foreign keys: %v", err)
	}
	var id string
	err = tx.QueryRow(t.Context(), `WITH account AS (
			INSERT INTO core."connectedAccount" ("workspaceId", handle, provider, "userWorkspaceId", "authFailedAt")
			VALUES (gen_random_uuid(), 'me@example.com', 'google', gen_random_uuid(), CASE WHEN $2 THEN now() END) RETURNING id, "workspaceId")
		INSERT INTO core."calendarChannel" ("workspaceId", handle, "syncStage", visibility, "isSyncEnabled", "connectedAccountId", "syncCursor")
		SELECT "workspaceId", 'me@example.com', 'PENDING_CONFIGURATION', 'SHARE_EVERYTHING', $1, id, 'old' FROM account RETURNING id::text`,
		syncEnabled, authFailed).Scan(&id)
	if err != nil {
		t.Fatalf("seed channel: %v", err)
	}
	if err := tx.Commit(t.Context()); err != nil {
		t.Fatalf("commit: %v", err)
	}
	return id
}

type storedEvent struct {
	Title                        string
	IsCanceled, IsFullDay        bool
	StartsAt                     *time.Time
	ConferenceLink               *string
	Participants                 []string
	EventCount, AssociationCount int
}

func readEvent(t *testing.T, pool *pgxpool.Pool, externalID string) storedEvent {
	t.Helper()
	var got storedEvent
	err := pool.QueryRow(t.Context(), `SELECT e.title, e."isCanceled", e."isFullDay", e."startsAt", e."conferenceLinkPrimaryLinkUrl",
			coalesce((SELECT array_agg(handle ORDER BY handle) FROM workspace_2abogkkt2zd45pa9aun09djpf."calendarEventParticipant" p WHERE p."calendarEventId" = e.id), '{}'),
			(SELECT count(*) FROM workspace_2abogkkt2zd45pa9aun09djpf."calendarEvent"),
			(SELECT count(*) FROM workspace_2abogkkt2zd45pa9aun09djpf."calendarChannelEventAssociation")
		FROM workspace_2abogkkt2zd45pa9aun09djpf."calendarChannelEventAssociation" a
		JOIN workspace_2abogkkt2zd45pa9aun09djpf."calendarEvent" e ON e.id = a."calendarEventId"
		WHERE a."eventExternalId" = $1`, externalID).
		Scan(&got.Title, &got.IsCanceled, &got.IsFullDay, &got.StartsAt, &got.ConferenceLink, &got.Participants, &got.EventCount, &got.AssociationCount)
	if err != nil {
		t.Fatalf("read event %s: %v", externalID, err)
	}
	return got
}

func TestCalendarChannels_Apply(t *testing.T) {
	t.Parallel()
	pool := newCalendarPool(t)
	channels := store.NewCalendarChannels(pool)
	id := seedChannel(t, pool, true, false)
	start := time.Date(2026, 1, 2, 9, 0, 0, 0, time.UTC)
	link := "https://meet.example/x"

	first := []messaging.ImportedEvent{
		{ExternalID: "e1", Title: "Standup", StartsAt: start, EndsAt: start.Add(time.Hour), ConferenceLink: link, Participants: []string{"a@example.com", "b@example.com"}},
		{ExternalID: "e2", Title: "Offsite", IsFullDay: true},
	}
	if err := channels.Apply(t.Context(), id, first, "next-1"); err != nil {
		t.Fatalf("Apply: %v", err)
	}
	want := storedEvent{Title: "Standup", StartsAt: &start, ConferenceLink: &link,
		Participants: []string{"a@example.com", "b@example.com"}, EventCount: 2, AssociationCount: 2}
	if diff := cmp.Diff(want, readEvent(t, pool, "e1")); diff != "" {
		t.Errorf("e1 after first sync (-want +got):\n%s", diff)
	}
	if got := readEvent(t, pool, "e2"); !got.IsFullDay {
		t.Errorf("e2 = %+v, want full day", got)
	}

	second := []messaging.ImportedEvent{
		{ExternalID: "e1", Title: "Standup (moved)", StartsAt: start, Participants: []string{"b@example.com"}},
	}
	if err := channels.Apply(t.Context(), id, second, "next-2"); err != nil {
		t.Fatalf("Apply again: %v", err)
	}
	got := readEvent(t, pool, "e1")
	if got.Title != "Standup (moved)" || got.EventCount != 2 || got.AssociationCount != 2 {
		t.Errorf("e1 after changed sync = %+v", got)
	}
	if diff := cmp.Diff([]string{"b@example.com"}, got.Participants); diff != "" {
		t.Errorf("participants (-want +got):\n%s", diff)
	}

	cancellations := []messaging.ImportedEvent{{ExternalID: "e1", IsCanceled: true}, {ExternalID: "never-seen", IsCanceled: true}}
	if err := channels.Apply(t.Context(), id, cancellations, "next-3"); err != nil {
		t.Fatalf("Apply cancellations: %v", err)
	}
	got = readEvent(t, pool, "e1")
	if !got.IsCanceled || got.Title != "Standup (moved)" || got.EventCount != 2 {
		t.Errorf("e1 after cancellation = %+v, want canceled with details kept and no row for the unknown event", got)
	}

	channel, err := channels.Get(t.Context(), id)
	if err != nil || channel.Cursor != "next-3" {
		t.Errorf("Get = %+v, %v; want cursor next-3", channel, err)
	}
}

func TestCalendarChannels_ActiveIDs(t *testing.T) {
	t.Parallel()
	pool := newCalendarPool(t)
	channels := store.NewCalendarChannels(pool)
	active := seedChannel(t, pool, true, false)
	seedChannel(t, pool, false, false)
	seedChannel(t, pool, true, true)

	got, err := channels.ActiveIDs(t.Context())
	if err != nil {
		t.Fatalf("ActiveIDs: %v", err)
	}
	if diff := cmp.Diff([]string{active}, got); diff != "" {
		t.Errorf("ActiveIDs (-want +got):\n%s", diff)
	}
}

func TestCalendarChannels_NotFound(t *testing.T) {
	t.Parallel()
	channels := store.NewCalendarChannels(newCalendarPool(t))
	missing := "00000000-0000-0000-0000-000000000000"
	if _, err := channels.Get(t.Context(), missing); !errors.Is(err, store.ErrNotFound) {
		t.Errorf("Get(missing) error = %v, want ErrNotFound", err)
	}
	if err := channels.Apply(t.Context(), missing, nil, "x"); !errors.Is(err, store.ErrNotFound) {
		t.Errorf("Apply(missing) error = %v, want ErrNotFound", err)
	}
}
