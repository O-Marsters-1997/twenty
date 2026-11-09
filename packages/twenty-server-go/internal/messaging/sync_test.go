package messaging_test

import (
	"context"
	"errors"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/google/go-cmp/cmp"
	"github.com/riverqueue/river"
	"github.com/riverqueue/river/rivertype"

	"github.com/twentyhq/twenty/packages/twenty-server-go/internal/messaging"
)

type fakeChannels struct {
	channel messaging.CalendarChannel
	active  []string
	events  []messaging.ImportedEvent
	cursor  messaging.SyncCursor
	applied bool
}

func (f *fakeChannels) Get(context.Context, string) (messaging.CalendarChannel, error) {
	return f.channel, nil
}

func (f *fakeChannels) ActiveIDs(context.Context) ([]string, error) { return f.active, nil }

func (f *fakeChannels) Apply(_ context.Context, _ string, events []messaging.ImportedEvent, cursor messaging.SyncCursor) error {
	f.events, f.cursor, f.applied = events, cursor, true
	return nil
}

type fakeSource struct {
	events []messaging.ImportedEvent
	next   messaging.SyncCursor
	err    error
	since  []messaging.SyncCursor
}

func (f *fakeSource) ListChanges(_ context.Context, _ messaging.ConnectedAccount, since messaging.SyncCursor) ([]messaging.ImportedEvent, messaging.SyncCursor, error) {
	f.since = append(f.since, since)
	if f.err != nil && since != "" {
		return nil, "", f.err
	}
	return f.events, f.next, nil
}

func TestCalendarSyncer_SyncChannel(t *testing.T) {
	t.Parallel()
	events := []messaging.ImportedEvent{
		{ExternalID: "e1", Title: "Standup", StartsAt: time.Unix(100, 0), Participants: []string{"a@example.com"}},
		{ExternalID: "e2", IsCanceled: true},
		{ExternalID: "e3", IsFullDay: true},
	}
	newSyncer := func(source *fakeSource, accounts *fakeAccounts) (*messaging.CalendarSyncer, *fakeChannels) {
		channels := &fakeChannels{channel: messaging.CalendarChannel{ID: "ch-1", ConnectedAccountID: "acc-1", Cursor: "old"}}
		return &messaging.CalendarSyncer{Channels: channels, Accounts: accounts, Source: source}, channels
	}

	t.Run("imports changes and advances the cursor", func(t *testing.T) {
		t.Parallel()
		source := &fakeSource{events: events, next: "new"}
		syncer, channels := newSyncer(source, newAccounts())
		if err := syncer.SyncChannel(t.Context(), "ch-1"); err != nil {
			t.Fatalf("SyncChannel: %v", err)
		}
		if diff := cmp.Diff(events, channels.events); diff != "" {
			t.Errorf("applied events (-want +got):\n%s", diff)
		}
		if channels.cursor != "new" {
			t.Errorf("cursor = %q, want new", channels.cursor)
		}
		if diff := cmp.Diff([]messaging.SyncCursor{"old"}, source.since); diff != "" {
			t.Errorf("since (-want +got):\n%s", diff)
		}
	})

	t.Run("restarts from scratch when the cursor expired", func(t *testing.T) {
		t.Parallel()
		source := &fakeSource{events: events, next: "fresh", err: messaging.ErrSyncCursorExpired}
		syncer, channels := newSyncer(source, newAccounts())
		if err := syncer.SyncChannel(t.Context(), "ch-1"); err != nil {
			t.Fatalf("SyncChannel: %v", err)
		}
		if diff := cmp.Diff([]messaging.SyncCursor{"old", ""}, source.since); diff != "" {
			t.Errorf("since (-want +got):\n%s", diff)
		}
		if channels.cursor != "fresh" {
			t.Errorf("cursor = %q, want fresh", channels.cursor)
		}
	})

	t.Run("source failures leave the channel untouched", func(t *testing.T) {
		t.Parallel()
		boom := errors.New("boom")
		syncer, channels := newSyncer(&fakeSource{err: boom}, newAccounts())
		if err := syncer.SyncChannel(t.Context(), "ch-1"); !errors.Is(err, boom) {
			t.Errorf("SyncChannel error = %v, want boom", err)
		}
		if channels.applied {
			t.Error("Apply called after a failed fetch")
		}
	})

	t.Run("a failed account is not synced", func(t *testing.T) {
		t.Parallel()
		accounts := newAccounts()
		_ = accounts.MarkAuthFailed(t.Context(), "acc-1")
		source := &fakeSource{}
		syncer, _ := newSyncer(source, accounts)
		if err := syncer.SyncChannel(t.Context(), "ch-1"); !errors.Is(err, messaging.ErrAccountAuthFailed) {
			t.Errorf("SyncChannel error = %v, want ErrAccountAuthFailed", err)
		}
		if len(source.since) != 0 {
			t.Error("source called for a failed account")
		}
	})
}

func TestEnqueueCalendarSyncWorker_Work(t *testing.T) {
	t.Parallel()
	var queued []river.JobArgs
	worker := &messaging.EnqueueCalendarSyncWorker{
		Channels: &fakeChannels{active: []string{"ch-1", "ch-2"}},
		Queue: func(_ context.Context, args river.JobArgs) error {
			queued = append(queued, args)
			return nil
		},
	}
	if err := worker.Work(t.Context(), &river.Job[messaging.EnqueueCalendarSyncArgs]{JobRow: &rivertype.JobRow{}}); err != nil {
		t.Fatalf("Work: %v", err)
	}
	want := []river.JobArgs{messaging.SyncCalendarChannelArgs{ChannelID: "ch-1"}, messaging.SyncCalendarChannelArgs{ChannelID: "ch-2"}}
	if diff := cmp.Diff(want, queued); diff != "" {
		t.Errorf("queued (-want +got):\n%s", diff)
	}
}

func TestSyncCalendarChannelWorker_Work(t *testing.T) {
	t.Parallel()
	accounts := newAccounts()
	_ = accounts.MarkAuthFailed(t.Context(), "acc-1")
	worker := &messaging.SyncCalendarChannelWorker{Syncer: &messaging.CalendarSyncer{
		Channels: &fakeChannels{channel: messaging.CalendarChannel{ID: "ch-1", ConnectedAccountID: "acc-1"}},
		Accounts: accounts, Source: &fakeSource{},
	}}
	err := worker.Work(t.Context(), &river.Job[messaging.SyncCalendarChannelArgs]{Args: messaging.SyncCalendarChannelArgs{ChannelID: "ch-1"}, JobRow: &rivertype.JobRow{}})
	var cancel *river.JobCancelError
	if !errors.As(err, &cancel) {
		t.Errorf("Work error = %v, want a cancelled job", err)
	}
}

func TestGoogleCalendar_ListChanges(t *testing.T) {
	t.Parallel()
	pages := map[string]string{
		"": `{"items":[{"id":"e1","status":"confirmed","summary":"Standup","start":{"dateTime":"2026-01-02T09:00:00Z"},"end":{"dateTime":"2026-01-02T09:15:00Z"},
			"attendees":[{"email":"A@Example.com"}],"conferenceData":{"entryPoints":[{"uri":"https://meet.example/x"}]}}],"nextPageToken":"p2"}`,
		"p2": `{"items":[{"id":"e2","status":"cancelled"},{"id":"e3","status":"confirmed","start":{"date":"2026-01-03"},"end":{"date":"2026-01-04"}}],"nextSyncToken":"sync-2"}`,
	}
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.Header.Get("Authorization") != "Bearer old" {
			http.Error(w, "unauthorized", http.StatusUnauthorized)
			return
		}
		if r.URL.Query().Get("syncToken") == "stale" {
			http.Error(w, "gone", http.StatusGone)
			return
		}
		_, _ = w.Write([]byte(pages[r.URL.Query().Get("pageToken")]))
	}))
	t.Cleanup(server.Close)
	calendar := messaging.NewGoogleCalendar(newAccounts(), messaging.GmailConfig{APIURL: server.URL})
	account := messaging.ConnectedAccount{ID: "acc-1", AccessToken: "old"}

	t.Run("pages, cancellations, full-day and participants", func(t *testing.T) {
		got, cursor, err := calendar.ListChanges(t.Context(), account, "sync-1")
		if err != nil {
			t.Fatalf("ListChanges: %v", err)
		}
		want := []messaging.ImportedEvent{
			{ExternalID: "e1", Title: "Standup", ConferenceLink: "https://meet.example/x", Participants: []string{"a@example.com"},
				StartsAt: time.Date(2026, 1, 2, 9, 0, 0, 0, time.UTC), EndsAt: time.Date(2026, 1, 2, 9, 15, 0, 0, time.UTC)},
			{ExternalID: "e2", IsCanceled: true},
			{ExternalID: "e3", IsFullDay: true, StartsAt: time.Date(2026, 1, 3, 0, 0, 0, 0, time.UTC), EndsAt: time.Date(2026, 1, 4, 0, 0, 0, 0, time.UTC)},
		}
		if diff := cmp.Diff(want, got); diff != "" {
			t.Errorf("events (-want +got):\n%s", diff)
		}
		if cursor != "sync-2" {
			t.Errorf("cursor = %q, want sync-2", cursor)
		}
	})

	t.Run("an expired sync token", func(t *testing.T) {
		if _, _, err := calendar.ListChanges(t.Context(), account, "stale"); !errors.Is(err, messaging.ErrSyncCursorExpired) {
			t.Errorf("ListChanges error = %v, want ErrSyncCursorExpired", err)
		}
	})
}
