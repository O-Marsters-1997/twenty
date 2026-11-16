package frontdoor_test

import (
	"bytes"
	"context"
	"io"
	"log/slog"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/twentyhq/twenty/packages/twenty-server-go/internal/auth"
	"github.com/twentyhq/twenty/packages/twenty-server-go/internal/frontdoor"
)

type fakeVerifier struct{}

func (fakeVerifier) Verify(_ context.Context, bearer string) (auth.Principal, error) {
	if bearer == "valid" {
		return auth.Principal{UserID: "user-1"}, nil
	}
	return auth.Principal{}, auth.ErrUnauthenticated
}

type fixture struct {
	front *httptest.Server
	logs  *bytes.Buffer
}

func newFixture(t *testing.T) fixture {
	t.Helper()
	logs := &bytes.Buffer{}
	goGraphQL := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		principal, _ := auth.PrincipalFrom(r.Context())
		_, _ = w.Write([]byte("go handled for " + principal.UserID))
	})
	handler := frontdoor.NewHandler(fakeVerifier{}, goGraphQL, slog.New(slog.NewTextHandler(logs, nil))).
		WithPublicOperations(map[frontdoor.Endpoint][]string{frontdoor.EndpointWorkspace: {"PublicGo"}})
	front := httptest.NewServer(handler)
	t.Cleanup(front.Close)
	return fixture{front: front, logs: logs}
}

func (f fixture) post(t *testing.T, path, body string) string {
	t.Helper()
	resp, err := http.Post(f.front.URL+path, "application/json", strings.NewReader(body))
	if err != nil {
		t.Fatal(err)
	}
	got, err := io.ReadAll(resp.Body)
	if err != nil {
		t.Fatal(err)
	}
	if err := resp.Body.Close(); err != nil {
		t.Error(err)
	}
	return string(got)
}

func TestHandler_ServeHTTP(t *testing.T) {
	t.Run("blocks model mutations", func(t *testing.T) {
		f := newFixture(t)
		tests := []struct{ name, body string }{
			{"by name", `{"operationName":"CreateOneObjectMetadataItem","query":"mutation { x }"}`},
			{"renamed", `{"operationName":"Innocent","query":"mutation Innocent { deleteOneField(input:{}) { id } }"}`},
			{"inside a batch", `[{"operationName":"A","query":"{ a }"},{"operationName":"UpdateOneFieldMetadataItem","query":"mutation { x }"}]`},
		}
		for _, tt := range tests {
			t.Run(tt.name, func(t *testing.T) {
				if got := f.post(t, "/metadata", tt.body); !strings.Contains(got, `"FORBIDDEN"`) {
					t.Errorf("post = %q, want a FORBIDDEN GraphQL error", got)
				}
			})
		}
	})

	t.Run("serves a public operation without a bearer, unless a batch mixes in a private one", func(t *testing.T) {
		f := newFixture(t)
		tests := []struct{ name, body, want string }{
			{"public alone", `{"operationName":"PublicGo","query":"{ a }"}`, "go handled for "},
			{"public batch", `[{"operationName":"PublicGo","query":"{ a }"},{"operationName":"PublicGo","query":"{ b }"}]`, "go handled for "},
			{"public with a private operation", `[{"operationName":"PublicGo","query":"{ a }"},{"operationName":"GoOnly","query":"{ b }"}]`, `"UNAUTHENTICATED"`},
			{"private alone", `{"operationName":"GoOnly","query":"{ a }"}`, `"UNAUTHENTICATED"`},
		}
		for _, tt := range tests {
			if got := f.post(t, "/graphql", tt.body); !strings.Contains(got, tt.want) {
				t.Errorf("post(%s) = %s, want it to contain %s", tt.name, got, tt.want)
			}
		}
	})

	t.Run("requires a valid access token", func(t *testing.T) {
		f := newFixture(t)
		body := `{"operationName":"GoOnly","query":"{ a }"}`
		tests := []struct{ name, authorization, want string }{
			{"missing", "", `"UNAUTHENTICATED"`},
			{"invalid", "Bearer nope", `"UNAUTHENTICATED"`},
			{"valid", "Bearer valid", "go handled for user-1"},
		}
		for _, tt := range tests {
			t.Run(tt.name, func(t *testing.T) {
				req, err := http.NewRequestWithContext(t.Context(), http.MethodPost, f.front.URL+"/graphql", strings.NewReader(body))
				if err != nil {
					t.Fatal(err)
				}
				req.Header.Set("Content-Type", "application/json")
				req.Header.Set("Authorization", tt.authorization)
				resp, err := http.DefaultClient.Do(req)
				if err != nil {
					t.Fatal(err)
				}
				got, err := io.ReadAll(resp.Body)
				if err != nil {
					t.Fatal(err)
				}
				if err := resp.Body.Close(); err != nil {
					t.Error(err)
				}
				if !strings.Contains(string(got), tt.want) {
					t.Errorf("response = %s, want it to contain %s", got, tt.want)
				}
			})
		}
	})

	t.Run("answers non-GraphQL traffic with 404", func(t *testing.T) {
		f := newFixture(t)
		resp, err := http.Get(f.front.URL + "/rest/people")
		if err != nil {
			t.Fatal(err)
		}
		if err := resp.Body.Close(); err != nil {
			t.Error(err)
		}
		if resp.StatusCode != http.StatusNotFound {
			t.Errorf("GET /rest/people status = %d, want 404", resp.StatusCode)
		}
	})
}
