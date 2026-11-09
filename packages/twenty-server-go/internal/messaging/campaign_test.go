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

	for _, name := range []string{"welcome", "reminder"} {
		t.Run("matches twenty-emails output for "+name, func(t *testing.T) {
			t.Parallel()
			var variables map[string]any
			if err := json.Unmarshal(readFixture(t, name+".variables.json"), &variables); err != nil {
				t.Fatal(err)
			}

			html, text, err := messaging.GoRenderer{}.Render(context.Background(), string(readFixture(t, name+".json")), variables)
			if err != nil {
				t.Fatal(err)
			}

			if diff := cmp.Diff(string(readFixture(t, name+".html")), html); diff != "" {
				t.Errorf("html mismatch (-twenty-emails +go):\n%s", diff)
			}
			if diff := cmp.Diff(string(readFixture(t, name+".txt")), text); diff != "" {
				t.Errorf("text mismatch (-twenty-emails +go):\n%s", diff)
			}
		})
	}

	t.Run("rejects styling it cannot reproduce", func(t *testing.T) {
		t.Parallel()
		for _, template := range []string{
			`{"type":"doc","attrs":{"canvasTheme":{}},"content":[]}`,
			`{"type":"doc","content":[{"type":"paragraph","attrs":{"style":{"color":"red"}}}]}`,
		} {
			if _, _, err := (messaging.GoRenderer{}).Render(context.Background(), template, nil); !errors.Is(err, messaging.ErrUnsupportedNode) {
				t.Errorf("Render(%s) error = %v, want ErrUnsupportedNode", template, err)
			}
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
