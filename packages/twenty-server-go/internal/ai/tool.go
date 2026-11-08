package ai

import (
	"context"
	"encoding/json"

	"github.com/twentyhq/twenty/packages/twenty-server-go/internal/auth"
)

type ToolSpec struct {
	Name        string
	Description string
	InputSchema json.RawMessage
}

type Tool interface {
	Spec() ToolSpec
	Call(ctx context.Context, principal auth.Principal, input json.RawMessage) (json.RawMessage, error)
}

type Registry interface {
	Tools(ctx context.Context, principal auth.Principal) []Tool
	Lookup(name string) (Tool, bool)
}

type staticRegistry struct {
	tools  []Tool
	byName map[string]Tool
}

// NewRegistry serves the same tools to every principal; workspace scoping
// happens in the stores the tools call.
func NewRegistry(tools ...Tool) Registry {
	byName := make(map[string]Tool, len(tools))
	for _, tool := range tools {
		byName[tool.Spec().Name] = tool
	}
	return &staticRegistry{tools: tools, byName: byName}
}

func (r *staticRegistry) Tools(context.Context, auth.Principal) []Tool {
	return r.tools
}

func (r *staticRegistry) Lookup(name string) (Tool, bool) {
	tool, ok := r.byName[name]
	return tool, ok
}
