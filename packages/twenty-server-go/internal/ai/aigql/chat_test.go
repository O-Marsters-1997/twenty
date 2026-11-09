package aigql_test

import (
	"bytes"
	"context"
	"encoding/json"
	"io"
	"log/slog"
	"net/http"
	"net/http/httptest"
	"net/url"
	"slices"
	"testing"

	"github.com/google/go-cmp/cmp"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/twentyhq/twenty/packages/twenty-server-go/internal/ai"
	"github.com/twentyhq/twenty/packages/twenty-server-go/internal/ai/aigql"
	"github.com/twentyhq/twenty/packages/twenty-server-go/internal/ai/store"
	"github.com/twentyhq/twenty/packages/twenty-server-go/internal/auth"
	"github.com/twentyhq/twenty/packages/twenty-server-go/internal/frontdoor"
	"github.com/twentyhq/twenty/packages/twenty-server-go/internal/pgtest"
	"github.com/twentyhq/twenty/packages/twenty-server-go/internal/workspace"
)

const (
	getChatMessages = `query GetChatMessages($threadId: UUID!) {
  chatMessages(threadId: $threadId) {
    id threadId turnId senderWorkspaceMemberId role status createdAt processedAt
    parts { id messageId orderIndex type textContent reasoningContent toolName toolCallId toolInput toolOutput state providerExecuted errorMessage
      sourceUrlSourceId sourceUrlUrl sourceUrlTitle sourceDocumentSourceId sourceDocumentMediaType sourceDocumentTitle sourceDocumentFilename
      fileMediaType fileFilename fileUrl fileId providerMetadata createdAt }
  }
  chatStreamCatchupChunks(threadId: $threadId) { chunks maxSeq error { code message } }
}`
	getSummary = `query GetAgentChatOpenThreadsSummary { agentChatOpenThreadsSummary { openThreadCount needsInputThreadCount hasUnreadOpenThread hasUnreadMentionThread hasUnreadAssignedThread } }`
	assign     = `mutation AssignAgentChatThread($threadId: UUID!, $assigneeWorkspaceMemberId: UUID) { assignAgentChatThread(threadId: $threadId, assigneeWorkspaceMemberId: $assigneeWorkspaceMemberId) }`
	inbox      = `mutation UpdateAgentChatThreadInboxState($threadIds: [UUID!]!, $action: AgentChatInboxAction!, $snoozedUntil: DateTime) {
  updateAgentChatThreadInboxState(threadIds: $threadIds, action: $action, snoozedUntil: $snoozedUntil) { id threadId lastReadAt archivedAt snoozedUntil isSubscribed lastMentionedAt updatedAt }
}`
)

type harness struct {
	server   *httptest.Server
	broker   ai.Broker
	pool     *pgxpool.Pool
	memberID string
}

type verifier struct{ memberID string }

func (v verifier) Verify(context.Context, string) (auth.Principal, error) {
	return auth.Principal{UserID: "user-1", WorkspaceMemberID: v.memberID}, nil
}

func newHarness(t *testing.T) harness {
	t.Helper()
	return newHarnessWith(t, nil)
}

func newHarnessWith(t *testing.T, model ai.Model, tools ...ai.Tool) harness {
	t.Helper()
	pool, err := pgxpool.New(t.Context(), pgtest.New(t))
	if err != nil {
		t.Fatalf("connect: %v", err)
	}
	t.Cleanup(pool.Close)
	var memberID string
	err = pool.QueryRow(t.Context(), `INSERT INTO "`+workspace.SchemaName()+`"."workspaceMember" ("userId") VALUES (gen_random_uuid()) RETURNING id::text`).Scan(&memberID)
	if err != nil {
		t.Fatalf("seed member: %v", err)
	}
	logger := slog.New(slog.NewTextHandler(io.Discard, nil))
	chats := store.New(pool)
	broker := ai.NewPersistingBroker(ai.NewMemoryBroker(), chats, logger)
	upstream, err := url.Parse("http://node.invalid")
	if err != nil {
		t.Fatal(err)
	}
	var runner ai.Runner
	if model != nil {
		runner = ai.NewLoop(model, ai.NewRegistry(tools...))
	}
	turns := ai.NewChatService(chats, runner, broker, logger)
	front := frontdoor.NewHandler(frontdoor.DefaultTable(), upstream, verifier{memberID}, aigql.NewHandler(chats, broker, turns, logger), logger).
		WithSubscriber(aigql.NewSubscriber(broker))
	server := httptest.NewServer(front)
	t.Cleanup(server.Close)
	return harness{server: server, broker: broker, pool: pool, memberID: memberID}
}

func (h harness) send(t *testing.T, operation, query string, variables map[string]any) map[string]any {
	t.Helper()
	body, err := json.Marshal(map[string]any{"operationName": operation, "query": query, "variables": variables})
	if err != nil {
		t.Fatal(err)
	}
	req, err := http.NewRequestWithContext(t.Context(), http.MethodPost, h.server.URL+"/metadata", bytes.NewReader(body))
	if err != nil {
		t.Fatal(err)
	}
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer token")
	resp, err := h.server.Client().Do(req)
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() {
		if err := resp.Body.Close(); err != nil {
			t.Errorf("close response body: %v", err)
		}
	})
	var decoded map[string]any
	if err := json.NewDecoder(resp.Body).Decode(&decoded); err != nil {
		t.Fatalf("decode %s response: %v", operation, err)
	}
	if errs, bad := decoded["errors"]; bad {
		t.Fatalf("%s returned errors: %v", operation, errs)
	}
	return decoded["data"].(map[string]any)
}

func (h harness) seedThread(t *testing.T) string {
	t.Helper()
	var id string
	err := h.pool.QueryRow(t.Context(), `INSERT INTO "`+workspace.SchemaName()+`"."agentChatThread" ("lastActivityAt") VALUES (now()) RETURNING id::text`).Scan(&id)
	if err != nil {
		t.Fatalf("seed thread: %v", err)
	}
	return id
}

func (h harness) publish(threadID string, chunks ...string) {
	for _, chunk := range chunks {
		h.broker.Publish(threadID, ai.ChatEvent{ThreadID: threadID, Event: json.RawMessage(chunk)})
	}
}

func TestChatOperationsAreRoutedToGo(t *testing.T) {
	t.Parallel()
	table := frontdoor.DefaultTable()[frontdoor.EndpointMetadata]
	for _, operation := range []string{"GetChatMessages", "GetAgentChatOpenThreadsSummary", "AssignAgentChatThread", "UpdateAgentChatThreadInboxState"} {
		if !slices.Contains(frontdoor.ChatOperations, operation) {
			t.Errorf("ChatOperations lacks %s", operation)
		}
		if table[operation] != frontdoor.RouteGo {
			t.Errorf("route of %s = %q, want %q", operation, table[operation], frontdoor.RouteGo)
		}
	}
}

func TestGetChatMessages(t *testing.T) {
	t.Parallel()
	h := newHarness(t)
	threadID := h.seedThread(t)
	messageID := uuid.NewString()

	h.publish(threadID,
		`{"type":"start","messageId":"`+messageID+`"}`,
		`{"type":"text-start","id":"t1"}`,
		`{"type":"text-delta","id":"t1","delta":"Hi"}`,
		`{"type":"finish"}`,
		`{"type":"start","messageId":"`+uuid.NewString()+`"}`,
		`{"type":"text-delta","id":"t2","delta":"typing"}`,
	)

	data := h.send(t, "GetChatMessages", getChatMessages, map[string]any{"threadId": threadID})

	messages := data["chatMessages"].([]any)
	if len(messages) != 1 {
		t.Fatalf("chatMessages = %v, want only the finished message", messages)
	}
	message := messages[0].(map[string]any)
	part := message["parts"].([]any)[0].(map[string]any)
	if message["id"] != messageID || message["role"] != "assistant" || part["textContent"] != "Hi" || part["toolInput"] != nil {
		t.Errorf("message = %v, want the finished assistant reply saying Hi", message)
	}
	if createdAt, ok := part["createdAt"].(string); !ok || len(createdAt) != len("2006-01-02T15:04:05.000Z") || createdAt[len(createdAt)-1] != 'Z' {
		t.Errorf("part createdAt = %v, want millisecond ISO format", part["createdAt"])
	}

	wantCatchup := map[string]any{
		"chunks": []any{
			map[string]any{"type": "start", "messageId": data["chatStreamCatchupChunks"].(map[string]any)["chunks"].([]any)[0].(map[string]any)["messageId"]},
			map[string]any{"type": "text-delta", "id": "t2", "delta": "typing"},
		},
		"maxSeq": float64(2),
		"error":  nil,
	}
	if diff := cmp.Diff(wantCatchup, data["chatStreamCatchupChunks"]); diff != "" {
		t.Errorf("chatStreamCatchupChunks (-want +got):\n%s", diff)
	}
}

func TestInboxOperations(t *testing.T) {
	t.Parallel()
	h := newHarness(t)
	threadID := h.seedThread(t)

	updated := h.send(t, "UpdateAgentChatThreadInboxState", inbox, map[string]any{"threadIds": []string{threadID}, "action": "UNREAD"})["updateAgentChatThreadInboxState"].([]any)
	participant := updated[0].(map[string]any)
	if participant["threadId"] != threadID || participant["isSubscribed"] != false || participant["lastReadAt"] != nil {
		t.Errorf("participant = %v, want an unread, unsubscribed row on the thread", participant)
	}

	h.send(t, "UpdateAgentChatThreadInboxState", inbox, map[string]any{"threadIds": []string{threadID}, "action": "SUBSCRIBE"})
	want := map[string]any{"openThreadCount": float64(1), "needsInputThreadCount": float64(0), "hasUnreadOpenThread": true, "hasUnreadMentionThread": false, "hasUnreadAssignedThread": false}
	if diff := cmp.Diff(want, h.send(t, "GetAgentChatOpenThreadsSummary", getSummary, nil)["agentChatOpenThreadsSummary"]); diff != "" {
		t.Errorf("summary (-want +got):\n%s", diff)
	}

	if h.send(t, "AssignAgentChatThread", assign, map[string]any{"threadId": threadID, "assigneeWorkspaceMemberId": h.memberID})["assignAgentChatThread"] != true {
		t.Errorf("assignAgentChatThread did not report success")
	}
	if got := h.send(t, "GetAgentChatOpenThreadsSummary", getSummary, nil)["agentChatOpenThreadsSummary"].(map[string]any); got["hasUnreadAssignedThread"] != true {
		t.Errorf("summary after self-assignment = %v, want the unread thread to stay unread and assigned", got)
	}
}
