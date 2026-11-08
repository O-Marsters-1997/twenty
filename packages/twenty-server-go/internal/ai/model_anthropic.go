package ai

import (
	"context"
	"encoding/json"
	"fmt"
	"iter"

	"github.com/anthropics/anthropic-sdk-go"
	"github.com/anthropics/anthropic-sdk-go/option"
)

const anthropicMaxTokens = 8192

type anthropicModel struct {
	client anthropic.Client
	model  string
}

func newAnthropicModel(cfg ModelConfig) Model {
	opts := []option.RequestOption{option.WithAPIKey(cfg.APIKey)}
	if cfg.BaseURL != "" {
		opts = append(opts, option.WithBaseURL(cfg.BaseURL))
	}
	return &anthropicModel{client: anthropic.NewClient(opts...), model: cfg.Model}
}

func (m *anthropicModel) Stream(ctx context.Context, system string, messages []Message, tools []ToolSpec) iter.Seq2[StreamEvent, error] {
	return func(yield func(StreamEvent, error) bool) {
		params, err := m.params(system, messages, tools)
		if err != nil {
			yield(StreamEvent{}, err)
			return
		}
		stream := m.client.Messages.NewStreaming(ctx, params)
		defer stream.Close()

		var usage Usage
		var call Part
		var args []byte
		for stream.Next() {
			event := stream.Current()
			switch event.Type {
			case "message_start":
				usage.InputTokens = int(event.Message.Usage.InputTokens)
			case "message_delta":
				usage.OutputTokens = int(event.Usage.OutputTokens)
			case "content_block_start":
				if event.ContentBlock.Type == "tool_use" {
					call = Part{Type: PartToolCall, ToolCallID: event.ContentBlock.ID, ToolName: event.ContentBlock.Name}
					args = args[:0]
				}
			case "content_block_delta":
				var out StreamEvent
				switch event.Delta.Type {
				case "text_delta":
					out = StreamEvent{Part: Part{Type: PartText}, Delta: event.Delta.Text}
				case "thinking_delta":
					out = StreamEvent{Part: Part{Type: PartReasoning}, Delta: event.Delta.Thinking}
				case "input_json_delta":
					args = append(args, event.Delta.PartialJSON...)
					continue
				default:
					continue
				}
				if !yield(out, nil) {
					return
				}
			case "content_block_stop":
				if call.Type != PartToolCall {
					continue
				}
				call.Input = json.RawMessage(args)
				if len(args) == 0 {
					call.Input = json.RawMessage("{}")
				}
				if !yield(StreamEvent{Part: call}, nil) {
					return
				}
				call = Part{}
			case "message_stop":
				yield(StreamEvent{Done: true, Usage: &usage}, nil)
				return
			}
		}
		if err := stream.Err(); err != nil {
			yield(StreamEvent{}, fmt.Errorf("stream anthropic: %w", err))
		}
	}
}

func (m *anthropicModel) params(system string, messages []Message, tools []ToolSpec) (anthropic.MessageNewParams, error) {
	params := anthropic.MessageNewParams{
		Model:     anthropic.Model(m.model),
		MaxTokens: anthropicMaxTokens,
	}
	if system != "" {
		params.System = []anthropic.TextBlockParam{{Text: system}}
	}
	for _, spec := range tools {
		var schema anthropic.ToolInputSchemaParam
		if len(spec.InputSchema) > 0 {
			if err := json.Unmarshal(spec.InputSchema, &schema); err != nil {
				return params, fmt.Errorf("decode schema for tool %s: %w", spec.Name, err)
			}
		}
		tool := anthropic.ToolParam{Name: spec.Name, InputSchema: schema}
		if spec.Description != "" {
			tool.Description = anthropic.String(spec.Description)
		}
		params.Tools = append(params.Tools, anthropic.ToolUnionParam{OfTool: &tool})
	}
	for _, message := range messages {
		var blocks []anthropic.ContentBlockParamUnion
		for _, part := range message.Parts {
			switch part.Type {
			case PartText:
				blocks = append(blocks, anthropic.NewTextBlock(part.Text))
			case PartToolCall:
				blocks = append(blocks, anthropic.NewToolUseBlock(part.ToolCallID, part.Input, part.ToolName))
			case PartToolResult:
				blocks = append(blocks, anthropic.NewToolResultBlock(part.ToolCallID, string(part.Output), false))
			}
		}
		switch message.Role {
		case RoleAssistant:
			params.Messages = append(params.Messages, anthropic.NewAssistantMessage(blocks...))
		case RoleUser, RoleTool:
			params.Messages = append(params.Messages, anthropic.NewUserMessage(blocks...))
		}
	}
	return params, nil
}
