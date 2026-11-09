package messaging_test

import (
	"context"
	"encoding/json"
	"errors"
	"os"
	"testing"

	"github.com/google/go-cmp/cmp"

	"github.com/twentyhq/twenty/packages/twenty-server-go/internal/messaging"
)

func readFixture(t *testing.T, name string) []byte {
	t.Helper()
	content, err := os.ReadFile("testdata/campaign/" + name)
	if err != nil {
		t.Fatal(err)
	}
	return content
}

func TestGoRenderer_Render(t *testing.T) {
	t.Parallel()

	t.Run("matches twenty-emails output", func(t *testing.T) {
		t.Parallel()
		var variables map[string]any
		if err := json.Unmarshal(readFixture(t, "welcome.variables.json"), &variables); err != nil {
			t.Fatal(err)
		}

		html, text, err := messaging.GoRenderer{}.Render(context.Background(), string(readFixture(t, "welcome.json")), variables)
		if err != nil {
			t.Fatal(err)
		}

		if diff := cmp.Diff(string(readFixture(t, "welcome.html")), html); diff != "" {
			t.Errorf("html mismatch (-twenty-emails +go):\n%s", diff)
		}
		if diff := cmp.Diff(string(readFixture(t, "welcome.txt")), text); diff != "" {
			t.Errorf("text mismatch (-twenty-emails +go):\n%s", diff)
		}
	})

	t.Run("rejects an unsupported node", func(t *testing.T) {
		t.Parallel()
		_, _, err := messaging.GoRenderer{}.Render(context.Background(), `{"type":"doc","content":[{"type":"image"}]}`, nil)
		if !errors.Is(err, messaging.ErrUnsupportedNode) {
			t.Fatalf("Render(image) error = %v, want ErrUnsupportedNode", err)
		}
	})

	t.Run("rejects invalid JSON", func(t *testing.T) {
		t.Parallel()
		if _, _, err := (messaging.GoRenderer{}).Render(context.Background(), `not json`, nil); err == nil {
			t.Fatal("Render(not json) error = nil, want error")
		}
	})
}
