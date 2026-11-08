package ai_test

import (
	"context"
	"encoding/json"
	"errors"
	"iter"
	"testing"

	"github.com/google/go-cmp/cmp"

	"github.com/twentyhq/twenty/packages/twenty-server-go/internal/ai"
)

type cancellingModel struct{ cancel func() }

func (m cancellingModel) Stream(context.Context, string, []ai.Message, []ai.ToolSpec) iter.Seq2[ai.StreamEvent, error] {
	return func(yield func(ai.StreamEvent, error) bool) {
		yield(textDelta("par"), nil)
		m.cancel()
	}
}

func TestLoop_Run_StreamEdgeCases(t *testing.T) {
	t.Run("replaces malformed tool input instead of panicking", func(t *testing.T) {
		model := &scriptedModel{streams: [][]ai.StreamEvent{
			{{Part: ai.Part{Type: ai.PartToolCall, ToolCallID: "c1", ToolName: "search", Input: json.RawMessage(`{"q":`)}}, {Done: true}},
			{{Done: true}},
		}}
		search := funcTool{name: "search", call: func() (json.RawMessage, error) { return json.RawMessage(`{}`), nil }}

		if _, _, err := runLoop(t, t.Context(), model, search); err != nil {
			t.Fatalf("Run() error = %v", err)
		}
	})

	t.Run("a cancel mid-stream aborts and leaves no half-finished step in the conversation", func(t *testing.T) {
		ctx, cancel := context.WithCancel(t.Context())

		got, chunks, err := runLoop(t, ctx, cancellingModel{cancel: cancel})

		if !errors.Is(err, context.Canceled) {
			t.Fatalf("Run() error = %v, want context.Canceled", err)
		}
		if len(got) != 1 {
			t.Errorf("conversation has %d messages, want only the input", len(got))
		}
		want := []string{"start", "start-step", "text-start", "text-delta", "text-end", "finish-step", "abort"}
		if diff := cmp.Diff(want, chunkTypes(chunks)); diff != "" {
			t.Errorf("chunk types (-want +got):\n%s", diff)
		}
	})
}
