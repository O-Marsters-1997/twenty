package workspace_test

import (
	"testing"

	"github.com/twentyhq/twenty/packages/twenty-server-go/internal/workspace"
)

func TestNormalizeIframeOrigin(t *testing.T) {
	t.Parallel()

	t.Run("normalizes", func(t *testing.T) {
		t.Parallel()
		tests := map[string]string{
			"https://PORTAL.example.com/":      "https://portal.example.com",
			"https://portal.example.com:443":   "https://portal.example.com",
			"https://portal.example.com:8443":  "https://portal.example.com:8443",
			"https://localhost":                "https://localhost",
			"http://PORTAL.corp.lan:80/":       "http://portal.corp.lan",
			"http://localhost:3001":            "http://localhost:3001",
			"HTTPS://Portal.Example.com:08443": "https://portal.example.com:8443",
		}
		for value, want := range tests {
			if got, ok := workspace.NormalizeIframeOrigin(value); !ok || got != want {
				t.Errorf("NormalizeIframeOrigin(%q) = %q, %v, want %q, true", value, got, ok, want)
			}
		}
	})

	t.Run("rejects", func(t *testing.T) {
		t.Parallel()
		for _, value := range []string{
			"http://[::1]:3000", "https://[2001:db8::1]", "*", "null", "https://*.example.com", "https://example.com/path",
			"https://example.com/.", "https://example.com?", "https://example.com#", "https://@example.com",
			"https://example.com?query=1", "https://example.com#fragment", "https://user:password@example.com",
			"https://example.com;script-src", "https://example.com\r\nX-Test: yes", "https://example.com https://evil.com",
			"https:example.com", "https://example.com\\evil", "https://example..com", "https://example.com:99999", "javascript:alert(1)",
		} {
			if got, ok := workspace.NormalizeIframeOrigin(value); ok {
				t.Errorf("NormalizeIframeOrigin(%q) = %q, true, want rejection", value, got)
			}
		}
	})
}
