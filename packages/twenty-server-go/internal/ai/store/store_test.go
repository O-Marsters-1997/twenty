package store_test

import (
	"errors"
	"testing"
	"time"

	"github.com/google/go-cmp/cmp"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/twentyhq/twenty/packages/twenty-server-go/internal/ai"
	"github.com/twentyhq/twenty/packages/twenty-server-go/internal/ai/store"
	"github.com/twentyhq/twenty/packages/twenty-server-go/internal/pgtest"
	"github.com/twentyhq/twenty/packages/twenty-server-go/internal/workspace"
)

func newStore(t *testing.T) (*store.Chats, *pgxpool.Pool) {
	t.Helper()
	pool, err := pgxpool.New(t.Context(), pgtest.New(t))
	if err != nil {
		t.Fatalf("connect: %v", err)
	}
	t.Cleanup(pool.Close)
	return store.New(pool), pool
}

func seedThread(t *testing.T, pool *pgxpool.Pool) string {
	t.Helper()
	var id string
	err := pool.QueryRow(t.Context(), `INSERT INTO "`+workspace.SchemaName()+`"."agentChatThread" ("lastActivityAt") VALUES (now()) RETURNING id::text`).Scan(&id)
	if err != nil {
		t.Fatalf("seed thread: %v", err)
	}
	return id
}

func seedMember(t *testing.T, pool *pgxpool.Pool) string {
	t.Helper()
	var id string
	err := pool.QueryRow(t.Context(), `INSERT INTO "`+workspace.SchemaName()+`"."workspaceMember" ("userId") VALUES (gen_random_uuid()) RETURNING id::text`).Scan(&id)
	if err != nil {
		t.Fatalf("seed member: %v", err)
	}
	return id
}

func publish(t *testing.T, chats *store.Chats, threadID string, chunks ...string) {
	t.Helper()
	for _, chunk := range chunks {
		if err := chats.SaveChunk(t.Context(), ai.ChatEvent{ThreadID: threadID, Event: []byte(chunk)}); err != nil {
			t.Fatalf("SaveChunk(%s) = %v", chunk, err)
		}
	}
}

func TestChats_SaveChunk(t *testing.T) {
	t.Parallel()
	messageID := uuid.NewString()

	t.Run("a finished turn is restored as one assistant message", func(t *testing.T) {
		t.Parallel()
		chats, pool := newStore(t)
		threadID := seedThread(t, pool)
		publish(t, chats, threadID,
			`{"type":"start","messageId":"`+messageID+`"}`,
			`{"type":"text-start","id":"t1"}`,
			`{"type":"text-delta","id":"t1","delta":"Hello "}`,
			`{"type":"text-delta","id":"t1","delta":"world"}`,
			`{"type":"text-end","id":"t1"}`,
			`{"type":"tool-input-start","toolCallId":"c1","toolName":"find_people"}`,
			`{"type":"tool-input-available","toolCallId":"c1","toolName":"find_people","input":{"query":"ada"}}`,
			`{"type":"tool-output-available","toolCallId":"c1","output":{"count":1}}`,
			`{"type":"finish"}`,
		)

		messages, err := chats.SettledMessages(t.Context(), threadID)
		if err != nil {
			t.Fatalf("SettledMessages() = %v", err)
		}
		if len(messages) != 1 || messages[0].ID != messageID || messages[0].Role != "assistant" || messages[0].ProcessedAt == nil {
			t.Fatalf("SettledMessages() = %+v, want one processed assistant message %s", messages, messageID)
		}
		type partSummary struct {
			Type, State, Text, Input, Output string
		}
		var got []partSummary
		for _, part := range messages[0].Parts {
			summary := partSummary{Type: part.Type, Input: string(part.ToolInput), Output: string(part.ToolOutput)}
			if part.TextContent != nil {
				summary.Text = *part.TextContent
			}
			if part.State != nil {
				summary.State = *part.State
			}
			got = append(got, summary)
		}
		want := []partSummary{
			{Type: "text", Text: "Hello world", Input: "null", Output: "null"},
			{Type: "tool-find_people", State: "output-available", Input: `{"query": "ada"}`, Output: `{"count": 1}`},
		}
		if diff := cmp.Diff(want, got); diff != "" {
			t.Errorf("parts (-want +got):\n%s", diff)
		}
	})

	t.Run("a turn in flight is left out of the saved messages", func(t *testing.T) {
		t.Parallel()
		chats, pool := newStore(t)
		threadID := seedThread(t, pool)
		publish(t, chats, threadID, `{"type":"start"}`, `{"type":"text-delta","id":"t1","delta":"partial"}`)

		messages, err := chats.SettledMessages(t.Context(), threadID)
		if err != nil || len(messages) != 0 {
			t.Errorf("SettledMessages() = %+v, %v, want none", messages, err)
		}
	})

	t.Run("a failed turn keeps its error", func(t *testing.T) {
		t.Parallel()
		chats, pool := newStore(t)
		threadID := seedThread(t, pool)
		publish(t, chats, threadID, `{"type":"start"}`, `{"type":"error","errorText":"model unavailable"}`)

		got, err := chats.LatestTurnError(t.Context(), threadID)
		if err != nil {
			t.Fatalf("LatestTurnError() = %v", err)
		}
		if diff := cmp.Diff(&ai.TurnError{Code: "STREAM_EXECUTION_FAILED", Message: "model unavailable"}, got); diff != "" {
			t.Errorf("LatestTurnError() (-want +got):\n%s", diff)
		}
		messages, err := chats.SettledMessages(t.Context(), threadID)
		if err != nil || len(messages) != 1 {
			t.Errorf("SettledMessages() = %+v, %v, want the failed message", messages, err)
		}
	})

	t.Run("a chunk with no turn in flight is ignored", func(t *testing.T) {
		t.Parallel()
		chats, pool := newStore(t)
		threadID := seedThread(t, pool)
		publish(t, chats, threadID, `{"type":"text-delta","id":"t1","delta":"orphan"}`)

		messages, err := chats.SettledMessages(t.Context(), threadID)
		if err != nil || len(messages) != 0 {
			t.Errorf("SettledMessages() = %+v, %v, want none", messages, err)
		}
	})
}

func TestChats_SettledMessages_UnknownThread(t *testing.T) {
	t.Parallel()
	chats, _ := newStore(t)
	if _, err := chats.SettledMessages(t.Context(), uuid.NewString()); !errors.Is(err, ai.ErrThreadNotFound) {
		t.Errorf("SettledMessages(unknown) error = %v, want %v", err, ai.ErrThreadNotFound)
	}
}

func TestChats_InboxState(t *testing.T) {
	t.Parallel()
	chats, pool := newStore(t)
	member := seedMember(t, pool)
	other := seedMember(t, pool)
	threadID := seedThread(t, pool)

	summary := func() ai.OpenThreadsSummary {
		t.Helper()
		got, err := chats.OpenThreadsSummary(t.Context(), member)
		if err != nil {
			t.Fatalf("OpenThreadsSummary() = %v", err)
		}
		return got
	}
	update := func(action ai.InboxAction, until *time.Time) []ai.ThreadParticipant {
		t.Helper()
		got, err := chats.UpdateInboxState(t.Context(), member, []string{threadID}, action, until)
		if err != nil {
			t.Fatalf("UpdateInboxState(%s) = %v", action, err)
		}
		return got
	}

	if diff := cmp.Diff(ai.OpenThreadsSummary{}, summary()); diff != "" {
		t.Errorf("summary before following (-want +got):\n%s", diff)
	}

	update(ai.InboxSubscribe, nil)
	update(ai.InboxUnread, nil)
	want := ai.OpenThreadsSummary{OpenThreadCount: 1, HasUnreadOpenThread: true}
	if diff := cmp.Diff(want, summary()); diff != "" {
		t.Errorf("summary of an unread followed thread (-want +got):\n%s", diff)
	}

	update(ai.InboxRead, nil)
	if got := summary(); got.HasUnreadOpenThread || got.OpenThreadCount != 1 {
		t.Errorf("summary after read = %+v, want open and read", got)
	}

	until := time.Now().Add(time.Hour)
	snoozed := update(ai.InboxSnooze, &until)
	if snoozed[0].ArchivedAt == nil || snoozed[0].SnoozedUntil == nil {
		t.Errorf("snoozed participant = %+v, want archived with a snooze", snoozed[0])
	}
	if got := summary(); got.OpenThreadCount != 0 {
		t.Errorf("summary while snoozed = %+v, want no open threads", got)
	}

	update(ai.InboxMoveToInbox, nil)
	if got := summary(); got.OpenThreadCount != 1 {
		t.Errorf("summary after moving back = %+v, want one open thread", got)
	}

	t.Run("snooze must end in the future", func(t *testing.T) {
		past := time.Now().Add(-time.Minute)
		if _, err := chats.UpdateInboxState(t.Context(), member, []string{threadID}, ai.InboxSnooze, &past); !errors.Is(err, ai.ErrSnoozeTimeNotInFuture) {
			t.Errorf("error = %v, want %v", err, ai.ErrSnoozeTimeNotInFuture)
		}
	})

	t.Run("an unknown thread is rejected", func(t *testing.T) {
		if _, err := chats.UpdateInboxState(t.Context(), member, []string{uuid.NewString()}, ai.InboxRead, nil); !errors.Is(err, ai.ErrThreadNotFound) {
			t.Errorf("error = %v, want %v", err, ai.ErrThreadNotFound)
		}
	})

	t.Run("an assignee cannot unsubscribe", func(t *testing.T) {
		if err := chats.Assign(t.Context(), other, threadID, &member); err != nil {
			t.Fatalf("Assign() = %v", err)
		}
		if got := summary(); !got.HasUnreadAssignedThread {
			t.Errorf("summary after assignment = %+v, want an unread assigned thread", got)
		}
		if _, err := chats.UpdateInboxState(t.Context(), member, []string{threadID}, ai.InboxUnsubscribe, nil); !errors.Is(err, ai.ErrAssigneeCannotUnsubscribe) {
			t.Errorf("error = %v, want %v", err, ai.ErrAssigneeCannotUnsubscribe)
		}
		if err := chats.Assign(t.Context(), other, threadID, nil); err != nil {
			t.Fatalf("Assign(nil) = %v", err)
		}
		update(ai.InboxUnsubscribe, nil)
	})

	t.Run("assigning an unknown thread is rejected", func(t *testing.T) {
		if err := chats.Assign(t.Context(), member, uuid.NewString(), &other); !errors.Is(err, ai.ErrThreadNotFound) {
			t.Errorf("error = %v, want %v", err, ai.ErrThreadNotFound)
		}
	})
}
