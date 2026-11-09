package workflow_test

import (
	"context"
	"encoding/json"
	"errors"
	"iter"
	"testing"

	"github.com/google/go-cmp/cmp"

	"github.com/twentyhq/twenty/packages/twenty-server-go/internal/ai"
	"github.com/twentyhq/twenty/packages/twenty-server-go/internal/auth"
	"github.com/twentyhq/twenty/packages/twenty-server-go/internal/workflow"
)

type fakeModel struct {
	reply string
	err   error
}

func (m fakeModel) Stream(context.Context, string, []ai.Message, []ai.ToolSpec) iter.Seq2[ai.StreamEvent, error] {
	return func(yield func(ai.StreamEvent, error) bool) {
		if m.err != nil {
			yield(ai.StreamEvent{}, m.err)
			return
		}
		yield(ai.StreamEvent{Part: ai.Part{Type: ai.PartText}, Delta: m.reply}, nil)
	}
}

type fakeRunner struct {
	final     string
	err       error
	principal auth.Principal
	agent     ai.Agent
	messages  []ai.Message
}

func (r *fakeRunner) Run(_ context.Context, principal auth.Principal, agent ai.Agent, messages []ai.Message, _ func(ai.ChatEvent)) ([]ai.Message, error) {
	r.principal, r.agent = principal, agent
	if r.err != nil {
		return messages, r.err
	}
	r.messages = append(messages, ai.Message{Role: ai.RoleAssistant, Parts: []ai.Part{{Type: ai.PartText, Text: r.final}}})
	return r.messages, nil
}

func stepInput(settings string) workflow.StepInput {
	return workflow.StepInput{Settings: json.RawMessage(settings)}
}

func TestClassifyAction_Run(t *testing.T) {
	const settings = `{"input":"great news","options":["positive","negative"]}`

	tests := []struct {
		name  string
		reply string
		want  workflow.StepOutput
	}{
		{"exact label", "positive", workflow.StepOutput{Result: map[string]string{"label": "positive"}}},
		{"case and whitespace", " Negative\n", workflow.StepOutput{Result: map[string]string{"label": "negative"}}},
		{"unknown label", "maybe", workflow.StepOutput{Error: `model answered "maybe", not one of the options`}},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got, err := workflow.NewClassifyAction(fakeModel{reply: tt.reply}).Run(t.Context(), stepInput(settings))
			if err != nil {
				t.Fatalf("Run() error = %v, want nil", err)
			}
			if diff := cmp.Diff(tt.want, got); diff != "" {
				t.Errorf("Run() mismatch (-want +got):\n%s", diff)
			}
		})
	}

	t.Run("no options", func(t *testing.T) {
		got, err := workflow.NewClassifyAction(fakeModel{}).Run(t.Context(), stepInput(`{"input":"x"}`))
		if err != nil {
			t.Fatalf("Run() error = %v, want nil", err)
		}
		if got.Error == "" {
			t.Error("Run().Error is empty, want step error")
		}
	})

	t.Run("model failure", func(t *testing.T) {
		boom := errors.New("boom")
		_, err := workflow.NewClassifyAction(fakeModel{err: boom}).Run(t.Context(), stepInput(settings))
		if !errors.Is(err, boom) {
			t.Errorf("Run() error = %v, want boom", err)
		}
	})
}

func TestAIAgentAction_Run(t *testing.T) {
	t.Run("returns the final answer", func(t *testing.T) {
		runner := &fakeRunner{final: "done"}
		principal := auth.Principal{WorkspaceID: "ws-1"}
		got, err := workflow.NewAIAgentAction(runner, principal).Run(t.Context(), stepInput(`{"prompt":"summarise","instructions":"be brief"}`))
		if err != nil {
			t.Fatalf("Run() error = %v, want nil", err)
		}
		want := workflow.StepOutput{Result: map[string]string{"answer": "done"}}
		if diff := cmp.Diff(want, got); diff != "" {
			t.Errorf("Run() mismatch (-want +got):\n%s", diff)
		}
		if runner.agent.Prompt != "be brief" {
			t.Errorf("agent prompt = %q, want %q", runner.agent.Prompt, "be brief")
		}
		if runner.principal != principal {
			t.Errorf("principal = %+v, want %+v", runner.principal, principal)
		}
		if text := runner.messages[0].Parts[0].Text; text != "summarise" {
			t.Errorf("first message = %q, want %q", text, "summarise")
		}
	})

	t.Run("runner failure is a step error", func(t *testing.T) {
		got, err := workflow.NewAIAgentAction(&fakeRunner{err: ai.ErrMaxSteps}, auth.Principal{}).Run(t.Context(), stepInput(`{"prompt":"x"}`))
		if err != nil {
			t.Fatalf("Run() error = %v, want nil", err)
		}
		if got.Error != ai.ErrMaxSteps.Error() {
			t.Errorf("Run().Error = %q, want %q", got.Error, ai.ErrMaxSteps)
		}
	})

	t.Run("cancelled context is returned", func(t *testing.T) {
		boom := errors.New("boom")
		ctx, cancel := context.WithCancel(t.Context())
		cancel()
		_, err := workflow.NewAIAgentAction(&fakeRunner{err: boom}, auth.Principal{}).Run(ctx, stepInput(`{"prompt":"x"}`))
		if !errors.Is(err, boom) {
			t.Errorf("Run() error = %v, want boom", err)
		}
	})
}
