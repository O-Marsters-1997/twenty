package authgql_test

import (
	"testing"

	"github.com/google/go-cmp/cmp"

	"github.com/twentyhq/twenty/packages/twenty-server-go/internal/golden"
	"github.com/twentyhq/twenty/packages/twenty-server-go/internal/workspace"
)

const (
	signUpMutation               = `mutation SignUp($email: String!, $password: String!, $captchaToken: String, $locale: String, $verifyEmailRedirectPath: String) { signUp(email: $email, password: $password, captchaToken: $captchaToken, locale: $locale, verifyEmailRedirectPath: $verifyEmailRedirectPath) { availableWorkspaces { availableWorkspacesForSignIn { id displayName loginToken personalInviteToken inviteHash workspaceUrls { subdomainUrl } logo } availableWorkspacesForSignUp { id displayName loginToken personalInviteToken inviteHash workspaceUrls { subdomainUrl } logo } } tokens { accessOrWorkspaceAgnosticToken { token expiresAt } refreshToken { token expiresAt } } } }`
	signUpInWorkspaceMutation    = `mutation SignUpInWorkspace($email: String!, $password: String!, $workspaceInviteHash: String, $workspacePersonalInviteToken: String = null, $captchaToken: String, $workspaceId: UUID, $locale: String, $verifyEmailRedirectPath: String) { signUpInWorkspace(email: $email, password: $password, workspaceInviteHash: $workspaceInviteHash, workspacePersonalInviteToken: $workspacePersonalInviteToken, captchaToken: $captchaToken, workspaceId: $workspaceId, locale: $locale, verifyEmailRedirectPath: $verifyEmailRedirectPath) { loginToken { token expiresAt } workspace { id workspaceUrls { subdomainUrl } } } }`
	signUpInNewWorkspaceMutation = `mutation SignUpInNewWorkspace($input: SignUpInNewWorkspaceInput) { signUpInNewWorkspace(input: $input) { loginToken { token expiresAt } workspace { id workspaceUrls { subdomainUrl } } } }`
)

func newSignUpHarness(t *testing.T, emailVerificationRequired bool) *loginHarness {
	t.Helper()
	h := newPasswordHarness(t, emailVerificationRequired)
	h.exec(t, `UPDATE core.workspace SET subdomain = 'pinned' WHERE id = $1`, workspace.PinnedWorkspaceID)
	h.invite(t, workspace.PinnedWorkspaceID, "newcomer@example.com", "pinned-invite-token")
	return h
}

func TestSignUp_MatchesGolden(t *testing.T) {
	t.Parallel()
	tests := []struct {
		name   string
		ignore []string
	}{
		{name: "sign-up", ignore: []string{
			"data.signUp.tokens.accessOrWorkspaceAgnosticToken.token", "data.signUp.tokens.accessOrWorkspaceAgnosticToken.expiresAt",
			"data.signUp.tokens.refreshToken.token", "data.signUp.tokens.refreshToken.expiresAt",
		}},
		{name: "sign-up-existing-user"},
		{name: "sign-up-weak-password"},
		{name: "sign-up-in-workspace", ignore: []string{"data.signUpInWorkspace.loginToken.token", "data.signUpInWorkspace.loginToken.expiresAt"}},
		{name: "sign-up-in-workspace-without-invitation"},
		{name: "sign-up-in-workspace-wrong-invitation"},
		{name: "sign-up-in-new-workspace-unauthenticated"},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()
			h := newSignUpHarness(t, false)
			golden.Assert(t, h.handler, "testdata/golden", tt.name, tt.ignore...)
		})
	}
}

func TestSignUpInWorkspace(t *testing.T) {
	t.Parallel()

	t.Run("joins the workspace and spends the invitation", func(t *testing.T) {
		t.Parallel()
		h := newSignUpHarness(t, false)
		response, _ := h.send(t, signUpInWorkspaceMutation, map[string]any{
			"email": "newcomer@example.com", "password": loginPassword,
			"workspaceId": workspace.PinnedWorkspaceID, "workspacePersonalInviteToken": "pinned-invite-token",
		})
		if _, failed := response["errors"]; failed {
			t.Fatalf("response = %v", response)
		}
		var members, invitations int
		if err := h.pool.QueryRow(t.Context(),
			`SELECT (SELECT count(*) FROM core."userWorkspace" uw JOIN core."user" u ON u.id = uw."userId" WHERE u.email = 'newcomer@example.com' AND uw."workspaceId" = $1),
			        (SELECT count(*) FROM core."appToken" WHERE value = 'pinned-invite-token')`, workspace.PinnedWorkspaceID,
		).Scan(&members, &invitations); err != nil {
			t.Fatal(err)
		}
		if diff := cmp.Diff([]int{1, 0}, []int{members, invitations}); diff != "" {
			t.Errorf("memberships and invitations (-want +got):\n%s", diff)
		}
	})

	t.Run("accepts the workspace public invite hash", func(t *testing.T) {
		t.Parallel()
		h := newSignUpHarness(t, false)
		h.exec(t, `UPDATE core.workspace SET "inviteHash" = 'public-hash' WHERE id = $1`, workspace.PinnedWorkspaceID)
		response, _ := h.send(t, signUpInWorkspaceMutation, map[string]any{
			"email": "hashed@example.com", "password": loginPassword,
			"workspaceId": workspace.PinnedWorkspaceID, "workspaceInviteHash": "public-hash",
		})
		if _, failed := response["errors"]; failed {
			t.Fatalf("response = %v", response)
		}
	})

	t.Run("refuses an unknown invite hash", func(t *testing.T) {
		t.Parallel()
		h := newSignUpHarness(t, false)
		response, _ := h.send(t, signUpInWorkspaceMutation, map[string]any{
			"email": "hashed@example.com", "password": loginPassword,
			"workspaceId": workspace.PinnedWorkspaceID, "workspaceInviteHash": "nope",
		})
		if got := errorOf(t, response)["message"]; got != "Invalid invite hash" {
			t.Errorf("error = %v, want Invalid invite hash", got)
		}
	})
}

func TestSignUp_RefusesWhenEmailVerificationIsRequired(t *testing.T) {
	t.Parallel()
	h := newSignUpHarness(t, true)
	response, _ := h.send(t, signUpMutation, map[string]any{"email": "late@example.com", "password": loginPassword})
	if got := errorOf(t, response)["extensions"].(map[string]any)["code"]; got != "INTERNAL_SERVER_ERROR" {
		t.Errorf("error code = %v, want INTERNAL_SERVER_ERROR", got)
	}
	var users int
	if err := h.pool.QueryRow(t.Context(), `SELECT count(*) FROM core."user" WHERE email = 'late@example.com'`).Scan(&users); err != nil || users != 0 {
		t.Errorf("created users = %d, %v; want 0", users, err)
	}
}
