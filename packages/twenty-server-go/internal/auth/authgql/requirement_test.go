package authgql_test

import (
	"testing"

	"github.com/twentyhq/twenty/packages/twenty-server-go/internal/auth"
)

func TestTwoFactor_Requirement(t *testing.T) {
	t.Parallel()

	t.Run("by method status and workspace enforcement", func(t *testing.T) {
		t.Parallel()
		h := newHarness(t)
		tests := []struct {
			name     string
			userID   string
			enforced bool
			want     auth.TwoFactorRequirement
		}{
			{"verified method", memberID, false, auth.TwoFactorVerifyRequired},
			{"verified method outranks enforcement", memberID, true, auth.TwoFactorVerifyRequired},
			{"no method, not enforced", freshID, false, auth.TwoFactorNotRequired},
			{"pending method, not enforced", pendingID, false, auth.TwoFactorNotRequired},
			{"no method, enforced", freshID, true, auth.TwoFactorProvisionRequired},
			{"pending method, enforced", pendingID, true, auth.TwoFactorProvisionRequired},
		}
		for _, tt := range tests {
			h.exec(t, `UPDATE core.workspace SET "isTwoFactorAuthenticationEnforced" = $1 WHERE id = $2`, tt.enforced, workspaceID)
			got, err := h.service.Requirement(t.Context(), tt.userID, workspaceID)
			if err != nil || got != tt.want {
				t.Errorf("Requirement(%s) = %q, %v, want %q", tt.name, got, err, tt.want)
			}
		}
	})

	t.Run("a user outside the workspace is an error", func(t *testing.T) {
		t.Parallel()
		h := newHarness(t)
		if got, err := h.service.Requirement(t.Context(), outsiderID, workspaceID); err == nil {
			t.Errorf("Requirement(outsider) = %q, nil, want an error", got)
		}
	})
}
