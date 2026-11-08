package golden

import (
	"fmt"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/google/go-cmp/cmp"
)

func Diff(handler http.Handler, dir, name string, ignore ...string) (string, error) {
	c, err := Load(dir, name)
	if err != nil {
		return "", err
	}
	server := httptest.NewServer(handler)
	defer server.Close()
	got, err := Send(server.Client(), server.URL, "", c)
	if err != nil {
		return "", err
	}
	want, err := Mask(c.Response, ignore)
	if err != nil {
		return "", fmt.Errorf("golden file: %w", err)
	}
	gotDoc, err := Mask(got, ignore)
	if err != nil {
		return "", fmt.Errorf("go handler: %w: %s", err, got)
	}
	return cmp.Diff(want, gotDoc), nil
}

func Assert(t *testing.T, handler http.Handler, dir, name string, ignore ...string) {
	t.Helper()
	diff, err := Diff(handler, dir, name, ignore...)
	if err != nil {
		t.Fatal(err)
	}
	if diff != "" {
		t.Errorf("%s differs from golden file (-golden +got):\n%s", name, diff)
	}
}
