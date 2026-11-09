package aigql_test

import (
	"context"
	"encoding/json"
	"iter"
	"sync/atomic"
	"testing"

	"github.com/google/go-cmp/cmp"
	"github.com/google/uuid"

	"github.com/twentyhq/twenty/packages/twenty-server-go/internal/ai"
	"github.com/twentyhq/twenty/packages/twenty-server-go/internal/auth"
)

type recordTool struct{}

func (recordTool) Spec() ai.ToolSpec { return ai.ToolSpec{Name: "find_people"} }

func (recordTool) Call(context.Context, auth.Principal, json.RawMessage) (json.RawMessage, error) {
	return json.RawMessage(`{"count":1}`), nil
}

type toolThenTextModel struct{ calls atomic.Int32 }

func (m *toolThenTextModel) Stream(context.Context, string, []ai.Message, []ai.ToolSpec) iter.Seq2[ai.StreamEvent, error] {
	call := m.calls.Add(1)
	return func(yield func(ai.StreamEvent, error) bool) {
		if call == 1 {
			yield(ai.StreamEvent{Part: ai.Part{Type: ai.PartToolCall, ToolCallID: "call-1", ToolName: "find_people", Input: json.RawMessage(`{"q":"Ada"}`)}}, nil)
			return
		}
		yield(ai.StreamEvent{Part: ai.Part{Type: ai.PartText}, Delta: "Found Ada"}, nil)
	}
}

func TestSendChatMessage_recordToolCall(t *testing.T) {
	t.Parallel()
	h := newHarnessWith(t, &toolThenTextModel{}, recordTool{})
	threadID := uuid.NewString()
	events := h.subscribe(t, threadID)
	<-events

	h.mutate(t, "SendChatMessage", sendChatMessage, sendVariables(threadID, uuid.NewString(), "find Ada"))

	var toolOutput any
	for toolOutput == nil {
		event := (<-events)["event"].(map[string]any)
		if event["type"] == "tool-output-available" {
			toolOutput = event["output"]
		}
	}
	if diff := cmp.Diff(map[string]any{"count": float64(1)}, toolOutput); diff != "" {
		t.Errorf("tool output (-want +got):\n%s", diff)
	}
	eventually(t, "the summary", func() bool { return h.assistantText(t, threadID) == "Found Ada" })
}
