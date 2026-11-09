package main

import (
	"encoding/json"
	"errors"
	"io"
	"log/slog"
	"net/http"
	"strings"

	"github.com/twentyhq/twenty/packages/twenty-server-go/internal/workflow"
	"github.com/twentyhq/twenty/packages/twenty-server-go/internal/workflow/store"
	"github.com/twentyhq/twenty/packages/twenty-server-go/internal/workspace"
)

const (
	webhookPath        = "/webhooks/workflows/{workspaceId}/{workflowId}"
	maxWebhookBodySize = 1 << 20
)

func webhookRoutes(launcher *workflow.Launcher, next http.Handler, logger *slog.Logger) http.Handler {
	mux := http.NewServeMux()
	handle := func(w http.ResponseWriter, r *http.Request) {
		if r.PathValue("workspaceId") != workspace.PinnedWorkspaceID {
			http.Error(w, "workspace not found", http.StatusNotFound)
			return
		}
		var payload json.RawMessage
		if r.Method == http.MethodPost {
			body, err := io.ReadAll(http.MaxBytesReader(w, r.Body, maxWebhookBodySize))
			var tooLarge *http.MaxBytesError
			switch {
			case errors.As(err, &tooLarge):
				http.Error(w, "body too large", http.StatusRequestEntityTooLarge)
				return
			case err != nil:
				logger.Warn("read webhook body", "err", err)
				http.Error(w, "unreadable body", http.StatusBadRequest)
				return
			case len(body) > 0 && !json.Valid(body):
				http.Error(w, "body must be JSON", http.StatusBadRequest)
				return
			}
			payload = body
		}
		run, err := launcher.LaunchWebhook(r.Context(), r.PathValue("workflowId"), payload)
		switch {
		case errors.Is(err, store.ErrNotFound):
			http.Error(w, "workflow not found", http.StatusNotFound)
		case errors.Is(err, workflow.ErrNotLaunchable):
			http.Error(w, err.Error(), http.StatusBadRequest)
		case err != nil:
			logger.Error("launch webhook workflow", "err", err)
			http.Error(w, "internal server error", http.StatusInternalServerError)
		default:
			w.Header().Set("Content-Type", "application/json")
			if err := json.NewEncoder(w).Encode(map[string]any{"success": true, "workflowRunId": run.ID}); err != nil {
				logger.Warn("write webhook response", "err", err)
			}
		}
	}
	mux.HandleFunc("GET "+webhookPath, handle)
	mux.HandleFunc("POST "+webhookPath, handle)
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if strings.HasPrefix(r.URL.Path, "/webhooks/workflows/") {
			mux.ServeHTTP(w, r)
			return
		}
		next.ServeHTTP(w, r)
	})
}
