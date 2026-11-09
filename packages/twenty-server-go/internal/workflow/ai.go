package workflow

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"strings"

	"github.com/twentyhq/twenty/packages/twenty-server-go/internal/ai"
	"github.com/twentyhq/twenty/packages/twenty-server-go/internal/auth"
)

// ClassifyAction asks the model to pick one of the configured options.
// Settings: {"input": string, "options": [string], "instructions": string}.
// The result is {"label": <option>}.
type ClassifyAction struct {
	model ai.Model
}

func NewClassifyAction(model ai.Model) *ClassifyAction {
	return &ClassifyAction{model: model}
}

func (*ClassifyAction) Type() ActionType { return ActionTypeClassify }

func (a *ClassifyAction) Run(ctx context.Context, input StepInput) (StepOutput, error) {
	var settings struct {
		Input        string   `json:"input"`
		Options      []string `json:"options"`
		Instructions string   `json:"instructions"`
	}
	if err := json.Unmarshal(input.Settings, &settings); err != nil {
		return StepOutput{}, fmt.Errorf("decode classify settings: %w", err)
	}
	if len(settings.Options) == 0 {
		return StepOutput{Error: "classify needs at least one option"}, nil
	}

	system := fmt.Sprintf("%s\nAnswer with exactly one of these labels and nothing else: %s",
		settings.Instructions, strings.Join(settings.Options, ", "))
	messages := []ai.Message{{Role: ai.RoleUser, Parts: []ai.Part{{Type: ai.PartText, Text: settings.Input}}}}

	var answer strings.Builder
	for event, err := range a.model.Stream(ctx, system, messages, nil) {
		if err != nil {
			return StepOutput{}, fmt.Errorf("stream classify model: %w", err)
		}
		if event.Part.Type == ai.PartText {
			answer.WriteString(event.Delta)
		}
	}

	got := strings.TrimSpace(answer.String())
	for _, option := range settings.Options {
		if strings.EqualFold(got, option) {
			return StepOutput{Result: map[string]string{"label": option}}, nil
		}
	}
	return StepOutput{Error: fmt.Sprintf("model answered %q, not one of the options", got)}, nil
}

// AIAgentAction runs an agent through the same ai.Runner as chat turns.
type AIAgentAction struct {
	runner    ai.Runner
	principal auth.Principal
}

func NewAIAgentAction(runner ai.Runner, principal auth.Principal) *AIAgentAction {
	return &AIAgentAction{runner: runner, principal: principal}
}

func (*AIAgentAction) Type() ActionType { return ActionTypeAIAgent }

func (a *AIAgentAction) Run(ctx context.Context, input StepInput) (StepOutput, error) {
	var settings struct {
		Prompt       string `json:"prompt"`
		Instructions string `json:"instructions"`
	}
	if err := json.Unmarshal(input.Settings, &settings); err != nil {
		return StepOutput{}, fmt.Errorf("decode ai agent settings: %w", err)
	}

	messages := []ai.Message{{Role: ai.RoleUser, Parts: []ai.Part{{Type: ai.PartText, Text: settings.Prompt}}}}
	conversation, err := a.runner.Run(ctx, a.principal, ai.Agent{Prompt: settings.Instructions}, messages, func(ai.ChatEvent) {})
	if err != nil {
		if ctx.Err() != nil {
			return StepOutput{}, fmt.Errorf("run ai agent: %w", err)
		}
		return StepOutput{Error: err.Error()}, nil
	}

	if len(conversation) == 0 {
		return StepOutput{}, errors.New("ai agent returned no messages")
	}
	var answer strings.Builder
	for _, part := range conversation[len(conversation)-1].Parts {
		if part.Type == ai.PartText {
			answer.WriteString(part.Text)
		}
	}
	return StepOutput{Result: map[string]string{"answer": answer.String()}}, nil
}
