package frontdoor

import (
	"encoding/json"
	"errors"
	"io"
	"net/http"
	"strings"

	"github.com/twentyhq/twenty/packages/twenty-server-go/internal/ai"
	"github.com/twentyhq/twenty/packages/twenty-server-go/internal/auth"
)

const (
	mcpPath            = "/mcp"
	mcpProtocolVersion = "2025-03-26"

	rpcParseError     = -32700
	rpcMethodNotFound = -32601
	rpcInvalidParams  = -32602
)

type rpcRequest struct {
	ID     json.RawMessage `json:"id"`
	Method string          `json:"method"`
	Params json.RawMessage `json:"params"`
}

type rpcError struct {
	Code    int    `json:"code"`
	Message string `json:"message"`
}

type rpcResponse struct {
	JSONRPC string          `json:"jsonrpc"`
	ID      json.RawMessage `json:"id"`
	Result  any             `json:"result,omitempty"`
	Error   *rpcError       `json:"error,omitempty"`
}

type mcpTool struct {
	Name        string          `json:"name"`
	Description string          `json:"description"`
	InputSchema json.RawMessage `json:"inputSchema"`
}

type mcpContent struct {
	Type string `json:"type"`
	Text string `json:"text"`
}

type mcpCallResult struct {
	Content []mcpContent `json:"content"`
	IsError bool         `json:"isError,omitempty"`
}

func (h *Handler) WithMCP(registry ai.Registry) *Handler {
	h.mcpTools = registry
	return h
}

func (h *Handler) serveMCP(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		return
	}
	bearer, hasBearer := strings.CutPrefix(r.Header.Get("Authorization"), "Bearer ")
	if !hasBearer {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}
	principal, err := h.verifier.Verify(r.Context(), bearer)
	switch {
	case errors.Is(err, auth.ErrUnauthenticated), err == nil && principal.APIKeyID == "":
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	case err != nil:
		h.logger.Error("verify api key", "err", err)
		http.Error(w, "Internal server error", http.StatusInternalServerError)
		return
	}

	body, err := io.ReadAll(io.LimitReader(r.Body, maxInspectedBodyBytes+1))
	if err != nil || len(body) > maxInspectedBodyBytes {
		http.Error(w, "read request body", http.StatusBadRequest)
		return
	}
	var request rpcRequest
	if err := json.Unmarshal(body, &request); err != nil {
		h.writeRPC(w, rpcResponse{Error: &rpcError{Code: rpcParseError, Message: "parse error"}})
		return
	}
	if len(request.ID) == 0 {
		w.WriteHeader(http.StatusAccepted)
		return
	}
	response := rpcResponse{ID: request.ID}
	response.Result, response.Error = h.dispatchMCP(r, principal, request)
	h.writeRPC(w, response)
}

func (h *Handler) dispatchMCP(r *http.Request, principal auth.Principal, request rpcRequest) (any, *rpcError) {
	switch request.Method {
	case "initialize":
		return map[string]any{
			"protocolVersion": mcpProtocolVersion,
			"capabilities":    map[string]any{"tools": map[string]any{}},
			"serverInfo":      map[string]string{"name": "twenty", "version": "1"},
		}, nil
	case "ping":
		return map[string]any{}, nil
	case "tools/list":
		tools := []mcpTool{}
		for _, tool := range h.mcpTools.Tools(r.Context(), principal) {
			spec := tool.Spec()
			tools = append(tools, mcpTool{Name: spec.Name, Description: spec.Description, InputSchema: spec.InputSchema})
		}
		return map[string]any{"tools": tools}, nil
	case "tools/call":
		var params struct {
			Name      string          `json:"name"`
			Arguments json.RawMessage `json:"arguments"`
		}
		if err := json.Unmarshal(request.Params, &params); err != nil {
			return nil, &rpcError{Code: rpcInvalidParams, Message: "invalid params"}
		}
		tool, ok := h.mcpTools.Lookup(params.Name)
		if !ok {
			return nil, &rpcError{Code: rpcInvalidParams, Message: "unknown tool " + params.Name}
		}
		out, err := tool.Call(r.Context(), principal, params.Arguments)
		if err != nil {
			h.logger.Warn("mcp tool call", "tool", params.Name, "err", err)
			return mcpCallResult{Content: []mcpContent{{Type: "text", Text: err.Error()}}, IsError: true}, nil
		}
		return mcpCallResult{Content: []mcpContent{{Type: "text", Text: string(out)}}}, nil
	}
	return nil, &rpcError{Code: rpcMethodNotFound, Message: "method not found"}
}

func (h *Handler) writeRPC(w http.ResponseWriter, response rpcResponse) {
	response.JSONRPC = "2.0"
	if response.ID == nil {
		response.ID = json.RawMessage("null")
	}
	w.Header().Set("Content-Type", "application/json")
	if err := json.NewEncoder(w).Encode(response); err != nil {
		h.logger.Warn("write mcp response", "err", err)
	}
}
