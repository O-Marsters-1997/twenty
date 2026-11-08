package ai_test

import (
	"context"
	"encoding/json"
	"errors"
	"iter"
	"slices"
	"testing"

	"github.com/google/go-cmp/cmp"

	"github.com/twentyhq/twenty/packages/twenty-server-go/internal/ai"
	"github.com/twentyhq/twenty/packages/twenty-server-go/internal/auth"
)

type scriptedModel struct {
	streams [][]ai.StreamEvent
	seen    [][]ai.Message
}

func (m *scriptedModel) Stream(_ context.Context, _ string, messages []ai.Message, _ []ai.ToolSpec) iter.Seq2[ai.StreamEvent, error] {
	m.seen = append(m.seen, slices.Clone(messages))
	events := m.streams[len(m.seen)-1]
	return func(yield func(ai.StreamEvent, error) bool) {
		for _, event := range events {
			if !yield(event, nil) {
				return
			}
		}
	}
}

type failingModel struct{ err error }

func (m failingModel) Stream(context.Context, string, []ai.Message, []ai.ToolSpec) iter.Seq2[ai.StreamEvent, error] {
	return func(yield func(ai.StreamEvent, error) bool) { yield(ai.StreamEvent{}, m.err) }
}

type funcTool struct {
	name string
	call func() (json.RawMessage, error)
}

func (f funcTool) Spec() ai.ToolSpec { return ai.ToolSpec{Name: f.name} }
func (f funcTool) Call(context.Context, auth.Principal, json.RawMessage) (json.RawMessage, error) {
	return f.call()
}

func toolCall(id, name string) ai.StreamEvent {
	return ai.StreamEvent{Part: ai.Part{Type: ai.PartToolCall, ToolCallID: id, ToolName: name, Input: json.RawMessage(`{"q":1}`)}}
}

func textDelta(delta string) ai.StreamEvent {
	return ai.StreamEvent{Part: ai.Part{Type: ai.PartText}, Delta: delta}
}

func runLoop(t *testing.T, ctx context.Context, model ai.Model, tools ...ai.Tool) ([]ai.Message, []map[string]any, error) {
	t.Helper()
	var chunks []map[string]any
	emit := func(event ai.ChatEvent) {
		var chunk map[string]any
		if err := json.Unmarshal(event.Event, &chunk); err != nil {
			t.Fatalf("event is not JSON: %v", err)
		}
		chunks = append(chunks, chunk)
	}
	runner := ai.NewLoop(model, ai.NewRegistry(tools...))
	history := []ai.Message{{Role: ai.RoleUser, Parts: []ai.Part{{Type: ai.PartText, Text: "hi"}}}}
	got, err := runner.Run(ctx, auth.Principal{}, ai.Agent{Prompt: "be brief"}, history, emit)
	return got, chunks, err
}

func chunkTypes(chunks []map[string]any) []string {
	types := make([]string, len(chunks))
	for i, chunk := range chunks {
		types[i], _ = chunk["type"].(string)
	}
	return types
}

func TestLoop_Run(t *testing.T) {
	t.Run("runs requested tools and feeds results back until no more calls", func(t *testing.T) {
		model := &scriptedModel{streams: [][]ai.StreamEvent{
			{textDelta("looking"), toolCall("c1", "search"), {Done: true}},
			{textDelta("done"), {Done: true}},
		}}
		search := funcTool{name: "search", call: func() (json.RawMessage, error) {
			return json.RawMessage(`{"hits":2}`), nil
		}}

		got, chunks, err := runLoop(t, t.Context(), model, search)
		if err != nil {
			t.Fatalf("Run() error = %v", err)
		}

		wantTypes := []string{
			"start",
			"start-step", "text-start", "text-delta", "text-end", "tool-input-available", "tool-output-available", "finish-step",
			"start-step", "text-start", "text-delta", "text-end", "finish-step",
			"finish",
		}
		if diff := cmp.Diff(wantTypes, chunkTypes(chunks)); diff != "" {
			t.Errorf("chunk types (-want +got):\n%s", diff)
		}
		if chunks[5]["toolCallId"] != "c1" || chunks[5]["toolName"] != "search" {
			t.Errorf("tool-input-available = %v", chunks[5])
		}
		if diff := cmp.Diff(map[string]any{"hits": float64(2)}, chunks[6]["output"]); diff != "" {
			t.Errorf("tool output (-want +got):\n%s", diff)
		}

		wantRoles := []ai.Role{ai.RoleUser, ai.RoleAssistant, ai.RoleTool, ai.RoleAssistant}
		var roles []ai.Role
		for _, message := range got {
			roles = append(roles, message.Role)
		}
		if diff := cmp.Diff(wantRoles, roles); diff != "" {
			t.Errorf("roles (-want +got):\n%s", diff)
		}
		result := model.seen[1][2].Parts[0]
		if result.Type != ai.PartToolResult || result.ToolCallID != "c1" || string(result.Output) != `{"hits":2}` {
			t.Errorf("second model call saw tool result %+v", result)
		}
	})

	t.Run("feeds a tool error back to the model and continues", func(t *testing.T) {
		model := &scriptedModel{streams: [][]ai.StreamEvent{
			{toolCall("c1", "search"), toolCall("c2", "missing"), {Done: true}},
			{textDelta("sorry"), {Done: true}},
		}}
		search := funcTool{name: "search", call: func() (json.RawMessage, error) {
			return nil, errors.New("boom")
		}}

		_, chunks, err := runLoop(t, t.Context(), model, search)
		if err != nil {
			t.Fatalf("Run() error = %v", err)
		}

		var errorTexts []any
		for _, chunk := range chunks {
			if chunk["type"] == "tool-output-error" {
				errorTexts = append(errorTexts, chunk["errorText"])
			}
		}
		if len(errorTexts) != 2 || errorTexts[0] != "boom" {
			t.Errorf("tool-output-error texts = %v, want boom then an unknown-tool error", errorTexts)
		}
		toolMessage := model.seen[1][2]
		if len(toolMessage.Parts) != 2 {
			t.Fatalf("model saw %d tool results, want 2", len(toolMessage.Parts))
		}
		for _, result := range toolMessage.Parts {
			if result.Type != ai.PartToolResult || len(result.Output) == 0 {
				t.Errorf("model saw tool part %+v, want a tool-result with output", result)
			}
		}
		if got := chunkTypes(chunks); got[len(got)-1] != "finish" {
			t.Errorf("last chunk = %q, want finish", got[len(got)-1])
		}
	})

	t.Run("stops when the context is cancelled", func(t *testing.T) {
		ctx, cancel := context.WithCancel(t.Context())
		model := &scriptedModel{streams: [][]ai.StreamEvent{
			{toolCall("c1", "search"), {Done: true}},
			{textDelta("never"), {Done: true}},
		}}
		search := funcTool{name: "search", call: func() (json.RawMessage, error) {
			cancel()
			return json.RawMessage(`{}`), nil
		}}

		_, chunks, err := runLoop(t, ctx, model, search)

		if !errors.Is(err, context.Canceled) {
			t.Fatalf("Run() error = %v, want context.Canceled", err)
		}
		if len(model.seen) != 1 {
			t.Errorf("model called %d times, want 1", len(model.seen))
		}
		if got := chunkTypes(chunks); got[len(got)-1] != "abort" {
			t.Errorf("last chunk = %q, want abort", got[len(got)-1])
		}
	})

	t.Run("reports a model failure as an error chunk", func(t *testing.T) {
		boom := errors.New("provider down")

		_, chunks, err := runLoop(t, t.Context(), failingModel{err: boom})

		if !errors.Is(err, boom) {
			t.Fatalf("Run() error = %v, want %v", err, boom)
		}
		if got := chunkTypes(chunks); got[len(got)-1] != "error" {
			t.Errorf("last chunk = %q, want error", got[len(got)-1])
		}
	})
}
