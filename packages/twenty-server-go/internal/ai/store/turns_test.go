package store_test

import (
	"encoding/json"
	"errors"
	"testing"

	"github.com/google/go-cmp/cmp"
	"github.com/google/uuid"

	"github.com/twentyhq/twenty/packages/twenty-server-go/internal/ai"
)

func TestChats_Conversation(t *testing.T) {
	t.Parallel()
	chats, pool := newStore(t)
	threadID := seedThread(t, pool)
	if err := chats.AddMessage(t.Context(), ai.NewMessage{ID: uuid.NewString(), ThreadID: threadID, Text: "find Ada"}); err != nil {
		t.Fatal(err)
	}
	if err := chats.AddMessage(t.Context(), ai.NewMessage{ID: uuid.NewString(), ThreadID: threadID, Text: "queued", Queued: true}); err != nil {
		t.Fatal(err)
	}
	publish(t, chats, threadID,
		`{"type":"start","messageId":"`+uuid.NewString()+`"}`,
		`{"type":"text-start","id":"t1"}`,
		`{"type":"text-delta","id":"t1","delta":"Looking"}`,
		`{"type":"tool-input-available","toolCallId":"c1","toolName":"find_people","input":{"q":"Ada"}}`,
		`{"type":"tool-output-available","toolCallId":"c1","output":{"count":1}}`,
		`{"type":"tool-input-available","toolCallId":"c2","toolName":"find_people","input":{}}`,
		`{"type":"finish"}`,
	)

	got, err := chats.Conversation(t.Context(), threadID)
	if err != nil {
		t.Fatal(err)
	}
	want := []ai.Message{
		{Role: ai.RoleUser, Parts: []ai.Part{{Type: ai.PartText, Text: "find Ada"}}},
		{Role: ai.RoleAssistant, Parts: []ai.Part{
			{Type: ai.PartText, Text: "Looking"},
			{Type: ai.PartToolCall, ToolCallID: "c1", ToolName: "find_people", Input: json.RawMessage(`{"q": "Ada"}`)},
		}},
		{Role: ai.RoleTool, Parts: []ai.Part{{Type: ai.PartToolResult, ToolCallID: "c1", ToolName: "find_people", Output: json.RawMessage(`{"count": 1}`)}}},
	}
	if diff := cmp.Diff(want, got); diff != "" {
		t.Errorf("Conversation() (-want +got):\n%s", diff)
	}
}

func TestChats_QueuedMessages(t *testing.T) {
	t.Parallel()
	chats, pool := newStore(t)
	threadID := seedThread(t, pool)
	first, second := uuid.NewString(), uuid.NewString()
	for _, id := range []string{first, second} {
		if err := chats.AddMessage(t.Context(), ai.NewMessage{ID: id, ThreadID: threadID, Text: id, Queued: true}); err != nil {
			t.Fatal(err)
		}
	}

	gotThread, err := chats.QueuedMessageThread(t.Context(), first)
	if err != nil || gotThread != threadID {
		t.Fatalf("QueuedMessageThread() = %q, %v, want %q", gotThread, err, threadID)
	}
	if deleted, err := chats.DeleteQueuedMessage(t.Context(), first); err != nil || !deleted {
		t.Fatalf("DeleteQueuedMessage() = %v, %v, want true", deleted, err)
	}
	if _, err := chats.QueuedMessageThread(t.Context(), first); !errors.Is(err, ai.ErrMessageNotFound) {
		t.Errorf("QueuedMessageThread(deleted) error = %v, want ErrMessageNotFound", err)
	}
	if promoted, err := chats.PromoteQueuedMessage(t.Context(), threadID); err != nil || !promoted {
		t.Fatalf("PromoteQueuedMessage() = %v, %v, want true", promoted, err)
	}
	if promoted, err := chats.PromoteQueuedMessage(t.Context(), threadID); err != nil || promoted {
		t.Errorf("PromoteQueuedMessage() with nothing queued = %v, %v, want false", promoted, err)
	}
	got, err := chats.Conversation(t.Context(), threadID)
	if err != nil || len(got) != 1 || got[0].Parts[0].Text != second {
		t.Errorf("Conversation() = %v, %v, want only the promoted message", got, err)
	}
}

func TestChats_DiscardFailedTurn(t *testing.T) {
	t.Parallel()
	chats, pool := newStore(t)
	threadID := seedThread(t, pool)

	if err := chats.DiscardFailedTurn(t.Context(), threadID); !errors.Is(err, ai.ErrNoFailedTurn) {
		t.Errorf("DiscardFailedTurn() before any turn = %v, want ErrNoFailedTurn", err)
	}
	publish(t, chats, threadID,
		`{"type":"start","messageId":"`+uuid.NewString()+`"}`,
		`{"type":"text-delta","id":"t1","delta":"partial"}`,
		`{"type":"error","errorText":"boom"}`,
	)
	if err := chats.DiscardFailedTurn(t.Context(), threadID); err != nil {
		t.Fatalf("DiscardFailedTurn() = %v", err)
	}
	messages, err := chats.SettledMessages(t.Context(), threadID)
	if err != nil || len(messages) != 0 {
		t.Errorf("SettledMessages() after discard = %v, %v, want none", messages, err)
	}
}
