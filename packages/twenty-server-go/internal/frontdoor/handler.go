package frontdoor

import (
	"bytes"
	"encoding/json"
	"io"
	"log/slog"
	"mime"
	"net/http"
	"net/http/httputil"
	"net/url"
	"strings"
)

const maxInspectedBodyBytes = 1 << 20

type Handler struct {
	table  OperationTable
	proxy  *httputil.ReverseProxy
	logger *slog.Logger
}

func NewHandler(table OperationTable, upstream *url.URL, logger *slog.Logger) *Handler {
	proxy := httputil.NewSingleHostReverseProxy(upstream)
	proxy.FlushInterval = -1 // SSE streams must not be buffered
	return &Handler{table: table, proxy: proxy, logger: logger}
}

type graphqlRequest struct {
	OperationName string `json:"operationName"`
	Query         string `json:"query"`
}

func (h *Handler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	endpoint := Endpoint(r.URL.Path)
	if r.Method != http.MethodPost || (endpoint != EndpointWorkspace && endpoint != EndpointMetadata) || !isJSON(r) {
		h.proxy.ServeHTTP(w, r)
		return
	}

	body, err := io.ReadAll(io.LimitReader(r.Body, maxInspectedBodyBytes+1))
	if err != nil {
		http.Error(w, "read request body", http.StatusBadRequest)
		return
	}
	if len(body) > maxInspectedBodyBytes {
		// Too large to inspect: restore the stream and let Node apply its own limits.
		r.Body = io.NopCloser(io.MultiReader(bytes.NewReader(body), r.Body))
		h.logger.Warn("graphql request not inspected", "route", RouteNode)
		h.proxy.ServeHTTP(w, r)
		return
	}
	r.Body = io.NopCloser(bytes.NewReader(body))

	route := RouteNode
	for _, request := range parseRequests(body) {
		operationRoute := h.routeFor(endpoint, request)
		h.logger.Info("graphql request", "operation", request.OperationName, "route", operationRoute)
		route = mostRestrictive(route, operationRoute)
	}

	switch route {
	case RouteBlocked:
		h.writeGraphQLError(w, "this operation is disabled: the data model is frozen", "FORBIDDEN")
	case RouteGo:
		h.writeGraphQLError(w, "operation not implemented", "INTERNAL_SERVER_ERROR")
	default:
		h.proxy.ServeHTTP(w, r)
	}
}

func (h *Handler) routeFor(endpoint Endpoint, request graphqlRequest) Route {
	if endpoint == EndpointMetadata {
		for _, field := range blockedMetadataFields {
			if strings.Contains(request.Query, field) {
				return RouteBlocked
			}
		}
	}
	if route, ok := h.table[endpoint][request.OperationName]; ok {
		return route
	}
	return RouteNode
}

func mostRestrictive(current, candidate Route) Route {
	switch {
	case current == RouteBlocked || candidate == RouteBlocked:
		return RouteBlocked
	case current == RouteGo || candidate == RouteGo:
		return RouteGo
	}
	return RouteNode
}

// parseRequests accepts a single GraphQL request or a batch; unparseable
// bodies yield none and fall through to Node, which reports the error.
func parseRequests(body []byte) []graphqlRequest {
	trimmed := bytes.TrimSpace(body)
	if bytes.HasPrefix(trimmed, []byte("[")) {
		var batch []graphqlRequest
		if err := json.Unmarshal(trimmed, &batch); err != nil {
			return nil
		}
		return batch
	}
	var single graphqlRequest
	if err := json.Unmarshal(trimmed, &single); err != nil {
		return nil
	}
	return []graphqlRequest{single}
}

func isJSON(r *http.Request) bool {
	mediaType, _, err := mime.ParseMediaType(r.Header.Get("Content-Type"))
	return err == nil && mediaType == "application/json"
}

func (h *Handler) writeGraphQLError(w http.ResponseWriter, message, code string) {
	w.Header().Set("Content-Type", "application/json")
	err := json.NewEncoder(w).Encode(map[string]any{
		"errors": []map[string]any{{"message": message, "extensions": map[string]string{"code": code}}},
	})
	if err != nil {
		h.logger.Warn("write graphql error", "err", err)
	}
}
