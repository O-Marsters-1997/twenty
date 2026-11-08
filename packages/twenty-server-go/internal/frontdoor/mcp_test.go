package frontdoor_test

import (
	"context"
	"encoding/json"
	"io"
	"log/slog"
	"net/http"
	"net/http/httptest"
	"net/url"
	"strings"
	"testing"

	"github.com/google/go-cmp/cmp"

	"github.com/twentyhq/twenty/packages/twenty-server-go/internal/ai"
	"github.com/twentyhq/twenty/packages/twenty-server-go/internal/auth"
	"github.com/twentyhq/twenty/packages/twenty-server-go/internal/frontdoor"
)

type apiKeyVerifier struct{}

func (apiKeyVerifier) Verify(_ context.Context, bearer string) (auth.Principal, error) {
	switch bearer {
	case "api-key":
		return auth.Principal{WorkspaceID: "workspace-1", APIKeyID: "key-1"}, nil
	case "user":
		return auth.Principal{UserID: "user-1"}, nil
	}
	return auth.Principal{}, auth.ErrUnauthenticated
}

type echoTool struct{}

func (echoTool) Spec() ai.ToolSpec {
	return ai.ToolSpec{Name: "echo", Description: "echoes the caller", InputSchema: json.RawMessage(`{"type":"object"}`)}
}

func (echoTool) Call(_ context.Context, principal auth.Principal, input json.RawMessage) (json.RawMessage, error) {
	return json.Marshal(map[string]any{"apiKeyId": principal.APIKeyID, "workspaceId": principal.WorkspaceID, "input": input})
}

func newMCPServer(t *testing.T) *httptest.Server {
	t.Helper()
	upstream, err := url.Parse("http://127.0.0.1:0")
	if err != nil {
		t.Fatal(err)
	}
	handler := frontdoor.NewHandler(frontdoor.DefaultTable(), upstream, apiKeyVerifier{}, http.NotFoundHandler(), slog.New(slog.NewTextHandler(io.Discard, nil))).
		WithMCP(ai.NewRegistry(echoTool{}))
	server := httptest.NewServer(handler)
	t.Cleanup(server.Close)
	return server
}

func postMCP(t *testing.T, server *httptest.Server, bearer, body string) (int, string) {
	t.Helper()
	request, err := http.NewRequestWithContext(t.Context(), http.MethodPost, server.URL+"/mcp", strings.NewReader(body))
	if err != nil {
		t.Fatal(err)
	}
	request.Header.Set("Content-Type", "application/json")
	if bearer != "" {
		request.Header.Set("Authorization", "Bearer "+bearer)
	}
	response, err := http.DefaultClient.Do(request)
	if err != nil {
		t.Fatal(err)
	}
	got, err := io.ReadAll(response.Body)
	if err != nil {
		t.Fatal(err)
	}
	if err := response.Body.Close(); err != nil {
		t.Error(err)
	}
	return response.StatusCode, string(got)
}

func decodeJSON(t *testing.T, raw string) any {
	t.Helper()
	var got any
	if err := json.Unmarshal([]byte(raw), &got); err != nil {
		t.Fatalf("decode %q: %v", raw, err)
	}
	return got
}

func TestHandler_MCP(t *testing.T) {
	t.Parallel()
	server := newMCPServer(t)

	t.Run("rejects callers that are not API keys", func(t *testing.T) {
		t.Parallel()
		for _, bearer := range []string{"", "bad", "user"} {
			status, _ := postMCP(t, server, bearer, `{"jsonrpc":"2.0","id":1,"method":"tools/list"}`)
			if status != http.StatusUnauthorized {
				t.Errorf("POST /mcp bearer %q = %d, want %d", bearer, status, http.StatusUnauthorized)
			}
		}
	})

	t.Run("answers", func(t *testing.T) {
		t.Parallel()
		tests := []struct{ name, request, want string }{
			{
				"tools/list",
				`{"jsonrpc":"2.0","id":1,"method":"tools/list"}`,
				`{"jsonrpc":"2.0","id":1,"result":{"tools":[{"name":"echo","description":"echoes the caller","inputSchema":{"type":"object"}}]}}`,
			},
			{
				"tools/call runs the tool with the API-key principal",
				`{"jsonrpc":"2.0","id":2,"method":"tools/call","params":{"name":"echo","arguments":{"a":1}}}`,
				`{"jsonrpc":"2.0","id":2,"result":{"content":[{"type":"text","text":"{\"apiKeyId\":\"key-1\",\"input\":{\"a\":1},\"workspaceId\":\"workspace-1\"}"}]}}`,
			},
			{
				"unknown tool",
				`{"jsonrpc":"2.0","id":3,"method":"tools/call","params":{"name":"nope"}}`,
				`{"jsonrpc":"2.0","id":3,"error":{"code":-32602,"message":"unknown tool nope"}}`,
			},
			{
				"unknown method",
				`{"jsonrpc":"2.0","id":4,"method":"nope"}`,
				`{"jsonrpc":"2.0","id":4,"error":{"code":-32601,"message":"method not found"}}`,
			},
		}
		for _, tt := range tests {
			t.Run(tt.name, func(t *testing.T) {
				status, got := postMCP(t, server, "api-key", tt.request)
				if status != http.StatusOK {
					t.Fatalf("POST /mcp = %d, want 200", status)
				}
				if diff := cmp.Diff(decodeJSON(t, tt.want), decodeJSON(t, got)); diff != "" {
					t.Errorf("POST /mcp response (-want +got):\n%s", diff)
				}
			})
		}
	})

	t.Run("accepts a notification without replying", func(t *testing.T) {
		t.Parallel()
		status, body := postMCP(t, server, "api-key", `{"jsonrpc":"2.0","method":"notifications/initialized"}`)
		if status != http.StatusAccepted || body != "" {
			t.Errorf("POST /mcp = %d %q, want 202 and empty body", status, body)
		}
	})
}
