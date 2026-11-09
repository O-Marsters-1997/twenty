package aigql_test

import (
	"bufio"
	"bytes"
	"context"
	"encoding/json"
	"iter"
	"net/http"
	"strings"
	"sync/atomic"
	"testing"
	"time"

	"github.com/google/go-cmp/cmp"
	"github.com/google/uuid"

	"github.com/twentyhq/twenty/packages/twenty-server-go/internal/ai"
)

const (
	sendChatMessage = `mutation SendChatMessage($threadId: UUID!, $text: String!, $messageId: UUID!) {
  sendChatMessage(threadId: $threadId, text: $text, messageId: $messageId) { messageId queued streamId mentionedParticipantWorkspaceMemberIds }
}`
	retryChatMessage = `mutation RetryChatMessage($threadId: UUID!) { retryChatMessage(threadId: $threadId) { messageId queued streamId } }`
	stopStream       = `mutation StopAgentChatStream($threadId: UUID!) { stopAgentChatStream(threadId: $threadId) }`
	deleteQueued     = `mutation DeleteQueuedChatMessage($messageId: UUID!) { deleteQueuedChatMessage(messageId: $messageId) }`
	answerToolCall   = `mutation AnswerToolCall($input: AnswerToolCallInput!) { answerToolCall(input: $input) { streamId } }`
	onAgentChatEvent = `subscription OnAgentChatEvent($threadId: UUID!) { onAgentChatEvent(threadId: $threadId) { threadId event } }`
)

type gatedModel struct {
	gate      chan struct{}
	failFirst bool
	calls     atomic.Int32
}

func (m *gatedModel) Stream(ctx context.Context, _ string, _ []ai.Message, _ []ai.ToolSpec) iter.Seq2[ai.StreamEvent, error] {
	call := m.calls.Add(1)
	return func(yield func(ai.StreamEvent, error) bool) {
		if m.failFirst && call == 1 {
			yield(ai.StreamEvent{}, context.DeadlineExceeded)
			return
		}
		if !yield(ai.StreamEvent{Part: ai.Part{Type: ai.PartText}, Delta: "Hel"}, nil) {
			return
		}
		select {
		case <-m.gate:
		case <-ctx.Done():
			return
		}
		yield(ai.StreamEvent{Part: ai.Part{Type: ai.PartText}, Delta: "lo"}, nil)
	}
}

func (h harness) call(t *testing.T, path, operation, query string, variables map[string]any) map[string]any {
	t.Helper()
	body, err := json.Marshal(map[string]any{"operationName": operation, "query": query, "variables": variables})
	if err != nil {
		t.Fatal(err)
	}
	req, err := http.NewRequestWithContext(t.Context(), http.MethodPost, h.server.URL+path, bytes.NewReader(body))
	if err != nil {
		t.Fatal(err)
	}
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer token")
	resp, err := h.server.Client().Do(req)
	if err != nil {
		t.Fatal(err)
	}
	defer func() {
		if err := resp.Body.Close(); err != nil {
			t.Errorf("close response body: %v", err)
		}
	}()
	var decoded map[string]any
	if err := json.NewDecoder(resp.Body).Decode(&decoded); err != nil {
		t.Fatalf("decode %s response: %v", operation, err)
	}
	return decoded
}

func (h harness) mutate(t *testing.T, operation, query string, variables map[string]any) map[string]any {
	t.Helper()
	response := h.call(t, "/metadata", operation, query, variables)
	if errs, bad := response["errors"]; bad {
		t.Fatalf("%s returned errors: %v", operation, errs)
	}
	return response["data"].(map[string]any)
}

func (h harness) mutationError(t *testing.T, path, operation, query string, variables map[string]any) map[string]any {
	t.Helper()
	response := h.call(t, path, operation, query, variables)
	errs, bad := response["errors"].([]any)
	if !bad {
		t.Fatalf("%s = %v, want errors", operation, response)
	}
	return errs[0].(map[string]any)["extensions"].(map[string]any)
}

func (h harness) assistantText(t *testing.T, threadID string) string {
	t.Helper()
	data := h.send(t, "GetChatMessages", getChatMessages, map[string]any{"threadId": threadID})
	for _, message := range data["chatMessages"].([]any) {
		message := message.(map[string]any)
		if message["role"] != "assistant" {
			continue
		}
		var text string
		for _, part := range message["parts"].([]any) {
			if value, ok := part.(map[string]any)["textContent"].(string); ok {
				text += value
			}
		}
		return text
	}
	return ""
}

func eventually(t *testing.T, what string, condition func() bool) {
	t.Helper()
	deadline := time.Now().Add(5 * time.Second)
	for !condition() {
		if time.Now().After(deadline) {
			t.Fatalf("timed out waiting for %s", what)
		}
		time.Sleep(10 * time.Millisecond)
	}
}

func sendVariables(threadID, messageID, text string) map[string]any {
	return map[string]any{"threadId": threadID, "messageId": messageID, "text": text}
}

func TestSendChatMessage(t *testing.T) {
	t.Parallel()

	t.Run("streams to subscribers, saves chunks and survives a reload", func(t *testing.T) {
		t.Parallel()
		model := &gatedModel{gate: make(chan struct{})}
		h := newHarnessWith(t, model)
		threadID, messageID := uuid.NewString(), uuid.NewString()

		events := h.subscribe(t, threadID)
		first := <-events
		if first["event"].(map[string]any)["type"] != "keepalive" {
			t.Fatalf("first event = %v, want keepalive", first)
		}

		sent := h.mutate(t, "SendChatMessage", sendChatMessage, sendVariables(threadID, messageID, "find Ada"))["sendChatMessage"].(map[string]any)
		streamID, _ := sent["streamId"].(string)
		want := map[string]any{"messageId": messageID, "queued": false, "streamId": streamID, "mentionedParticipantWorkspaceMemberIds": []any{}}
		if diff := cmp.Diff(want, sent); diff != "" || streamID == "" {
			t.Errorf("sendChatMessage (-want +got):\n%s", diff)
		}

		var types []string
		for len(types) == 0 || types[len(types)-1] != "text-delta" {
			kind := (<-events)["event"].(map[string]any)["type"].(string)
			if kind != "keepalive" {
				types = append(types, kind)
			}
		}
		if diff := cmp.Diff([]string{"start", "start-step", "text-start", "text-delta"}, types); diff != "" {
			t.Errorf("event types (-want +got):\n%s", diff)
		}

		eventually(t, "the partial answer in the catchup", func() bool {
			catchup := h.send(t, "GetChatMessages", getChatMessages, map[string]any{"threadId": threadID})["chatStreamCatchupChunks"].(map[string]any)
			return len(catchup["chunks"].([]any)) == 4
		})

		close(model.gate)
		eventually(t, "the saved answer", func() bool { return h.assistantText(t, threadID) == "Hello" })
		catchup := h.send(t, "GetChatMessages", getChatMessages, map[string]any{"threadId": threadID})["chatStreamCatchupChunks"].(map[string]any)
		if len(catchup["chunks"].([]any)) != 0 {
			t.Errorf("catchup after the turn = %v, want none", catchup["chunks"])
		}
	})

	t.Run("queues a message behind the turn in flight and runs it next", func(t *testing.T) {
		t.Parallel()
		model := &gatedModel{gate: make(chan struct{})}
		h := newHarnessWith(t, model)
		threadID := uuid.NewString()
		h.mutate(t, "SendChatMessage", sendChatMessage, sendVariables(threadID, uuid.NewString(), "one"))

		queuedID := uuid.NewString()
		queued := h.mutate(t, "SendChatMessage", sendChatMessage, sendVariables(threadID, queuedID, "two"))["sendChatMessage"].(map[string]any)
		if queued["queued"] != true || queued["streamId"] != nil || queued["messageId"] != queuedID {
			t.Errorf("queued send = %v, want queued without a stream", queued)
		}

		close(model.gate)
		eventually(t, "the queued message to run", func() bool { return model.calls.Load() == 2 })
	})

	t.Run("without a model reports the key is not configured", func(t *testing.T) {
		t.Parallel()
		h := newHarness(t)
		extensions := h.mutationError(t, "/metadata", "SendChatMessage", sendChatMessage, sendVariables(uuid.NewString(), uuid.NewString(), "hi"))
		if extensions["subCode"] != "API_KEY_NOT_CONFIGURED" {
			t.Errorf("extensions = %v, want subCode API_KEY_NOT_CONFIGURED", extensions)
		}
	})
}

func TestDeleteQueuedChatMessage(t *testing.T) {
	t.Parallel()
	model := &gatedModel{gate: make(chan struct{})}
	h := newHarnessWith(t, model)
	t.Cleanup(func() { close(model.gate) })
	threadID, queuedID := uuid.NewString(), uuid.NewString()
	h.mutate(t, "SendChatMessage", sendChatMessage, sendVariables(threadID, uuid.NewString(), "one"))
	h.mutate(t, "SendChatMessage", sendChatMessage, sendVariables(threadID, queuedID, "two"))

	if got := h.mutate(t, "DeleteQueuedChatMessage", deleteQueued, map[string]any{"messageId": queuedID})["deleteQueuedChatMessage"]; got != true {
		t.Errorf("deleteQueuedChatMessage = %v, want true", got)
	}
	extensions := h.mutationError(t, "/metadata", "DeleteQueuedChatMessage", deleteQueued, map[string]any{"messageId": queuedID})
	if extensions["code"] != "NOT_FOUND" || extensions["subCode"] != "MESSAGE_NOT_FOUND" {
		t.Errorf("second delete extensions = %v, want NOT_FOUND / MESSAGE_NOT_FOUND", extensions)
	}
}

func TestStopAgentChatStream(t *testing.T) {
	t.Parallel()
	model := &gatedModel{gate: make(chan struct{})}
	h := newHarnessWith(t, model)
	t.Cleanup(func() { close(model.gate) })
	threadID := uuid.NewString()
	h.mutate(t, "SendChatMessage", sendChatMessage, sendVariables(threadID, uuid.NewString(), "one"))
	eventually(t, "the turn to start streaming", func() bool { return len(h.broker.Catchup(threadID)) == 4 })

	if got := h.mutate(t, "StopAgentChatStream", stopStream, map[string]any{"threadId": threadID})["stopAgentChatStream"]; got != true {
		t.Errorf("stopAgentChatStream = %v, want true", got)
	}
	eventually(t, "the turn to end", func() bool { return len(h.broker.Catchup(threadID)) == 0 })
	if got := h.assistantText(t, threadID); got != "Hel" {
		t.Errorf("assistant text after stop = %q, want the partial answer", got)
	}
}

func TestRetryChatMessage(t *testing.T) {
	t.Parallel()
	gate := make(chan struct{})
	close(gate)
	model := &gatedModel{gate: gate, failFirst: true}
	h := newHarnessWith(t, model)
	threadID := uuid.NewString()

	extensions := h.mutationError(t, "/metadata", "RetryChatMessage", retryChatMessage, map[string]any{"threadId": threadID})
	if extensions["code"] != "NOT_FOUND" {
		t.Errorf("retry on an unknown thread extensions = %v, want NOT_FOUND", extensions)
	}

	h.mutate(t, "SendChatMessage", sendChatMessage, sendVariables(threadID, uuid.NewString(), "hi"))
	eventually(t, "the first turn to fail", func() bool {
		catchup := h.send(t, "GetChatMessages", getChatMessages, map[string]any{"threadId": threadID})["chatStreamCatchupChunks"].(map[string]any)
		return catchup["error"] != nil
	})

	retried := h.mutate(t, "RetryChatMessage", retryChatMessage, map[string]any{"threadId": threadID})["retryChatMessage"].(map[string]any)
	if retried["messageId"] != nil || retried["queued"] != false || retried["streamId"] == nil {
		t.Errorf("retryChatMessage = %v, want a new stream without a message id", retried)
	}
	eventually(t, "the retried answer", func() bool { return h.assistantText(t, threadID) == "Hello" })
}

func TestAnswerToolCall(t *testing.T) {
	t.Parallel()
	gate := make(chan struct{})
	close(gate)
	h := newHarnessWith(t, &gatedModel{gate: gate})
	threadID := h.seedThread(t)
	input := func(toolCallID string) map[string]any {
		return map[string]any{"input": map[string]any{"threadId": threadID, "toolCallId": toolCallID, "response": map[string]any{"answer": "yes"}}}
	}

	extensions := h.mutationError(t, "/graphql", "AnswerToolCall", answerToolCall, input("missing"))
	if extensions["code"] != "NOT_FOUND" || extensions["subCode"] != "TOOL_CALL_NOT_FOUND" {
		t.Errorf("unknown call extensions = %v, want NOT_FOUND / TOOL_CALL_NOT_FOUND", extensions)
	}

	h.publish(threadID,
		`{"type":"start","messageId":"`+uuid.NewString()+`"}`,
		`{"type":"tool-input-available","toolCallId":"call-1","toolName":"ask","input":{"q":"ok?"}}`,
	)
	response := h.call(t, "/graphql", "AnswerToolCall", answerToolCall, input("call-1"))
	streamID := response["data"].(map[string]any)["answerToolCall"].(map[string]any)["streamId"]
	if streamID == nil {
		t.Errorf("answerToolCall = %v, want a stream resuming the thread", response)
	}

	eventually(t, "the answered call to settle", func() bool {
		extensions := h.mutationError(t, "/graphql", "AnswerToolCall", answerToolCall, input("call-1"))
		return extensions["subCode"] == "TOOL_CALL_NOT_PENDING"
	})
}

func (h harness) subscribe(t *testing.T, threadID string) <-chan map[string]any {
	t.Helper()
	body, err := json.Marshal(map[string]any{"operationName": "OnAgentChatEvent", "query": onAgentChatEvent, "variables": map[string]any{"threadId": threadID}})
	if err != nil {
		t.Fatal(err)
	}
	ctx, cancel := context.WithCancel(t.Context())
	t.Cleanup(cancel)
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, h.server.URL+"/metadata", bytes.NewReader(body))
	if err != nil {
		t.Fatal(err)
	}
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Accept", "text/event-stream")
	req.Header.Set("Authorization", "Bearer token")
	resp, err := h.server.Client().Do(req)
	if err != nil {
		t.Fatal(err)
	}
	events := make(chan map[string]any, 64)
	go func() {
		defer func() { _ = resp.Body.Close() }()
		scanner := bufio.NewScanner(resp.Body)
		for scanner.Scan() {
			data, found := strings.CutPrefix(scanner.Text(), "data: ")
			if !found || data == "" {
				continue
			}
			var payload struct {
				Data struct {
					Event map[string]any `json:"onAgentChatEvent"`
				} `json:"data"`
			}
			if json.Unmarshal([]byte(data), &payload) == nil {
				events <- payload.Data.Event
			}
		}
	}()
	return events
}
