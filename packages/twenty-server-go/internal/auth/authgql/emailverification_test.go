package authgql_test

import (
	"net/http"
	"strings"
	"testing"

	"github.com/google/go-cmp/cmp"

	"github.com/twentyhq/twenty/packages/twenty-server-go/internal/auth"
	"github.com/twentyhq/twenty/packages/twenty-server-go/internal/golden"
)

const (
	resendMutation  = `mutation R($email: String!, $origin: String!) { resendEmailVerificationToken(email: $email, origin: $origin) { success } }`
	verifyMutation  = `mutation V($token: String!, $email: String!, $origin: String!) { verifyEmailAndGetLoginToken(emailVerificationToken: $token, email: $email, origin: $origin) { loginToken { token } workspaceUrls { subdomainUrl } } }`
	updateMutation  = `mutation U($newEmail: String!, $path: String) { updateUserEmail(newEmail: $newEmail, verifyEmailRedirectPath: $path) }`
	verificationRaw = "live-verification-token"
)

func (h *loginHarness) verificationToken(t *testing.T, plain, email, expiresAt string) {
	t.Helper()
	h.exec(t, `INSERT INTO core."appToken" ("userId", type, value, "expiresAt", context) VALUES ($1, 'EMAIL_VERIFICATION_TOKEN', $2, $3::timestamptz, jsonb_build_object('email', $4::text))`,
		unverifiedUserID, auth.HashAppToken(plain), expiresAt, email)
}

func (h *loginHarness) asMember() http.Handler {
	inner := h.handler
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		principal := auth.Principal{UserID: memberUserID, WorkspaceID: acmeWorkspaceID}
		inner.ServeHTTP(w, r.WithContext(auth.WithPrincipal(r.Context(), principal)))
	})
}

func TestEmailVerification_MatchesGolden(t *testing.T) {
	t.Parallel()
	tokens := []string{
		"data.verifyEmailAndGetLoginToken.loginToken.token", "data.verifyEmailAndGetLoginToken.loginToken.expiresAt",
		"data.verifyEmailAndGetWorkspaceAgnosticToken.availableWorkspaces.availableWorkspacesForSignIn.*.loginToken",
		"data.verifyEmailAndGetWorkspaceAgnosticToken.tokens.accessOrWorkspaceAgnosticToken.token",
		"data.verifyEmailAndGetWorkspaceAgnosticToken.tokens.accessOrWorkspaceAgnosticToken.expiresAt",
		"data.verifyEmailAndGetWorkspaceAgnosticToken.tokens.refreshToken.token",
		"data.verifyEmailAndGetWorkspaceAgnosticToken.tokens.refreshToken.expiresAt",
	}
	for _, name := range []string{
		"resend-email-verification-token", "verify-email-and-get-login-token", "verify-email-and-get-login-token-mismatch",
		"verify-email-and-get-workspace-agnostic-token", "update-user-email",
	} {
		t.Run(name, func(t *testing.T) {
			t.Parallel()
			h := newPasswordHarness(t, true)
			h.verificationToken(t, verificationRaw, "unverified@example.com", "2999-01-01")
			golden.Assert(t, h.asMember(), "testdata/golden", name, tokens...)
		})
	}
}

func TestEmailVerification_ResendReplacesTokenAndMailsLink(t *testing.T) {
	t.Parallel()
	h := newPasswordHarness(t, true)
	h.verificationToken(t, verificationRaw, "unverified@example.com", "2999-01-01")
	variables := map[string]any{"email": "unverified@example.com", "origin": acmeOrigin}
	if response, _ := h.send(t, resendMutation, variables); response["errors"] != nil {
		t.Fatalf("resend = %v", response)
	}
	if len(h.mail.sent) != 1 || h.mail.sent[0].To != "unverified@example.com" || !strings.Contains(h.mail.sent[0].Text, "http://acme.localhost:3001/verify-email?email=unverified%40example.com&emailVerificationToken=") {
		t.Fatalf("sent = %+v, want one verification link on the acme domain", h.mail.sent)
	}
	var live int
	if err := h.pool.QueryRow(t.Context(),
		`SELECT count(*) FROM core."appToken" WHERE "userId" = $1 AND type = 'EMAIL_VERIFICATION_TOKEN'`, unverifiedUserID).Scan(&live); err != nil || live != 1 {
		t.Errorf("verification tokens = %d, %v, want 1", live, err)
	}
	if response, _ := h.send(t, verifyMutation, map[string]any{"token": verificationRaw, "email": "unverified@example.com", "origin": acmeOrigin}); response["errors"] == nil {
		t.Errorf("replaced token still verifies: %v", response)
	}
}

func TestEmailVerification_ResendRefusals(t *testing.T) {
	t.Parallel()
	tests := []struct {
		name     string
		required bool
		email    string
		message  string
	}{
		{"verification not required", false, "unverified@example.com", "Email verification token cannot be sent because email verification is not required"},
		{"already verified", true, "member@example.com", "Email already verified"},
		{"unknown user", true, "ghost@example.com", "User not found"},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()
			h := newPasswordHarness(t, tt.required)
			response, _ := h.send(t, resendMutation, map[string]any{"email": tt.email, "origin": acmeOrigin})
			if got := errorOf(t, response)["message"]; got != tt.message {
				t.Errorf("message = %v, want %q", got, tt.message)
			}
			if len(h.mail.sent) != 0 {
				t.Errorf("sent = %+v, want no mail", h.mail.sent)
			}
		})
	}
}

func TestEmailVerification_VerifyMarksEmailVerifiedAndConsumesToken(t *testing.T) {
	t.Parallel()
	h := newPasswordHarness(t, true)
	h.verificationToken(t, verificationRaw, "unverified@example.com", "2999-01-01")
	variables := map[string]any{"token": verificationRaw, "email": "unverified@example.com", "origin": acmeOrigin}
	response, _ := h.send(t, verifyMutation, variables)
	if response["errors"] != nil {
		t.Fatalf("verify = %v", response)
	}
	var verified bool
	if err := h.pool.QueryRow(t.Context(), `SELECT "isEmailVerified" FROM core."user" WHERE id = $1`, unverifiedUserID).Scan(&verified); err != nil || !verified {
		t.Errorf("isEmailVerified = %v, %v, want true", verified, err)
	}
	if again, _ := h.send(t, verifyMutation, variables); errorOf(t, again)["message"] != "Invalid email verification token" {
		t.Errorf("second verify = %v, want invalid token", again)
	}
}

func TestEmailVerification_VerifyRefusals(t *testing.T) {
	t.Parallel()
	tests := []struct {
		name, token, tokenEmail, expiresAt, email, message string
	}{
		{"unknown token", "nope", "unverified@example.com", "2999-01-01", "unverified@example.com", "Invalid email verification token"},
		{"expired", verificationRaw, "unverified@example.com", "2000-01-01", "unverified@example.com", "Email verification token expired"},
		{"other email", verificationRaw, "unverified@example.com", "2999-01-01", "other@example.com", "Email does not match verification token"},
		{"token without email", verificationRaw, "", "2999-01-01", "unverified@example.com", "Email missing from verification token"},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()
			h := newPasswordHarness(t, true)
			h.verificationToken(t, verificationRaw, tt.tokenEmail, tt.expiresAt)
			response, _ := h.send(t, verifyMutation, map[string]any{"token": tt.token, "email": tt.email, "origin": acmeOrigin})
			if got := errorOf(t, response)["message"]; got != tt.message {
				t.Errorf("message = %v, want %q", got, tt.message)
			}
		})
	}
}

func TestEmailVerification_UpdateEmail(t *testing.T) {
	t.Parallel()

	t.Run("mails the new address and adopts it once verified", func(t *testing.T) {
		t.Parallel()
		h := newPasswordHarness(t, true)
		variables := map[string]any{"newEmail": "new-member@example.com", "path": "/settings/profile"}
		if response := h.sendAsMember(t, updateMutation, variables); response["errors"] != nil {
			t.Fatalf("update = %v", response)
		}
		if len(h.mail.sent) != 1 || h.mail.sent[0].To != "new-member@example.com" || !strings.Contains(h.mail.sent[0].Text, "nextPath=%2Fsettings%2Fprofile") {
			t.Fatalf("sent = %+v, want one link to new-member@example.com carrying nextPath", h.mail.sent)
		}
		var current string
		if err := h.pool.QueryRow(t.Context(), `SELECT email::text FROM core."user" WHERE id = $1`, memberUserID).Scan(&current); err != nil || current != "member@example.com" {
			t.Fatalf("email before verification = %q, %v, want unchanged", current, err)
		}
		var plain string
		if _, rest, found := strings.Cut(h.mail.sent[0].Text, "emailVerificationToken="); found {
			plain, _, _ = strings.Cut(rest, "&")
		}
		verify := map[string]any{"token": plain, "email": "new-member@example.com", "origin": acmeOrigin}
		if response, _ := h.send(t, verifyMutation, verify); response["errors"] != nil {
			t.Fatalf("verify = %v", response)
		}
		if err := h.pool.QueryRow(t.Context(), `SELECT email::text FROM core."user" WHERE id = $1`, memberUserID).Scan(&current); err != nil || current != "new-member@example.com" {
			t.Errorf("email after verification = %q, %v, want new-member@example.com", current, err)
		}
	})

	t.Run("changes the address at once when verification is not required", func(t *testing.T) {
		t.Parallel()
		h := newPasswordHarness(t, false)
		if response := h.sendAsMember(t, updateMutation, map[string]any{"newEmail": "new-member@example.com"}); response["errors"] != nil {
			t.Fatalf("update = %v", response)
		}
		var current string
		if err := h.pool.QueryRow(t.Context(), `SELECT email::text FROM core."user" WHERE id = $1`, memberUserID).Scan(&current); err != nil || current != "new-member@example.com" {
			t.Errorf("email = %q, %v, want new-member@example.com", current, err)
		}
		if len(h.mail.sent) != 0 {
			t.Errorf("sent = %+v, want no mail", h.mail.sent)
		}
	})

	t.Run("refuses bad input and unauthenticated callers", func(t *testing.T) {
		t.Parallel()
		h := newPasswordHarness(t, true)
		for newEmail, want := range map[string]string{"not an email": "Invalid email", "twofactor@example.com": "Email already in use"} {
			response := h.sendAsMember(t, updateMutation, map[string]any{"newEmail": newEmail})
			if got := errorOf(t, response)["message"]; got != want {
				t.Errorf("update(%q) error = %v, want %q", newEmail, got, want)
			}
		}
		response, _ := h.send(t, updateMutation, map[string]any{"newEmail": "new-member@example.com"})
		if diff := cmp.Diff(map[string]any{"code": "UNAUTHENTICATED"}, errorOf(t, response)["extensions"]); diff != "" {
			t.Errorf("extensions (-want +got):\n%s", diff)
		}
	})
}

func (h *loginHarness) sendAsMember(t *testing.T, query string, variables map[string]any) map[string]any {
	t.Helper()
	member := &loginHarness{pool: h.pool, handler: h.asMember(), mail: h.mail}
	response, _ := member.send(t, query, variables)
	return response
}

func TestEmailVerification_VerifyRefusesAddressTakenSinceRequest(t *testing.T) {
	t.Parallel()
	h := newPasswordHarness(t, true)
	h.verificationToken(t, verificationRaw, "taken@example.com", "2999-01-01")
	h.user(t, "a1000000-0000-4000-8000-000000000007", "Taken@Example.com", true, false)
	response, _ := h.send(t, verifyMutation, map[string]any{"token": verificationRaw, "email": "taken@example.com", "origin": acmeOrigin})
	if got := errorOf(t, response)["message"]; got != "Email already in use" {
		t.Errorf("message = %v, want Email already in use", got)
	}
	var tokens int
	if err := h.pool.QueryRow(t.Context(), `SELECT count(*) FROM core."appToken" WHERE type = 'EMAIL_VERIFICATION_TOKEN'`).Scan(&tokens); err != nil || tokens != 1 {
		t.Errorf("verification tokens = %d, %v, want the token kept", tokens, err)
	}
}
