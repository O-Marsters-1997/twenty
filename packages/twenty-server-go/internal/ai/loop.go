package ai

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"

	"github.com/twentyhq/twenty/packages/twenty-server-go/internal/auth"
)

const maxLoopSteps = 25

var ErrMaxSteps = errors.New("agent loop exceeded its step limit")

type Loop struct {
	model    Model
	registry Registry
}

func NewLoop(model Model, registry Registry) *Loop {
	return &Loop{model: model, registry: registry}
}

var _ Runner = (*Loop)(nil)

func (l *Loop) Run(ctx context.Context, principal auth.Principal, agent Agent, messages []Message, emit func(ChatEvent)) ([]Message, error) {
	send := func(chunk map[string]any) {
		event, err := json.Marshal(chunk)
		if err != nil {
			panic(fmt.Sprintf("marshal chat chunk: %v", err))
		}
		emit(ChatEvent{Event: event})
	}
	conversation := append([]Message(nil), messages...)
	stepOpen := false
	fail := func(err error) ([]Message, error) {
		if stepOpen {
			send(map[string]any{"type": "finish-step"})
		}
		if ctx.Err() != nil {
			send(map[string]any{"type": "abort"})
			return conversation, ctx.Err()
		}
		send(map[string]any{"type": "error", "errorText": err.Error()})
		return conversation, err
	}

	tools := l.registry.Tools(ctx, principal)
	specs := make([]ToolSpec, len(tools))
	for i, tool := range tools {
		specs[i] = tool.Spec()
	}

	send(map[string]any{"type": "start"})
	for range maxLoopSteps {
		if ctx.Err() != nil {
			return fail(ctx.Err())
		}
		send(map[string]any{"type": "start-step"})
		stepOpen = true
		assistant, err := l.streamStep(ctx, agent.Prompt, conversation, specs, send)
		if err == nil {
			err = ctx.Err()
		}
		if err != nil {
			return fail(err)
		}

		var results []Part
		for _, part := range assistant.Parts {
			if part.Type != PartToolCall {
				continue
			}
			if ctx.Err() != nil {
				return fail(ctx.Err())
			}
			results = append(results, l.callTool(ctx, principal, part, send))
		}
		send(map[string]any{"type": "finish-step"})
		stepOpen = false
		conversation = append(conversation, assistant)
		if len(results) == 0 {
			send(map[string]any{"type": "finish"})
			return conversation, nil
		}
		conversation = append(conversation, Message{Role: RoleTool, Parts: results})
	}
	return fail(ErrMaxSteps)
}

func (l *Loop) streamStep(ctx context.Context, system string, conversation []Message, specs []ToolSpec, send func(map[string]any)) (Message, error) {
	assistant := Message{Role: RoleAssistant}
	var (
		openType string
		blockID  string
		blocks   int
		buffer   string
	)
	closeBlock := func() {
		if openType == "" {
			return
		}
		send(map[string]any{"type": openType + "-end", "id": blockID})
		assistant.Parts = append(assistant.Parts, Part{Type: openType, Text: buffer})
		openType, buffer = "", ""
	}
	for event, err := range l.model.Stream(ctx, system, conversation, specs) {
		if err != nil {
			closeBlock()
			return assistant, fmt.Errorf("stream model: %w", err)
		}
		switch {
		case event.Part.Type == PartToolCall:
			closeBlock()
			part := event.Part
			if !json.Valid(part.Input) {
				part.Input = json.RawMessage(`{}`)
			}
			assistant.Parts = append(assistant.Parts, part)
			send(map[string]any{"type": "tool-input-available", "toolCallId": part.ToolCallID, "toolName": part.ToolName, "input": part.Input})
		case event.Delta != "":
			if openType != event.Part.Type {
				closeBlock()
				openType = event.Part.Type
				blocks++
				blockID = fmt.Sprintf("%s-%d", openType, blocks)
				send(map[string]any{"type": openType + "-start", "id": blockID})
			}
			buffer += event.Delta
			send(map[string]any{"type": openType + "-delta", "id": blockID, "delta": event.Delta})
		}
	}
	closeBlock()
	return assistant, nil
}

func (l *Loop) callTool(ctx context.Context, principal auth.Principal, call Part, send func(map[string]any)) Part {
	result := Part{Type: PartToolResult, ToolCallID: call.ToolCallID, ToolName: call.ToolName}
	var (
		output json.RawMessage
		err    error
	)
	if tool, ok := l.registry.Lookup(call.ToolName); !ok {
		err = fmt.Errorf("unknown tool %q", call.ToolName)
	} else if output, err = tool.Call(ctx, principal, call.Input); err == nil && !json.Valid(output) {
		err = fmt.Errorf("tool %q returned invalid JSON", call.ToolName)
	}
	if err != nil {
		result.Output = json.RawMessage(`{}`)
		if payload, marshalErr := json.Marshal(map[string]string{"error": err.Error()}); marshalErr == nil {
			result.Output = payload
		}
		send(map[string]any{"type": "tool-output-error", "toolCallId": call.ToolCallID, "errorText": err.Error()})
		return result
	}
	result.Output = output
	send(map[string]any{"type": "tool-output-available", "toolCallId": call.ToolCallID, "output": output})
	return result
}
