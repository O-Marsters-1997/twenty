package auth_test

import (
	"errors"
	"testing"
	"time"

	"github.com/twentyhq/twenty/packages/twenty-server-go/internal/auth"
)

func TestVerifyApprovedAccessDomainToken(t *testing.T) {
	t.Parallel()
	env := newTokenEnv(t)
	issue := func(ttl time.Duration) string {
		token, err := env.issuer.IssueApprovedAccessDomainToken(t.Context(), "ada@acme.test", env.node.WorkspaceID, ttl)
		if err != nil {
			t.Fatal(err)
		}
		return token
	}

	t.Run("round trip", func(t *testing.T) {
		got, err := env.issuer.VerifyApprovedAccessDomainToken(t.Context(), issue(time.Hour))
		if err != nil {
			t.Fatal(err)
		}
		if got.Email != "ada@acme.test" || got.WorkspaceID != env.node.WorkspaceID {
			t.Errorf("claims = %+v, want ada@acme.test in the issuing workspace", got)
		}
	})
	rejected := map[string]string{
		"expired":      issue(-time.Hour),
		"access token": env.node.Access,
		"garbage":      "not-a-token",
	}
	for name, token := range rejected {
		t.Run(name, func(t *testing.T) {
			_, err := env.issuer.VerifyApprovedAccessDomainToken(t.Context(), token)
			if !errors.Is(err, auth.ErrInvalidApprovedAccessDomainToken) {
				t.Errorf("error = %v, want ErrInvalidApprovedAccessDomainToken", err)
			}
		})
	}
}
