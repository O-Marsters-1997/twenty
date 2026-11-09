package messaging_test

import (
	"context"
	"errors"
	"slices"
	"testing"
	"time"

	"github.com/google/go-cmp/cmp"
	"github.com/riverqueue/river"

	"github.com/twentyhq/twenty/packages/twenty-server-go/internal/messaging"
)

type fakeSource struct {
	expiredFor messaging.SyncCursor
	messages   map[string]messaging.ImportedMessage
	lists      []messaging.SyncCursor
}

func (f *fakeSource) ListChanges(_ context.Context, _ messaging.ConnectedAccount, since messaging.SyncCursor) ([]string, messaging.SyncCursor, error) {
	f.lists = append(f.lists, since)
	if since != "" && since == f.expiredFor {
		return nil, "", messaging.ErrSyncCursorExpired
	}
	var ids []string
	for id := range f.messages {
		ids = append(ids, id)
	}
	slices.Sort(ids)
	return ids, "cursor-2", nil
}

func (f *fakeSource) FetchMessages(_ context.Context, _ messaging.ConnectedAccount, ids []string) ([]messaging.ImportedMessage, error) {
	var out []messaging.ImportedMessage
	for _, id := range ids {
		out = append(out, f.messages[id])
	}
	return out, nil
}

type fakeSyncStore struct {
	channel   messaging.Channel
	blocklist []string
	active    []string
	imported  []messaging.ImportedMessage
	cursor    messaging.SyncCursor
}

func (f *fakeSyncStore) Channel(_ context.Context, id string) (messaging.Channel, error) {
	if id != f.channel.ID {
		return messaging.Channel{}, messaging.ErrChannelNotFound
	}
	return f.channel, nil
}
func (f *fakeSyncStore) ActiveChannelIDs(context.Context) ([]string, error) { return f.active, nil }
func (f *fakeSyncStore) Blocklist(context.Context) ([]string, error)        { return f.blocklist, nil }
func (f *fakeSyncStore) Import(_ context.Context, _ string, messages []messaging.ImportedMessage, cursor messaging.SyncCursor) error {
	f.imported, f.cursor = messages, cursor
	return nil
}

func newSyncer(source *fakeSource, store *fakeSyncStore) *messaging.Syncer {
	return &messaging.Syncer{
		Source:   source,
		Accounts: &fakeAccounts{account: messaging.ConnectedAccount{ID: "acc", Handle: "me@example.com"}},
		Store:    store,
	}
}

func TestSyncer_Sync(t *testing.T) {
	t.Parallel()
	hello := messaging.ImportedMessage{ExternalID: "m1", From: "ann@example.com", To: []string{"me@example.com"}}
	spam := messaging.ImportedMessage{ExternalID: "m2", From: "bot@spam.test", To: []string{"me@example.com"}}
	named := messaging.ImportedMessage{ExternalID: "m3", From: "me@example.com", To: []string{"Bad@Example.org"}}

	t.Run("imports new messages and advances the cursor", func(t *testing.T) {
		t.Parallel()
		source := &fakeSource{messages: map[string]messaging.ImportedMessage{"m1": hello}}
		store := &fakeSyncStore{channel: messaging.Channel{ID: "ch", ConnectedAccountID: "acc", SyncCursor: "cursor-1"}}
		if err := newSyncer(source, store).Sync(t.Context(), "ch"); err != nil {
			t.Fatalf("Sync() = %v", err)
		}
		if diff := cmp.Diff([]messaging.ImportedMessage{hello}, store.imported); diff != "" {
			t.Errorf("imported (-want +got):\n%s", diff)
		}
		if store.cursor != "cursor-2" {
			t.Errorf("cursor = %q, want cursor-2", store.cursor)
		}
		if diff := cmp.Diff([]messaging.SyncCursor{"cursor-1"}, source.lists); diff != "" {
			t.Errorf("lists (-want +got):\n%s", diff)
		}
	})

	t.Run("an expired cursor triggers a full resync", func(t *testing.T) {
		t.Parallel()
		source := &fakeSource{expiredFor: "stale", messages: map[string]messaging.ImportedMessage{"m1": hello}}
		store := &fakeSyncStore{channel: messaging.Channel{ID: "ch", ConnectedAccountID: "acc", SyncCursor: "stale"}}
		if err := newSyncer(source, store).Sync(t.Context(), "ch"); err != nil {
			t.Fatalf("Sync() = %v", err)
		}
		if diff := cmp.Diff([]messaging.SyncCursor{"stale", ""}, source.lists); diff != "" {
			t.Errorf("lists (-want +got):\n%s", diff)
		}
		if len(store.imported) != 1 || store.cursor != "cursor-2" {
			t.Errorf("imported %d messages at cursor %q, want 1 at cursor-2", len(store.imported), store.cursor)
		}
	})

	t.Run("skips blocklisted addresses and domains", func(t *testing.T) {
		t.Parallel()
		source := &fakeSource{messages: map[string]messaging.ImportedMessage{"m1": hello, "m2": spam, "m3": named}}
		store := &fakeSyncStore{
			channel:   messaging.Channel{ID: "ch", ConnectedAccountID: "acc"},
			blocklist: []string{"@spam.test", "bad@example.org"},
		}
		if err := newSyncer(source, store).Sync(t.Context(), "ch"); err != nil {
			t.Fatalf("Sync() = %v", err)
		}
		if diff := cmp.Diff([]messaging.ImportedMessage{hello}, store.imported); diff != "" {
			t.Errorf("imported (-want +got):\n%s", diff)
		}
	})

	t.Run("an account that needs reconnecting is not synced", func(t *testing.T) {
		t.Parallel()
		store := &fakeSyncStore{channel: messaging.Channel{ID: "ch", ConnectedAccountID: "acc"}}
		syncer := newSyncer(&fakeSource{}, store)
		failedAt := time.Now()
		syncer.Accounts = &fakeAccounts{account: messaging.ConnectedAccount{ID: "acc", AuthFailedAt: &failedAt}}
		if err := syncer.Sync(t.Context(), "ch"); !errors.Is(err, messaging.ErrAccountAuthFailed) {
			t.Errorf("Sync() = %v, want ErrAccountAuthFailed", err)
		}
	})

	t.Run("errors", func(t *testing.T) {
		t.Parallel()
		store := &fakeSyncStore{channel: messaging.Channel{ID: "ch", ConnectedAccountID: "acc"}}
		if err := newSyncer(&fakeSource{}, store).Sync(t.Context(), "missing"); !errors.Is(err, messaging.ErrChannelNotFound) {
			t.Errorf("Sync(missing) = %v, want ErrChannelNotFound", err)
		}
	})
}

func TestEnqueueMessageSyncsWorker_Work(t *testing.T) {
	t.Parallel()
	var queued []river.JobArgs
	worker := &messaging.EnqueueMessageSyncsWorker{
		Store: &fakeSyncStore{active: []string{"a", "b"}},
		Queue: func(_ context.Context, args river.JobArgs) error { queued = append(queued, args); return nil },
	}
	if err := worker.Work(t.Context(), nil); err != nil {
		t.Fatalf("Work() = %v", err)
	}
	want := []river.JobArgs{messaging.SyncMessageChannelArgs{ChannelID: "a"}, messaging.SyncMessageChannelArgs{ChannelID: "b"}}
	if diff := cmp.Diff(want, queued); diff != "" {
		t.Errorf("queued (-want +got):\n%s", diff)
	}
}
