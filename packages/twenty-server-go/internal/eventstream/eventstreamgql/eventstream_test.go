package eventstreamgql_test

import (
	"bytes"
	"encoding/json"
	"io"
	"log/slog"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/twentyhq/twenty/packages/twenty-server-go/internal/auth"
	"github.com/twentyhq/twenty/packages/twenty-server-go/internal/eventstream"
	"github.com/twentyhq/twenty/packages/twenty-server-go/internal/eventstream/eventstreamgql"
	"github.com/twentyhq/twenty/packages/twenty-server-go/internal/golden"
)

const workspaceID = "20202020-1c25-4d02-bf25-6aeccf7ea419"

func newHandler(t *testing.T, caller string) (http.Handler, *eventstream.Hub) {
	t.Helper()
	hub := eventstream.NewHub()
	if _, err := hub.Open(workspaceID, "stream-1", eventstream.Owner{UserWorkspaceID: "owner"}); err != nil {
		t.Fatal(err)
	}
	graphql := eventstreamgql.NewHandler(hub, slog.New(slog.NewTextHandler(io.Discard, nil)))
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		principal := auth.Principal{WorkspaceID: workspaceID, UserWorkspaceID: caller}
		graphql.ServeHTTP(w, r.WithContext(auth.WithPrincipal(r.Context(), principal)))
	}), hub
}

func TestOperations_MatchNodeGolden(t *testing.T) {
	t.Parallel()
	for _, name := range []string{"AddQueryToEventStream", "RemoveQueryFromEventStream", "AddQueryToMissingEventStream"} {
		t.Run(name, func(t *testing.T) {
			t.Parallel()
			handler, _ := newHandler(t, "owner")
			golden.Assert(t, handler, "testdata", name)
		})
	}
}

func TestOperations_RejectOtherUsers(t *testing.T) {
	t.Parallel()
	handler, _ := newHandler(t, "intruder")
	body, err := json.Marshal(map[string]any{"query": `mutation { removeQueryFromEventStream(input: {eventStreamId: "stream-1", queryId: "q"}) }`})
	if err != nil {
		t.Fatal(err)
	}
	request := httptest.NewRequestWithContext(t.Context(), http.MethodPost, "/metadata", bytes.NewReader(body))
	request.Header.Set("Content-Type", "application/json")
	recorder := httptest.NewRecorder()
	handler.ServeHTTP(recorder, request)
	var decoded struct {
		Errors []struct {
			Extensions map[string]string `json:"extensions"`
		} `json:"errors"`
	}
	if err := json.Unmarshal(recorder.Body.Bytes(), &decoded); err != nil {
		t.Fatalf("decode %s: %v", recorder.Body.String(), err)
	}
	if len(decoded.Errors) != 1 || decoded.Errors[0].Extensions["code"] != "FORBIDDEN" || decoded.Errors[0].Extensions["subCode"] != "NOT_AUTHORIZED" {
		t.Errorf("response = %s, want FORBIDDEN/NOT_AUTHORIZED", recorder.Body.String())
	}
}
