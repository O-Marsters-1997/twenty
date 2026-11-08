package ai

import (
	"context"
	"encoding/json"
	"fmt"
	"iter"
	"maps"
	"slices"
	"strings"

	"github.com/openai/openai-go/v3"
	"github.com/openai/openai-go/v3/option"
	"github.com/openai/openai-go/v3/shared"
)

type openAIModel struct {
	client openai.Client
	model  string
}

func newOpenAIModel(cfg ModelConfig) Model {
	opts := []option.RequestOption{option.WithAPIKey(cfg.APIKey)}
	if cfg.BaseURL != "" {
		opts = append(opts, option.WithBaseURL(cfg.BaseURL))
	}
	return &openAIModel{client: openai.NewClient(opts...), model: cfg.Model}
}

type pendingToolCall struct {
	id, name string
	args     strings.Builder
}

func (m *openAIModel) Stream(ctx context.Context, system string, messages []Message, tools []ToolSpec) iter.Seq2[StreamEvent, error] {
	return func(yield func(StreamEvent, error) bool) {
		params, err := m.params(system, messages, tools)
		if err != nil {
			yield(StreamEvent{}, err)
			return
		}
		stream := m.client.Chat.Completions.NewStreaming(ctx, params)
		defer stream.Close()

		var usage Usage
		calls := map[int64]*pendingToolCall{}
		for stream.Next() {
			chunk := stream.Current()
			if chunk.JSON.Usage.Valid() {
				usage = Usage{InputTokens: int(chunk.Usage.PromptTokens), OutputTokens: int(chunk.Usage.CompletionTokens)}
			}
			for _, choice := range chunk.Choices {
				// openai-compatible servers (DeepSeek, vLLM) send reasoning here.
				var extras struct {
					ReasoningContent string `json:"reasoning_content"`
				}
				if err := json.Unmarshal([]byte(choice.Delta.RawJSON()), &extras); err == nil && extras.ReasoningContent != "" {
					if !yield(StreamEvent{Part: Part{Type: PartReasoning}, Delta: extras.ReasoningContent}, nil) {
						return
					}
				}
				if choice.Delta.Content != "" {
					if !yield(StreamEvent{Part: Part{Type: PartText}, Delta: choice.Delta.Content}, nil) {
						return
					}
				}
				for _, delta := range choice.Delta.ToolCalls {
					call := calls[delta.Index]
					if call == nil {
						call = &pendingToolCall{}
						calls[delta.Index] = call
					}
					if delta.ID != "" {
						call.id = delta.ID
					}
					if delta.Function.Name != "" {
						call.name = delta.Function.Name
					}
					call.args.WriteString(delta.Function.Arguments)
				}
				if choice.FinishReason == "" {
					continue
				}
				for _, index := range slices.Sorted(maps.Keys(calls)) {
					call := calls[index]
					input := call.args.String()
					if input == "" {
						input = "{}"
					}
					part := Part{Type: PartToolCall, ToolCallID: call.id, ToolName: call.name, Input: []byte(input)}
					if !yield(StreamEvent{Part: part}, nil) {
						return
					}
				}
				clear(calls)
			}
		}
		if err := stream.Err(); err != nil {
			yield(StreamEvent{}, fmt.Errorf("stream openai: %w", err))
			return
		}
		yield(StreamEvent{Done: true, Usage: &usage}, nil)
	}
}

func (m *openAIModel) params(system string, messages []Message, tools []ToolSpec) (openai.ChatCompletionNewParams, error) {
	params := openai.ChatCompletionNewParams{
		Model:         m.model,
		StreamOptions: openai.ChatCompletionStreamOptionsParam{IncludeUsage: openai.Bool(true)},
	}
	if system != "" {
		params.Messages = append(params.Messages, openai.SystemMessage(system))
	}
	for _, spec := range tools {
		function := shared.FunctionDefinitionParam{Name: spec.Name}
		if spec.Description != "" {
			function.Description = openai.String(spec.Description)
		}
		if len(spec.InputSchema) > 0 {
			if err := json.Unmarshal(spec.InputSchema, &function.Parameters); err != nil {
				return params, fmt.Errorf("decode schema for tool %s: %w", spec.Name, err)
			}
		}
		params.Tools = append(params.Tools, openai.ChatCompletionFunctionTool(function))
	}
	for _, message := range messages {
		switch message.Role {
		case RoleSystem:
			params.Messages = append(params.Messages, openai.SystemMessage(joinText(message.Parts)))
		case RoleUser:
			params.Messages = append(params.Messages, openai.UserMessage(joinText(message.Parts)))
		case RoleAssistant:
			assistant := openai.ChatCompletionAssistantMessageParam{}
			if text := joinText(message.Parts); text != "" {
				assistant.Content.OfString = openai.String(text)
			}
			for _, part := range message.Parts {
				if part.Type != PartToolCall {
					continue
				}
				assistant.ToolCalls = append(assistant.ToolCalls, openai.ChatCompletionMessageToolCallUnionParam{
					OfFunction: &openai.ChatCompletionMessageFunctionToolCallParam{
						ID:       part.ToolCallID,
						Function: openai.ChatCompletionMessageFunctionToolCallFunctionParam{Name: part.ToolName, Arguments: string(part.Input)},
					},
				})
			}
			params.Messages = append(params.Messages, openai.ChatCompletionMessageParamUnion{OfAssistant: &assistant})
		case RoleTool:
			for _, part := range message.Parts {
				if part.Type == PartToolResult {
					params.Messages = append(params.Messages, openai.ToolMessage(string(part.Output), part.ToolCallID))
				}
			}
		}
	}
	return params, nil
}

func joinText(parts []Part) string {
	var text strings.Builder
	for _, part := range parts {
		if part.Type == PartText {
			text.WriteString(part.Text)
		}
	}
	return text.String()
}
