package ai

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"iter"
	"strings"
	"unicode"
)

type Provider string

const (
	ProviderAnthropic        Provider = "anthropic"
	ProviderOpenAI           Provider = "openai"
	ProviderOpenAICompatible Provider = "openai-compatible"
)

type Role string

const (
	RoleSystem    Role = "system"
	RoleUser      Role = "user"
	RoleAssistant Role = "assistant"
	RoleTool      Role = "tool"
)

const (
	PartText       = "text"
	PartReasoning  = "reasoning"
	PartToolCall   = "tool-call"
	PartToolResult = "tool-result"
)

type Part struct {
	Type       string // text, reasoning, tool-call, tool-result
	Text       string
	ToolCallID string
	ToolName   string
	Input      json.RawMessage
	Output     json.RawMessage
}

type Message struct {
	Role  Role
	Parts []Part
}

// StreamEvent carries a text or reasoning delta in Delta (with Part.Type set),
// a completed tool call in Part, or the end of the stream with Done and Usage.
type StreamEvent struct {
	Part  Part
	Delta string
	Done  bool
	Usage *Usage
}

type Usage struct{ InputTokens, OutputTokens int }

type Model interface {
	Stream(ctx context.Context, system string, messages []Message, tools []ToolSpec) iter.Seq2[StreamEvent, error]
}

var (
	ErrNoModelConfigured = errors.New("no model configured: set ANTHROPIC_API_KEY or OPENAI_API_KEY")
	ErrInvalidAPIKey     = errors.New("invalid api key")
)

type ModelConfig struct {
	Provider Provider
	APIKey   string
	BaseURL  string
	Model    string
}

const (
	defaultAnthropicModel = "claude-sonnet-4-5"
	defaultOpenAIModel    = "gpt-4.1"
)

// ModelConfigFromEnv picks Anthropic when ANTHROPIC_API_KEY is set, otherwise
// OpenAI, which is openai-compatible once OPENAI_BASE_URL is set.
func ModelConfigFromEnv(getenv func(string) string) (ModelConfig, error) {
	if key := getenv("ANTHROPIC_API_KEY"); key != "" {
		return ModelConfig{
			Provider: ProviderAnthropic,
			APIKey:   key,
			BaseURL:  getenv("ANTHROPIC_BASE_URL"),
			Model:    orDefault(getenv("ANTHROPIC_MODEL"), defaultAnthropicModel),
		}, nil
	}
	key := getenv("OPENAI_API_KEY")
	if key == "" {
		return ModelConfig{}, ErrNoModelConfigured
	}
	cfg := ModelConfig{
		Provider: ProviderOpenAI,
		APIKey:   key,
		BaseURL:  getenv("OPENAI_BASE_URL"),
		Model:    orDefault(getenv("OPENAI_MODEL"), defaultOpenAIModel),
	}
	if cfg.BaseURL != "" {
		cfg.Provider = ProviderOpenAICompatible
	}
	return cfg, nil
}

// NewModel validates the config up front so a bad key fails at selection.
func NewModel(cfg ModelConfig) (Model, error) {
	if cfg.APIKey == "" || strings.ContainsFunc(cfg.APIKey, unicode.IsSpace) {
		return nil, fmt.Errorf("select %s model: %w", cfg.Provider, ErrInvalidAPIKey)
	}
	switch cfg.Provider {
	case ProviderAnthropic:
		return newAnthropicModel(cfg), nil
	case ProviderOpenAI, ProviderOpenAICompatible:
		return newOpenAIModel(cfg), nil
	}
	return nil, fmt.Errorf("select model: unknown provider %q", cfg.Provider)
}

func orDefault(value, fallback string) string {
	if value == "" {
		return fallback
	}
	return value
}
