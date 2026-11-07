package frontdoor

import (
	"bytes"
	"encoding/json"
	"errors"
	"io"
	"log/slog"
	"mime"
	"net/http"
	"net/http/httputil"
	"net/url"
	"strings"

	"github.com/twentyhq/twenty/packages/twenty-server-go/internal/auth"
)

const maxInspectedBodyBytes = 1 << 20

type Handler struct {
	table    OperationTable
	proxy    *httputil.ReverseProxy
	verifier auth.Verifier
	logger   *slog.Logger
}

func NewHandler(table OperationTable, upstream *url.URL, verifier auth.Verifier, logger *slog.Logger) *Handler {
	proxy := httputil.NewSingleHostReverseProxy(upstream)
	proxy.FlushInterval = -1 // SSE streams must not be buffered
	return &Handler{table: table, proxy: proxy, verifier: verifier, logger: logger}
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
		if endpoint == EndpointMetadata {
			h.logger.Warn("metadata request too large to inspect", "route", RouteBlocked)
			h.writeGraphQLError(w, "request too large", "BAD_USER_INPUT")
			return
		}
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
		if _, ok := h.authenticate(w, r); !ok {
			return
		}
		h.writeGraphQLError(w, "operation not implemented", "INTERNAL_SERVER_ERROR")
	default:
		h.proxy.ServeHTTP(w, r)
	}
}

func (h *Handler) authenticate(w http.ResponseWriter, r *http.Request) (auth.Principal, bool) {
	bearer, hasBearer := strings.CutPrefix(r.Header.Get("Authorization"), "Bearer ")
	if !hasBearer {
		h.writeGraphQLError(w, "Unauthorized", "UNAUTHENTICATED")
		return auth.Principal{}, false
	}
	principal, err := h.verifier.Verify(r.Context(), bearer)
	switch {
	case errors.Is(err, auth.ErrUnauthenticated):
		h.writeGraphQLError(w, "Unauthorized", "UNAUTHENTICATED")
		return auth.Principal{}, false
	case err != nil:
		h.logger.Error("verify access token", "err", err)
		h.writeGraphQLError(w, "Internal server error", "INTERNAL_SERVER_ERROR")
		return auth.Principal{}, false
	}
	return principal, true
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
