package accessgql_test

import (
	"testing"

	"github.com/google/go-cmp/cmp"

	"github.com/twentyhq/twenty/packages/twenty-server-go/internal/access/store"
	"github.com/twentyhq/twenty/packages/twenty-server-go/internal/auth"
	"github.com/twentyhq/twenty/packages/twenty-server-go/internal/golden"
	"github.com/twentyhq/twenty/packages/twenty-server-go/internal/workspace"
)

const (
	adaMemberID = "0b7a6c1e-3f55-4a47-8d6e-6c1f1b7f2a05"

	updateMemberRole = `mutation UpdateWorkspaceMemberRole($workspaceMemberId: UUID!, $roleId: UUID!) { updateWorkspaceMemberRole(workspaceMemberId: $workspaceMemberId, roleId: $roleId) { id } }`
	updateSettings   = `mutation UpdateWorkspaceMemberSettings($input: UpdateWorkspaceMemberSettingsInput!) { updateWorkspaceMemberSettings(input: $input) }`
)

func (h harness) seedAda(t *testing.T) {
	t.Helper()
	h.exec(t, `INSERT INTO workspace_2abogkkt2zd45pa9aun09djpf."workspaceMember" (id, "nameFirstName", "nameLastName", "userEmail", "userId") VALUES ($1::uuid, 'Ada', 'Lovelace', 'ada@example.com', $2::uuid)`, adaMemberID, memberUserID)
}

func TestUpdateWorkspaceMemberRole_matchesNodeGolden(t *testing.T) {
	t.Parallel()
	h := newHarness(t)
	h.seedAda(t)
	golden.Assert(t, h.handler, "testdata", "UpdateWorkspaceMemberRole")
}

func TestUpdateWorkspaceMemberRole_rejections(t *testing.T) {
	t.Parallel()
	h := newHarness(t)
	h.seedAda(t)
	h.exec(t, `INSERT INTO workspace_2abogkkt2zd45pa9aun09djpf."workspaceMember" (id, "nameFirstName", "userEmail", "userId") VALUES ('0b7a6c1e-3f55-4a47-8d6e-6c1f1b7f2a06', 'Root', 'root@example.com', $1::uuid)`, adminUserID)
	unassignable := h.scan(t, `INSERT INTO core.role (label, "workspaceId", "canBeAssignedToUsers", "universalIdentifier", "applicationId")
		VALUES ('Robots', $1::uuid, false, gen_random_uuid(), (SELECT "workspaceCustomApplicationId" FROM core.workspace WHERE id = $1::uuid)) RETURNING id::text`, workspace.PinnedWorkspaceID)
	h.exec(t, `UPDATE core."roleTarget" SET "roleId" = $1::uuid WHERE "userWorkspaceId" = $2::uuid`, adminRoleID, memberWorkspaceID)

	tests := []struct {
		name     string
		memberID string
		roleID   string
		want     string
	}{
		{"own role", "0b7a6c1e-3f55-4a47-8d6e-6c1f1b7f2a06", memberRoleID, "FORBIDDEN"},
		{"last admin", adaMemberID, memberRoleID, "FORBIDDEN"},
		{"unknown role", adaMemberID, missingID, "NOT_FOUND"},
		{"role not assignable to users", adaMemberID, unassignable, "BAD_USER_INPUT"},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got := errorCode(t, h.send(t, "UpdateWorkspaceMemberRole", updateMemberRole, map[string]any{"workspaceMemberId": tt.memberID, "roleId": tt.roleID}))
			if got != tt.want {
				t.Errorf("error code = %s, want %s", got, tt.want)
			}
		})
	}
}

func TestUpdateWorkspaceMemberRole_needsRolesPermission(t *testing.T) {
	t.Parallel()
	h := newHarness(t).as(auth.Principal{UserID: memberUserID, UserWorkspaceID: memberWorkspaceID})
	got := errorCode(t, h.send(t, "UpdateWorkspaceMemberRole", updateMemberRole, map[string]any{"workspaceMemberId": adaMemberID, "roleId": memberRoleID}))
	if got != "FORBIDDEN" {
		t.Errorf("error code = %s, want FORBIDDEN", got)
	}
}

func TestUpdateWorkspaceMemberSettings(t *testing.T) {
	t.Parallel()
	t.Run("matches the Node golden for a self update", func(t *testing.T) {
		t.Parallel()
		h := newHarness(t)
		h.seedAda(t)
		h = h.as(auth.Principal{UserID: memberUserID, UserWorkspaceID: memberWorkspaceID, WorkspaceMemberID: adaMemberID})
		golden.Assert(t, h.handler, "testdata", "UpdateWorkspaceMemberSettings")
		got := h.scan(t, `SELECT concat_ws('|', "nameFirstName", "nameLastName", "colorScheme") FROM workspace_2abogkkt2zd45pa9aun09djpf."workspaceMember" WHERE id = $1::uuid`, adaMemberID)
		if want := "Augusta|King|Dark"; got != want {
			t.Errorf("member row = %q, want %q", got, want)
		}
		if got, want := h.scan(t, `SELECT locale FROM core."userWorkspace" WHERE id = $1::uuid`, memberWorkspaceID), "fr-FR"; got != want {
			t.Errorf("userWorkspace locale = %q, want %q", got, want)
		}
	})

	rejections := []struct {
		name      string
		principal auth.Principal
		update    map[string]any
		want      string
	}{
		{"unlisted field", auth.Principal{UserID: memberUserID, WorkspaceMemberID: adaMemberID}, map[string]any{"userEmail": "x@example.com"}, "BAD_USER_INPUT"},
		{"empty update", auth.Principal{UserID: memberUserID, WorkspaceMemberID: adaMemberID}, map[string]any{}, "BAD_USER_INPUT"},
		{"invalid uiScale", auth.Principal{UserID: memberUserID, WorkspaceMemberID: adaMemberID}, map[string]any{"uiScale": "Huge"}, "BAD_USER_INPUT"},
		{"another member without permission", auth.Principal{UserID: "other", UserWorkspaceID: memberWorkspaceID, WorkspaceMemberID: "other"}, map[string]any{"colorScheme": "Dark"}, "FORBIDDEN"},
	}
	for _, tt := range rejections {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()
			h := newHarness(t)
			h.seedAda(t)
			h = h.as(tt.principal)
			got := errorCode(t, h.send(t, "UpdateWorkspaceMemberSettings", updateSettings,
				map[string]any{"input": map[string]any{"workspaceMemberId": adaMemberID, "update": tt.update}}))
			if got != tt.want {
				t.Errorf("error code = %s, want %s", got, tt.want)
			}
		})
	}
}

func TestUpdateLabPublicFeatureFlag(t *testing.T) {
	t.Parallel()
	t.Run("rejects every flag while none is public", func(t *testing.T) {
		t.Parallel()
		h := newHarness(t)
		query := `mutation UpdateLabPublicFeatureFlag($input: UpdateLabPublicFeatureFlagInput!) { updateLabPublicFeatureFlag(input: $input) { key value } }`
		for _, key := range []string{"IS_AI_CHAT_INBOX_ENABLED", "NOT_A_FLAG"} {
			got := errorCode(t, h.send(t, "UpdateLabPublicFeatureFlag", query, map[string]any{"input": map[string]any{"publicFeatureFlag": key, "value": true}}))
			if got != "BAD_USER_INPUT" {
				t.Errorf("%s: error code = %s, want BAD_USER_INPUT", key, got)
			}
		}
	})
	t.Run("upserts a public flag", func(t *testing.T) {
		t.Parallel()
		h := newHarness(t)
		flags := store.NewFeatureFlags(h.pool, []string{"IS_AI_CHAT_INBOX_ENABLED"})
		for _, value := range []bool{true, false} {
			got, err := flags.UpdatePublic(t.Context(), "IS_AI_CHAT_INBOX_ENABLED", value)
			if err != nil {
				t.Fatalf("UpdatePublic(%v): %v", value, err)
			}
			if diff := cmp.Diff(store.FeatureFlag{Key: "IS_AI_CHAT_INBOX_ENABLED", Value: value}, got); diff != "" {
				t.Errorf("UpdatePublic(%v) (-want +got):\n%s", value, diff)
			}
		}
		if got := h.scan(t, `SELECT value::text FROM core."featureFlag" WHERE key = 'IS_AI_CHAT_INBOX_ENABLED'`); got != "false" {
			t.Errorf("stored value = %s, want false", got)
		}
	})
}
