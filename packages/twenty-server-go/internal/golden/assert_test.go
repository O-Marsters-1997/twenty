package golden_test

import (
	"net/http"
	"strings"
	"testing"

	"github.com/twentyhq/twenty/packages/twenty-server-go/internal/golden"
)

const recorded = `{"data":{"people":[{"id":"a","name":"Ann"},{"id":"b","name":"Bo"}]}}`

func respondWith(t *testing.T, body string) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
		if _, err := w.Write([]byte(body)); err != nil {
			t.Error(err)
		}
	})
}

func saveRecorded(t *testing.T) string {
	t.Helper()
	dir := t.TempDir()
	c := golden.Case{Name: "people", Operation: "People", Fixture: "seed", Endpoint: "/graphql", Query: "query People { people }", Response: []byte(recorded)}
	if err := golden.Save(dir, c); err != nil {
		t.Fatal(err)
	}
	return dir
}

func TestDiff(t *testing.T) {
	regeneratedIDs := `{"data":{"people":[{"id":"x","name":"Ann"},{"id":"y","name":"Bo"}]}}`
	renamed := `{"data":{"people":[{"id":"a","name":"Ann"},{"id":"b","name":"Bob"}]}}`

	tests := []struct {
		name     string
		response string
		ignore   []string
		wantDiff string
	}{
		{name: "identical", response: recorded},
		{name: "ignored volatile field", response: regeneratedIDs, ignore: []string{"data.people.*.id"}},
		{name: "volatile field not ignored by default", response: regeneratedIDs, wantDiff: `"x"`},
		{name: "real difference with ignore set", response: renamed, ignore: []string{"data.people.*.id"}, wantDiff: `"Bob"`},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			diff, err := golden.Diff(respondWith(t, tt.response), saveRecorded(t), "people", tt.ignore...)
			if err != nil {
				t.Fatal(err)
			}
			if (diff == "") != (tt.wantDiff == "") || !strings.Contains(diff, tt.wantDiff) {
				t.Errorf("Diff() = %q, want it to contain %q", diff, tt.wantDiff)
			}
		})
	}
}

func TestDiff_missingGoldenFile(t *testing.T) {
	if _, err := golden.Diff(respondWith(t, "{}"), t.TempDir(), "absent"); err == nil {
		t.Error("Diff() error = nil, want error")
	}
}

func TestAssert_matchingResponse(t *testing.T) {
	golden.Assert(t, respondWith(t, recorded), saveRecorded(t), "people")
}
