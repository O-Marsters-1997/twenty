package metadatagql_test

import (
	"context"
	"encoding/json"
	"io"
	"log/slog"
	"net/http"
	"net/http/httptest"
	"net/url"
	"testing"

	"github.com/google/go-cmp/cmp"

	"github.com/twentyhq/twenty/packages/twenty-server-go/internal/ai"
	"github.com/twentyhq/twenty/packages/twenty-server-go/internal/auth"
	"github.com/twentyhq/twenty/packages/twenty-server-go/internal/frontdoor"
	"github.com/twentyhq/twenty/packages/twenty-server-go/internal/metadata/metadatagql"
	"github.com/twentyhq/twenty/packages/twenty-server-go/internal/metadata/store"
)

type stubTool struct{ spec ai.ToolSpec }

func (t stubTool) Spec() ai.ToolSpec { return t.spec }

func (stubTool) Call(context.Context, auth.Principal, json.RawMessage) (json.RawMessage, error) {
	return nil, nil
}

type noPager struct{}

func (noPager) Page(context.Context, store.PageRequest) (store.Page, error) {
	return store.Page{}, nil
}

func newToolServer(t *testing.T) *httptest.Server {
	t.Helper()
	registry := ai.NewRegistry(stubTool{ai.ToolSpec{
		Name:        "find_company",
		Description: "List company records.",
		InputSchema: json.RawMessage(`{"type":"object","properties":{"limit":{"type":"integer"}}}`),
	}})
	logger := slog.New(slog.NewTextHandler(io.Discard, nil))
	upstream, err := url.Parse("http://node.invalid")
	if err != nil {
		t.Fatal(err)
	}
	goGraphQL := http.NewServeMux()
	goGraphQL.Handle("/metadata", metadatagql.NewHandler(noPager{}, registry, logger))
	server := httptest.NewServer(frontdoor.NewHandler(frontdoor.DefaultTable(), upstream, verifier{}, goGraphQL, logger))
	t.Cleanup(server.Close)
	return server
}

func TestToolIndex(t *testing.T) {
	t.Parallel()
	server := newToolServer(t)

	t.Run("GetToolIndex lists the registry", func(t *testing.T) {
		t.Parallel()
		got := send(t, server, "GetToolIndex", `query GetToolIndex { getToolIndex { name label description category objectName icon widgetName } }`)
		want := map[string]any{"data": map[string]any{"getToolIndex": []any{map[string]any{
			"name": "find_company", "label": "find_company", "description": "List company records.",
			"category": "DATABASE_CRUD", "objectName": nil, "icon": nil, "widgetName": nil,
		}}}}
		if diff := cmp.Diff(want, got); diff != "" {
			t.Errorf("GetToolIndex (-want +got):\n%s", diff)
		}
	})

	t.Run("GetToolInputSchema returns the schema", func(t *testing.T) {
		t.Parallel()
		got := send(t, server, "GetToolInputSchema", `query GetToolInputSchema { getToolInputSchema(toolName: "find_company") }`)
		want := map[string]any{"data": map[string]any{"getToolInputSchema": map[string]any{
			"type": "object", "properties": map[string]any{"limit": map[string]any{"type": "integer"}},
		}}}
		if diff := cmp.Diff(want, got); diff != "" {
			t.Errorf("GetToolInputSchema (-want +got):\n%s", diff)
		}
	})

	t.Run("GetToolInputSchema is null for an unknown tool, as in Node", func(t *testing.T) {
		t.Parallel()
		got := send(t, server, "GetToolInputSchema", `query GetToolInputSchema { getToolInputSchema(toolName: "nope") }`)
		want := map[string]any{"data": map[string]any{"getToolInputSchema": nil}}
		if diff := cmp.Diff(want, got); diff != "" {
			t.Errorf("GetToolInputSchema (-want +got):\n%s", diff)
		}
	})
}
