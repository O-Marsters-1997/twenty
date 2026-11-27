package invitationgql_test

import (
	"strings"
	"testing"
	"time"

	"github.com/google/go-cmp/cmp"

	"github.com/twentyhq/twenty/packages/twenty-server-go/internal/golden"
)

type denyAll struct{}

func (denyAll) Allow(string, int, time.Duration) bool { return false }

const (
	sendMutation   = `mutation($emails: [String!]!, $roleId: UUID) { sendInvitations(emails: $emails, roleId: $roleId) { success errors result { email roleId } } }`
	resendMutation = `mutation($id: String!) { resendWorkspaceInvitation(appTokenId: $id) { success errors result { email roleId } } }`
	liveInvitation = "a1000000-0000-4000-8000-000000000001"
)

func TestSendOperations_MatchNodeGolden(t *testing.T) {
	t.Parallel()
	for name, field := range map[string]string{"SendInvitations": "sendInvitations", "ResendWorkspaceInvitation": "resendWorkspaceInvitation"} {
		t.Run(name, func(t *testing.T) {
			t.Parallel()
			h := newHarness(t)
			golden.Assert(t, h.handler(adminWorkspaceID), "testdata", name, "data."+field+".result.*.id", "data."+field+".result.*.expiresAt")
		})
	}
}

func TestSendInvitations(t *testing.T) {
	t.Parallel()
	tests := []struct {
		name       string
		emails     []string
		wantErrors []string
		wantSent   int
	}{
		{"invites a new address", []string{"new@example.com"}, []string{}, 1},
		{"reports an address that is already a member", []string{"member@example.com"}, []string{"This user is already a member of the workspace"}, 0},
		{"reports an address that is already invited", []string{"ada@example.com"}, []string{"Invitation already sent"}, 0},
		{"reports an invalid address and still invites the rest", []string{"nope", "new@example.com"}, []string{"Invalid email"}, 1},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()
			h := newHarness(t)
			mailer := &recordingSender{}
			got := h.send(t, h.handlerWith(adminWorkspaceID, mailer, allowAll{}), sendMutation, map[string]any{"emails": tt.emails})
			payload := got["data"].(map[string]any)["sendInvitations"].(map[string]any)
			gotErrors := []string{}
			for _, e := range payload["errors"].([]any) {
				gotErrors = append(gotErrors, e.(string))
			}
			if diff := cmp.Diff(tt.wantErrors, gotErrors); diff != "" {
				t.Errorf("errors (-want +got):\n%s", diff)
			}
			if len(mailer.sent) != tt.wantSent {
				t.Fatalf("emails sent = %d, want %d", len(mailer.sent), tt.wantSent)
			}
			if tt.wantSent == 1 && !strings.Contains(mailer.sent[0].Text, "https://app.example.com/invite/hash123?inviteToken=") {
				t.Errorf("email text = %q, want an invite link", mailer.sent[0].Text)
			}
		})
	}
}

func TestSendInvitations_RoleAndPermissions(t *testing.T) {
	t.Parallel()
	tests := []struct {
		name, userWorkspace, roleID, wantCode string
	}{
		{"role requires the ROLES permission", flaggedWorkspace, memberRoleID, "FORBIDDEN"},
		{"members without the flag are refused", memberWorkspace, "", "FORBIDDEN"},
		{"admins may assign a role", adminWorkspaceID, memberRoleID, ""},
		{"unknown role", adminWorkspaceID, "00000000-0000-4000-8000-000000000000", "BAD_USER_INPUT"},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()
			h := newHarness(t)
			variables := map[string]any{"emails": []string{"new@example.com"}}
			if tt.roleID != "" {
				variables["roleId"] = tt.roleID
			}
			got := h.send(t, h.handlerWith(tt.userWorkspace, &recordingSender{}, allowAll{}), sendMutation, variables)
			if code := errorCode(got); code != nilIfEmpty(tt.wantCode) {
				t.Errorf("error code = %v, want %q", code, tt.wantCode)
			}
		})
	}
}

func TestSendInvitations_Throttled(t *testing.T) {
	t.Parallel()
	h := newHarness(t)
	mailer := &recordingSender{}
	got := h.send(t, h.handlerWith(adminWorkspaceID, mailer, denyAll{}), sendMutation, map[string]any{"emails": []string{"new@example.com"}})
	payload := got["data"].(map[string]any)["sendInvitations"].(map[string]any)
	if payload["success"] != false || len(mailer.sent) != 0 {
		t.Errorf("success = %v, emails = %d, want false and 0", payload["success"], len(mailer.sent))
	}
}

func TestResendWorkspaceInvitation(t *testing.T) {
	t.Parallel()
	t.Run("replaces the token and mails the address", func(t *testing.T) {
		t.Parallel()
		h := newHarness(t)
		mailer := &recordingSender{}
		got := h.send(t, h.handlerWith(adminWorkspaceID, mailer, allowAll{}), resendMutation, map[string]any{"id": liveInvitation})
		if code := errorCode(got); code != nil {
			t.Fatalf("error code = %v", code)
		}
		if n := h.count(t, `SELECT count(*) FROM core."appToken" WHERE id = $1`, liveInvitation); n != 0 {
			t.Errorf("old token rows = %d, want 0", n)
		}
		if n := h.count(t, `SELECT count(*) FROM core."appToken" WHERE context->>'email' = 'ada@example.com' AND "deletedAt" IS NULL AND type = 'INVITATION_TOKEN' AND context->>'roleId' = $1`, memberRoleID); n != 1 {
			t.Errorf("replacement rows = %d, want 1", n)
		}
		if len(mailer.sent) != 1 || mailer.sent[0].To != "ada@example.com" {
			t.Errorf("sent = %v, want one email to ada@example.com", mailer.sent)
		}
	})
	t.Run("refuses another workspace's invitation", func(t *testing.T) {
		t.Parallel()
		h := newHarness(t)
		got := h.send(t, h.handlerWith(adminWorkspaceID, &recordingSender{}, allowAll{}), resendMutation, map[string]any{"id": otherInvitation})
		if code := errorCode(got); code != "NOT_FOUND" {
			t.Errorf("error code = %v, want NOT_FOUND", code)
		}
	})
}

type allowAll struct{}

func (allowAll) Allow(string, int, time.Duration) bool { return true }

func nilIfEmpty(code string) any {
	if code == "" {
		return nil
	}
	return code
}
