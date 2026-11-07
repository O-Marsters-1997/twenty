package main

import (
	"bytes"
	"net/http"
	"net/http/httptest"
	"os"
	"path/filepath"
	"testing"

	"github.com/google/go-cmp/cmp"
	"github.com/twentyhq/twenty/packages/twenty-server-go/internal/golden"
)

func TestRun_recordsGoldenFile(t *testing.T) {
	node := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
		if _, err := w.Write([]byte(`{"data":{"ok":true}}`)); err != nil {
			t.Error(err)
		}
	}))
	t.Cleanup(node.Close)
	dir := t.TempDir()
	queryFile := filepath.Join(dir, "q.graphql")
	if err := os.WriteFile(queryFile, []byte("query Ok { ok }"), 0o600); err != nil {
		t.Fatal(err)
	}

	args := []string{"-node", node.URL, "-dir", dir, "-name", "ok", "-operation", "Ok", "-query-file", queryFile, "-fixture", "seed"}
	if err := run(args, &bytes.Buffer{}); err != nil {
		t.Fatal(err)
	}

	c, err := golden.Load(dir, "ok")
	if err != nil {
		t.Fatal(err)
	}
	got, err := golden.Mask(c.Response, nil)
	if err != nil {
		t.Fatal(err)
	}
	if diff := cmp.Diff(map[string]any{"data": map[string]any{"ok": true}}, got); diff != "" {
		t.Errorf("recorded response (-want +got):\n%s", diff)
	}
	if c.Operation != "Ok" || c.Fixture != "seed" {
		t.Errorf("recorded case = %+v", c)
	}
}

func TestRun_requiresFlags(t *testing.T) {
	if err := run(nil, &bytes.Buffer{}); err == nil {
		t.Error("run(nil) error = nil, want error")
	}
}
