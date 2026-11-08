package ai_test

import (
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/google/go-cmp/cmp"

	"github.com/twentyhq/twenty/packages/twenty-server-go/internal/ai"
)

func fakeSSE(t *testing.T, events ...string) (*httptest.Server, *string) {
	t.Helper()
	var requestBody string
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		body, _ := io.ReadAll(r.Body)
		requestBody = string(body)
		w.Header().Set("Content-Type", "text/event-stream")
		for _, event := range events {
			fmt.Fprint(w, event)
		}
	}))
	t.Cleanup(server.Close)
	return server, &requestBody
}

func anthropicEvent(name, data string) string {
	return fmt.Sprintf("event: %s\ndata: %s\n\n", name, data)
}

func openAIEvent(data string) string { return "data: " + data + "\n\n" }

func collect(t *testing.T, model ai.Model, tools []ai.ToolSpec) []ai.StreamEvent {
	t.Helper()
	messages := []ai.Message{{Role: ai.RoleUser, Parts: []ai.Part{{Type: ai.PartText, Text: "hi"}}}}
	var events []ai.StreamEvent
	for event, err := range model.Stream(t.Context(), "be brief", messages, tools) {
		if err != nil {
			t.Fatalf("Stream() error = %v", err)
		}
		events = append(events, event)
	}
	return events
}

func newModel(t *testing.T, provider ai.Provider, baseURL string) ai.Model {
	t.Helper()
	model, err := ai.NewModel(ai.ModelConfig{Provider: provider, APIKey: "sk-test", BaseURL: baseURL, Model: "m"})
	if err != nil {
		t.Fatalf("NewModel() error = %v", err)
	}
	return model
}

var weatherTool = ai.ToolSpec{
	Name:        "weather",
	Description: "get weather",
	InputSchema: json.RawMessage(`{"type":"object","properties":{"city":{"type":"string"}}}`),
}

func TestAnthropicModel_Stream(t *testing.T) {
	server, requestBody := fakeSSE(t,
		anthropicEvent("message_start", `{"type":"message_start","message":{"id":"m1","type":"message","role":"assistant","content":[],"model":"m","usage":{"input_tokens":11,"output_tokens":1}}}`),
		anthropicEvent("content_block_start", `{"type":"content_block_start","index":0,"content_block":{"type":"thinking","thinking":""}}`),
		anthropicEvent("content_block_delta", `{"type":"content_block_delta","index":0,"delta":{"type":"thinking_delta","thinking":"hmm"}}`),
		anthropicEvent("content_block_stop", `{"type":"content_block_stop","index":0}`),
		anthropicEvent("content_block_start", `{"type":"content_block_start","index":1,"content_block":{"type":"text","text":""}}`),
		anthropicEvent("content_block_delta", `{"type":"content_block_delta","index":1,"delta":{"type":"text_delta","text":"Hel"}}`),
		anthropicEvent("content_block_delta", `{"type":"content_block_delta","index":1,"delta":{"type":"text_delta","text":"lo"}}`),
		anthropicEvent("content_block_stop", `{"type":"content_block_stop","index":1}`),
		anthropicEvent("content_block_start", `{"type":"content_block_start","index":2,"content_block":{"type":"tool_use","id":"toolu_1","name":"weather","input":{}}}`),
		anthropicEvent("content_block_delta", `{"type":"content_block_delta","index":2,"delta":{"type":"input_json_delta","partial_json":"{\"city\":"}}`),
		anthropicEvent("content_block_delta", `{"type":"content_block_delta","index":2,"delta":{"type":"input_json_delta","partial_json":"\"Paris\"}"}}`),
		anthropicEvent("content_block_stop", `{"type":"content_block_stop","index":2}`),
		anthropicEvent("message_delta", `{"type":"message_delta","delta":{"stop_reason":"tool_use"},"usage":{"output_tokens":7}}`),
		anthropicEvent("message_stop", `{"type":"message_stop"}`),
	)

	got := collect(t, newModel(t, ai.ProviderAnthropic, server.URL), []ai.ToolSpec{weatherTool})

	want := []ai.StreamEvent{
		{Part: ai.Part{Type: ai.PartReasoning}, Delta: "hmm"},
		{Part: ai.Part{Type: ai.PartText}, Delta: "Hel"},
		{Part: ai.Part{Type: ai.PartText}, Delta: "lo"},
		{Part: ai.Part{Type: ai.PartToolCall, ToolCallID: "toolu_1", ToolName: "weather", Input: json.RawMessage(`{"city":"Paris"}`)}},
		{Done: true, Usage: &ai.Usage{InputTokens: 11, OutputTokens: 7}},
	}
	if diff := cmp.Diff(want, got); diff != "" {
		t.Errorf("Stream() events mismatch (-want +got):\n%s", diff)
	}
	for _, fragment := range []string{`"be brief"`, `"weather"`, `"hi"`} {
		if !strings.Contains(*requestBody, fragment) {
			t.Errorf("request body missing %s: %s", fragment, *requestBody)
		}
	}
}

func TestOpenAIModel_Stream(t *testing.T) {
	for _, provider := range []ai.Provider{ai.ProviderOpenAI, ai.ProviderOpenAICompatible} {
		t.Run(string(provider), func(t *testing.T) {
			server, requestBody := fakeSSE(t,
				openAIEvent(`{"id":"c","object":"chat.completion.chunk","choices":[{"index":0,"delta":{"role":"assistant","reasoning_content":"hmm"}}]}`),
				openAIEvent(`{"id":"c","object":"chat.completion.chunk","choices":[{"index":0,"delta":{"content":"Hel"}}]}`),
				openAIEvent(`{"id":"c","object":"chat.completion.chunk","choices":[{"index":0,"delta":{"content":"lo"}}]}`),
				openAIEvent(`{"id":"c","object":"chat.completion.chunk","choices":[{"index":0,"delta":{"tool_calls":[{"index":0,"id":"call_1","type":"function","function":{"name":"weather","arguments":"{\"city\":"}}]}}]}`),
				openAIEvent(`{"id":"c","object":"chat.completion.chunk","choices":[{"index":0,"delta":{"tool_calls":[{"index":0,"function":{"arguments":"\"Paris\"}"}}]}}]}`),
				openAIEvent(`{"id":"c","object":"chat.completion.chunk","choices":[{"index":0,"delta":{},"finish_reason":"tool_calls"}]}`),
				openAIEvent(`{"id":"c","object":"chat.completion.chunk","choices":[],"usage":{"prompt_tokens":11,"completion_tokens":7,"total_tokens":18}}`),
				openAIEvent("[DONE]"),
			)

			got := collect(t, newModel(t, provider, server.URL), []ai.ToolSpec{weatherTool})

			want := []ai.StreamEvent{
				{Part: ai.Part{Type: ai.PartReasoning}, Delta: "hmm"},
				{Part: ai.Part{Type: ai.PartText}, Delta: "Hel"},
				{Part: ai.Part{Type: ai.PartText}, Delta: "lo"},
				{Part: ai.Part{Type: ai.PartToolCall, ToolCallID: "call_1", ToolName: "weather", Input: json.RawMessage(`{"city":"Paris"}`)}},
				{Done: true, Usage: &ai.Usage{InputTokens: 11, OutputTokens: 7}},
			}
			if diff := cmp.Diff(want, got); diff != "" {
				t.Errorf("Stream() events mismatch (-want +got):\n%s", diff)
			}
			for _, fragment := range []string{`"be brief"`, `"weather"`, `"hi"`} {
				if !strings.Contains(*requestBody, fragment) {
					t.Errorf("request body missing %s: %s", fragment, *requestBody)
				}
			}
		})
	}
}

func TestModel_StreamHTTPError(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
		http.Error(w, `{"error":{"message":"bad key"}}`, http.StatusUnauthorized)
	}))
	t.Cleanup(server.Close)

	for _, provider := range []ai.Provider{ai.ProviderAnthropic, ai.ProviderOpenAI} {
		t.Run(string(provider), func(t *testing.T) {
			var gotErr error
			for _, err := range newModel(t, provider, server.URL).Stream(t.Context(), "", nil, nil) {
				gotErr = err
			}
			if gotErr == nil {
				t.Error("Stream() error = nil, want HTTP error")
			}
		})
	}
}

func TestModelConfigFromEnv(t *testing.T) {
	tests := []struct {
		name string
		env  map[string]string
		want ai.ModelConfig
	}{
		{"anthropic wins", map[string]string{"ANTHROPIC_API_KEY": "a", "OPENAI_API_KEY": "o"}, ai.ModelConfig{Provider: ai.ProviderAnthropic, APIKey: "a", Model: "claude-sonnet-4-5"}},
		{"openai", map[string]string{"OPENAI_API_KEY": "o"}, ai.ModelConfig{Provider: ai.ProviderOpenAI, APIKey: "o", Model: "gpt-4.1"}},
		{"openai compatible", map[string]string{"OPENAI_API_KEY": "o", "OPENAI_BASE_URL": "http://x", "OPENAI_MODEL": "llama"}, ai.ModelConfig{Provider: ai.ProviderOpenAICompatible, APIKey: "o", BaseURL: "http://x", Model: "llama"}},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got, err := ai.ModelConfigFromEnv(func(key string) string { return tt.env[key] })
			if err != nil {
				t.Fatalf("ModelConfigFromEnv() error = %v", err)
			}
			if diff := cmp.Diff(tt.want, got); diff != "" {
				t.Errorf("ModelConfigFromEnv() mismatch (-want +got):\n%s", diff)
			}
		})
	}

	t.Run("no key", func(t *testing.T) {
		_, err := ai.ModelConfigFromEnv(func(string) string { return "" })
		if !errors.Is(err, ai.ErrNoModelConfigured) {
			t.Errorf("ModelConfigFromEnv() error = %v, want ErrNoModelConfigured", err)
		}
	})
}

func TestNewModel_InvalidKey(t *testing.T) {
	for _, key := range []string{"", "has space", "line\nbreak"} {
		_, err := ai.NewModel(ai.ModelConfig{Provider: ai.ProviderAnthropic, APIKey: key})
		if !errors.Is(err, ai.ErrInvalidAPIKey) {
			t.Errorf("NewModel(key %q) error = %v, want ErrInvalidAPIKey", key, err)
		}
	}
}

func TestAnthropicModel_StreamRequestAndTruncation(t *testing.T) {
	server, requestBody := fakeSSE(t,
		anthropicEvent("message_start", `{"type":"message_start","message":{"id":"m1","type":"message","role":"assistant","content":[],"model":"m","usage":{"input_tokens":1,"output_tokens":1}}}`),
	)
	messages := []ai.Message{
		{Role: ai.RoleUser, Parts: []ai.Part{{Type: ai.PartText, Text: "hi"}}},
		{Role: ai.RoleAssistant, Parts: []ai.Part{
			{Type: ai.PartToolCall, ToolCallID: "a", ToolName: "weather", Input: json.RawMessage(`{}`)},
			{Type: ai.PartToolCall, ToolCallID: "b", ToolName: "weather", Input: json.RawMessage(`{}`)},
		}},
		{Role: ai.RoleTool, Parts: []ai.Part{{Type: ai.PartToolResult, ToolCallID: "a", Output: json.RawMessage(`"x"`)}}},
		{Role: ai.RoleTool, Parts: []ai.Part{{Type: ai.PartToolResult, ToolCallID: "b", Output: json.RawMessage(`"y"`)}}},
	}

	var gotErr error
	for _, err := range newModel(t, ai.ProviderAnthropic, server.URL).Stream(t.Context(), "", messages, nil) {
		gotErr = err
	}

	if gotErr == nil {
		t.Error("Stream() error = nil, want error for stream ending before message_stop")
	}
	var request struct {
		Messages []struct {
			Role    string            `json:"role"`
			Content []json.RawMessage `json:"content"`
		} `json:"messages"`
	}
	if err := json.Unmarshal([]byte(*requestBody), &request); err != nil {
		t.Fatalf("decode request: %v", err)
	}
	if len(request.Messages) != 3 || request.Messages[2].Role != "user" || len(request.Messages[2].Content) != 2 {
		t.Errorf("request messages = %s, want tool results merged into one user message", *requestBody)
	}
}
