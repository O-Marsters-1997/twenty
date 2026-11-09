package main

import (
	"context"
	"encoding/json"
	"io"
	"log/slog"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/riverqueue/river"

	"github.com/twentyhq/twenty/packages/twenty-server-go/internal/workflow"
	"github.com/twentyhq/twenty/packages/twenty-server-go/internal/workflow/store"
	"github.com/twentyhq/twenty/packages/twenty-server-go/internal/workspace"
)

type webhookStore struct {
	published string
	state     json.RawMessage
}

func (s *webhookStore) Workflow(context.Context, string) (store.Workflow, error) {
	return store.Workflow{ID: "wf", LastPublishedVersionID: s.published}, nil
}

func (s *webhookStore) Version(context.Context, string) (store.Version, error) {
	return store.Version{ID: "v1", WorkflowID: "wf", Status: "ACTIVE", Trigger: json.RawMessage(`{"type":"WEBHOOK"}`)}, nil
}

func (s *webhookStore) CreateRun(_ context.Context, run store.NewRun) (store.Run, error) {
	s.state = run.State
	return store.Run{ID: "run-1"}, nil
}

func TestWebhookRoutes(t *testing.T) {
	t.Parallel()
	path := "/webhooks/workflows/" + workspace.PinnedWorkspaceID + "/wf"

	serve := func(fake *webhookStore, method, target, body string) *httptest.ResponseRecorder {
		launcher := &workflow.Launcher{Store: fake, Queue: func(context.Context, river.JobArgs) error { return nil }}
		next := http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) { w.WriteHeader(http.StatusTeapot) })
		recorder := httptest.NewRecorder()
		webhookRoutes(launcher, next, slog.New(slog.NewTextHandler(io.Discard, nil))).
			ServeHTTP(recorder, httptest.NewRequest(method, target, strings.NewReader(body)))
		return recorder
	}

	t.Run("POST starts a run with the body as trigger context", func(t *testing.T) {
		t.Parallel()
		fake := &webhookStore{published: "v1"}

		recorder := serve(fake, http.MethodPost, path, `{"lead":"Ada"}`)

		if recorder.Code != http.StatusOK {
			t.Fatalf("status = %d, want 200: %s", recorder.Code, recorder.Body)
		}
		var response struct {
			RunID string `json:"workflowRunId"`
		}
		if err := json.Unmarshal(recorder.Body.Bytes(), &response); err != nil || response.RunID != "run-1" {
			t.Errorf("response = %s, want workflowRunId run-1", recorder.Body)
		}
		if !strings.Contains(string(fake.state), `"result":{"lead":"Ada"}`) {
			t.Errorf("state = %s, want body as trigger result", fake.state)
		}
	})

	t.Run("GET starts a run with an empty payload", func(t *testing.T) {
		t.Parallel()
		fake := &webhookStore{published: "v1"}

		if recorder := serve(fake, http.MethodGet, path, ""); recorder.Code != http.StatusOK {
			t.Errorf("status = %d, want 200", recorder.Code)
		}
	})

	t.Run("rejections", func(t *testing.T) {
		t.Parallel()
		tests := []struct {
			name   string
			store  *webhookStore
			target string
			body   string
			want   int
		}{
			{name: "unknown workspace", store: &webhookStore{published: "v1"}, target: "/webhooks/workflows/other/wf", want: http.StatusNotFound},
			{name: "unpublished workflow", store: &webhookStore{}, target: path, want: http.StatusBadRequest},
			{name: "non-JSON body", store: &webhookStore{published: "v1"}, target: path, body: "not json", want: http.StatusBadRequest},
		}
		for _, tt := range tests {
			t.Run(tt.name, func(t *testing.T) {
				t.Parallel()
				if got := serve(tt.store, http.MethodPost, tt.target, tt.body).Code; got != tt.want {
					t.Errorf("status = %d, want %d", got, tt.want)
				}
			})
		}
	})

	t.Run("other paths fall through", func(t *testing.T) {
		t.Parallel()
		if got := serve(&webhookStore{}, http.MethodPost, "/graphql", "{}").Code; got != http.StatusTeapot {
			t.Errorf("status = %d, want fall through", got)
		}
	})
}
