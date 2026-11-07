package frontdoor_test

import (
	"bytes"
	"io"
	"log/slog"
	"net/http"
	"net/http/httptest"
	"net/url"
	"strings"
	"sync/atomic"
	"testing"

	"github.com/twentyhq/twenty/packages/twenty-server-go/internal/frontdoor"
)

type fixture struct {
	front *httptest.Server
	hits  *atomic.Int32
	logs  *bytes.Buffer
}

func newFixture(t *testing.T) fixture {
	t.Helper()
	hits := &atomic.Int32{}
	node := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		hits.Add(1)
		body, err := io.ReadAll(r.Body)
		if err != nil {
			t.Error(err)
		}
		if _, err := w.Write(append([]byte("node:"), body...)); err != nil {
			t.Error(err)
		}
	}))
	t.Cleanup(node.Close)
	upstream, err := url.Parse(node.URL)
	if err != nil {
		t.Fatal(err)
	}
	logs := &bytes.Buffer{}
	handler := frontdoor.NewHandler(frontdoor.DefaultTable(), upstream, slog.New(slog.NewTextHandler(logs, nil)))
	front := httptest.NewServer(handler)
	t.Cleanup(front.Close)
	return fixture{front: front, hits: hits, logs: logs}
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
	t.Run("proxies an ordinary operation intact and logs its route", func(t *testing.T) {
		f := newFixture(t)
		body := `{"operationName":"FindManyPeople","query":"query FindManyPeople { people { id } }"}`
		if got := f.post(t, "/graphql", body); got != "node:"+body {
			t.Errorf("post = %q, want body forwarded intact", got)
		}
		if !strings.Contains(f.logs.String(), "operation=FindManyPeople route=node") {
			t.Errorf("log missing operation and route: %s", f.logs)
		}
	})

	t.Run("blocks model mutations without reaching node", func(t *testing.T) {
		f := newFixture(t)
		tests := []struct{ name, body string }{
			{"by name", `{"operationName":"CreateOneObjectMetadataItem","query":"mutation CreateOneObjectMetadataItem { createOneObject { id } }"}`},
			{"renamed", `{"operationName":"Innocent","query":"mutation Innocent { deleteOneField(input:{}) { id } }"}`},
			{"inside a batch", `[{"operationName":"A","query":"{ a }"},{"operationName":"UpdateOneFieldMetadataItem","query":"mutation { x }"}]`},
		}
		for _, tt := range tests {
			t.Run(tt.name, func(t *testing.T) {
				if got := f.post(t, "/metadata", tt.body); !strings.Contains(got, `"FORBIDDEN"`) {
					t.Errorf("post = %q, want a GraphQL error", got)
				}
			})
		}
		if hits := f.hits.Load(); hits != 0 {
			t.Errorf("node hits = %d, want 0", hits)
		}
		if !strings.Contains(f.logs.String(), "route=blocked") {
			t.Errorf("blocked route not logged: %s", f.logs)
		}
	})

	t.Run("proxies non-GraphQL traffic", func(t *testing.T) {
		f := newFixture(t)
		resp, err := http.Get(f.front.URL + "/rest/people")
		if err != nil {
			t.Fatal(err)
		}
		if err := resp.Body.Close(); err != nil {
			t.Error(err)
		}
		if hits := f.hits.Load(); hits != 1 {
			t.Errorf("node hits = %d, want 1", hits)
		}
	})
}
