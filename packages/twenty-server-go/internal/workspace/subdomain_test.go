package workspace_test

import (
	"slices"
	"testing"

	"github.com/twentyhq/twenty/packages/twenty-server-go/internal/workspace"
)

func TestIsValidSubdomain(t *testing.T) {
	t.Parallel()
	tests := map[string]bool{"acme": true, "my-team-2": true, "Acme": false, "-acme": false, "api-gateway": false, "admin": false, "": false}
	for subdomain, want := range tests {
		if got := workspace.IsValidSubdomain(subdomain); got != want {
			t.Errorf("IsValidSubdomain(%q) = %t, want %t", subdomain, got, want)
		}
	}
}

func TestSubdomainFromEmail(t *testing.T) {
	t.Parallel()
	tests := []struct {
		email  string
		want   string
		wantOK bool
	}{
		{"pat@Acme.com", "acme", true},
		{"pat@mail.acme-corp.co.uk", "mail", true},
		{"sam@gmail.com", "", false},
		{"no-at-sign", "", false},
	}
	for _, tt := range tests {
		got, ok := workspace.SubdomainFromEmail(tt.email)
		if got != tt.want || ok != tt.wantOK {
			t.Errorf("SubdomainFromEmail(%q) = %q, %t, want %q, %t", tt.email, got, ok, tt.want, tt.wantOK)
		}
	}
}

func TestSubdomainCandidates_trimLongBases(t *testing.T) {
	t.Parallel()
	base := "abcdefghijklmnopqrstuvwxyz-abc"
	candidates := workspace.SubdomainCandidates(base)
	if candidates[0] != base {
		t.Errorf("first candidate = %q, want %q", candidates[0], base)
	}
	if want := "abcdefghijklmnopqrstuvwxyz-a-2"; candidates[1] != want {
		t.Errorf("second candidate = %q, want %q", candidates[1], want)
	}
	for _, candidate := range candidates {
		if len(candidate) > 30 {
			t.Errorf("candidate %q is %d characters, want at most 30", candidate, len(candidate))
		}
	}
	if slices.Contains(candidates[1:], base) {
		t.Errorf("candidates repeat the base %q", base)
	}
}
