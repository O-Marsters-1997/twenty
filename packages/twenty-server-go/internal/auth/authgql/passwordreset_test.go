package authgql_test

import (
	"context"
	"strings"
	"sync"
	"testing"

	"github.com/twentyhq/twenty/packages/twenty-server-go/internal/auth"
	"github.com/twentyhq/twenty/packages/twenty-server-go/internal/golden"
	"github.com/twentyhq/twenty/packages/twenty-server-go/internal/systemmail"
)

type recordingSender struct {
	mu   sync.Mutex
	sent []systemmail.Message
}

func (s *recordingSender) Send(_ context.Context, message systemmail.Message) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.sent = append(s.sent, message)
	return nil
}

func (h *loginHarness) resetToken(t *testing.T, plain, expiresAt string) {
	t.Helper()
	h.exec(t, `INSERT INTO core."appToken" ("userId", type, value, "expiresAt") VALUES ($1, 'PASSWORD_RESET_TOKEN', $2, $3::timestamptz)`,
		memberUserID, auth.HashAppToken(plain), expiresAt)
}

func TestPasswordReset_MatchesGolden(t *testing.T) {
	t.Parallel()
	for _, name := range []string{
		"validate-password-reset-token", "validate-password-reset-token-invalid",
		"update-password-via-reset-token", "update-password-via-reset-token-weak",
		"email-password-reset-link", "email-password-reset-link-unknown",
	} {
		t.Run(name, func(t *testing.T) {
			t.Parallel()
			h := newPasswordHarness(t, false)
			h.resetToken(t, "live-reset-token", "2999-01-01")
			golden.Assert(t, h.handler, "testdata/golden", name)
		})
	}
}

func TestPasswordReset_ExpiredAndRevokedTokensAreInvalid(t *testing.T) {
	t.Parallel()
	h := newPasswordHarness(t, false)
	h.resetToken(t, "expired-token", "2000-01-01")
	h.resetToken(t, "revoked-token", "2999-01-01")
	h.exec(t, `UPDATE core."appToken" SET "revokedAt" = now() WHERE value = $1`, auth.HashAppToken("revoked-token"))
	for _, token := range []string{"expired-token", "revoked-token"} {
		response, _ := h.send(t, `query V($token: String!) { validatePasswordResetToken(passwordResetToken: $token) { id } }`, map[string]any{"token": token})
		if got := errorOf(t, response)["message"]; got != "Token is invalid" {
			t.Errorf("validate(%s) error = %v, want Token is invalid", token, got)
		}
	}
}

func TestPasswordReset_UpdateChangesPasswordAndRevokesToken(t *testing.T) {
	t.Parallel()
	h := newPasswordHarness(t, false)
	h.resetToken(t, "live-reset-token", "2999-01-01")
	const mutation = `mutation U($token: String!, $newPassword: String!) { updatePasswordViaResetToken(passwordResetToken: $token, newPassword: $newPassword) { success } }`
	variables := map[string]any{"token": "live-reset-token", "newPassword": "brand new secret"}
	if response, _ := h.send(t, mutation, variables); response["errors"] != nil {
		t.Fatalf("first update = %v", response)
	}
	var hash string
	if err := h.pool.QueryRow(t.Context(), `SELECT "passwordHash" FROM core."user" WHERE id = $1`, memberUserID).Scan(&hash); err != nil {
		t.Fatal(err)
	}
	if err := auth.NewPasswordHasher().Compare(hash, "brand new secret"); err != nil {
		t.Errorf("stored hash does not match new password: %v", err)
	}
	if response, _ := h.send(t, mutation, variables); response["errors"] == nil {
		t.Errorf("second update with the same token succeeded: %v", response)
	}
}

func TestPasswordReset_EmailLinkSendsOneMailAndRotatesToken(t *testing.T) {
	t.Parallel()
	h := newPasswordHarness(t, false)
	h.resetToken(t, "live-reset-token", "2999-01-01")
	const mutation = `mutation E($email: String!) { emailPasswordResetLink(email: $email) { success } }`
	h.send(t, mutation, map[string]any{"email": "Member@Example.com"})
	h.send(t, mutation, map[string]any{"email": "nobody@example.com"})

	if len(h.mail.sent) != 1 || h.mail.sent[0].To != "member@example.com" || !strings.Contains(h.mail.sent[0].Text, "/reset-password/") {
		t.Fatalf("sent = %+v, want one reset mail to member@example.com", h.mail.sent)
	}
	var live int
	if err := h.pool.QueryRow(t.Context(),
		`SELECT count(*) FROM core."appToken" WHERE "userId" = $1 AND type = 'PASSWORD_RESET_TOKEN' AND "revokedAt" IS NULL`, memberUserID).Scan(&live); err != nil {
		t.Fatal(err)
	}
	if live != 1 {
		t.Errorf("live reset tokens = %d, want 1", live)
	}
}
