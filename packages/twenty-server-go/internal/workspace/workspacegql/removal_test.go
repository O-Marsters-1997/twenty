package workspacegql_test

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"log/slog"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	"github.com/google/go-cmp/cmp"
	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/twentyhq/twenty/packages/twenty-server-go/internal/auth"
	"github.com/twentyhq/twenty/packages/twenty-server-go/internal/golden"
	"github.com/twentyhq/twenty/packages/twenty-server-go/internal/pgtest"
	"github.com/twentyhq/twenty/packages/twenty-server-go/internal/workspace"
	"github.com/twentyhq/twenty/packages/twenty-server-go/internal/workspace/workspacegql"
)

const (
	adminRoleID  = "25e5d967-e3b2-434e-bbd6-53a6181cf580"
	memberRoleID = "f4cc34a9-a20e-418f-8c5c-78b7b1c77881"
	elsewhereID  = "d1000000-0000-4000-8000-000000000001"
	apiKeyID     = "99000000-0000-4000-8000-000000000009"

	deleteWorkspaceMutation = `mutation DeleteCurrentWorkspace { deleteCurrentWorkspace { id } }`
	deleteMemberMutation    = `mutation DeleteUserWorkspace($workspaceMemberIdToDelete: String!) { deleteUserFromWorkspace(workspaceMemberIdToDelete: $workspaceMemberIdToDelete) { id } }`
	deleteAccountMutation   = `mutation DeleteUserAccount { deleteUser { id } }`
)

type grants map[string]bool

func (g grants) Has(_ context.Context, _ auth.Principal, flag string) (bool, error) {
	return g[flag], nil
}

type member struct{ userID, userWorkspaceID, workspaceMemberID string }

func (m member) principal() auth.Principal {
	return auth.Principal{UserID: m.userID, WorkspaceID: workspace.PinnedWorkspaceID, UserWorkspaceID: m.userWorkspaceID, WorkspaceMemberID: m.workspaceMemberID}
}

type removalHarness struct {
	pool    *pgxpool.Pool
	handler http.Handler
	acting  auth.Principal
	members []member
}

func newRemovalHarness(t *testing.T, granted grants) *removalHarness {
	t.Helper()
	pool, err := pgxpool.New(t.Context(), pgtest.New(t))
	if err != nil {
		t.Fatalf("connect: %v", err)
	}
	t.Cleanup(pool.Close)
	h := &removalHarness{pool: pool}
	graphql := workspacegql.NewHandler(&workspacegql.Resolver{
		Removal:     workspace.NewRemoval(pool),
		Permissions: granted,
	}, slog.New(slog.NewTextHandler(io.Discard, nil)))
	h.handler = http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		graphql.ServeHTTP(w, r.WithContext(auth.WithPrincipal(r.Context(), h.acting)))
	})
	return h
}

func (h *removalHarness) addMember(t *testing.T, n int, roleID string) member {
	t.Helper()
	m := member{
		userID:            fmt.Sprintf("a1000000-0000-4000-8000-%012d", n),
		userWorkspaceID:   fmt.Sprintf("b1000000-0000-4000-8000-%012d", n),
		workspaceMemberID: fmt.Sprintf("c1000000-0000-4000-8000-%012d", n),
	}
	email := fmt.Sprintf("user%d@example.com", n)
	createdAt := time.Date(2026, 1, n, 0, 0, 0, 0, time.UTC)
	h.exec(t, `INSERT INTO core."user" (id, email) VALUES ($1, $2)`, m.userID, email)
	h.exec(t, `INSERT INTO core."userWorkspace" (id, "userId", "workspaceId", "createdAt") VALUES ($1, $2, $3, $4)`, m.userWorkspaceID, m.userID, workspace.PinnedWorkspaceID, createdAt)
	h.exec(t, `INSERT INTO core."roleTarget" ("workspaceId", "roleId", "userWorkspaceId", "universalIdentifier", "applicationId")
		SELECT $1, id, $3, gen_random_uuid(), "applicationId" FROM core.role WHERE id = $2`, workspace.PinnedWorkspaceID, roleID, m.userWorkspaceID)
	h.exec(t, `INSERT INTO `+workspace.SchemaName()+`."workspaceMember" (id, "userId", "userEmail") VALUES ($1, $2, $3)`, m.workspaceMemberID, m.userID, email)
	h.members = append(h.members, m)
	return m
}

func (h *removalHarness) addElsewhere(t *testing.T, userID string) {
	t.Helper()
	h.exec(t, `INSERT INTO core.workspace (id, subdomain, "displayName", "activationStatus", "databaseSchema", "defaultRoleId", "workspaceCustomApplicationId")
		SELECT $1, 'elsewhere', 'Elsewhere', 'ACTIVE', 'workspace_elsewhere', $2, "workspaceCustomApplicationId" FROM core.workspace WHERE id = $3`,
		elsewhereID, memberRoleID, workspace.PinnedWorkspaceID)
	h.exec(t, `INSERT INTO core."userWorkspace" ("userId", "workspaceId") VALUES ($1, $2)`, userID, elsewhereID)
}

func (h *removalHarness) send(t *testing.T, as member, query string, variables map[string]any) map[string]any {
	t.Helper()
	h.acting = as.principal()
	return h.sendAsActing(t, query, variables)
}

func (h *removalHarness) sendAsActing(t *testing.T, query string, variables map[string]any) map[string]any {
	t.Helper()
	body, err := json.Marshal(map[string]any{"query": query, "variables": variables})
	if err != nil {
		t.Fatal(err)
	}
	return post(t, h.handler, body)
}

func (h *removalHarness) exec(t *testing.T, query string, args ...any) {
	t.Helper()
	if _, err := h.pool.Exec(t.Context(), query, args...); err != nil {
		t.Fatalf("exec %q: %v", query, err)
	}
}

func (h *removalHarness) scalar(t *testing.T, query string, args ...any) any {
	t.Helper()
	var value any
	if err := h.pool.QueryRow(t.Context(), query, args...).Scan(&value); err != nil {
		t.Fatalf("query %q: %v", query, err)
	}
	return value
}

func (h *removalHarness) count(t *testing.T, query string, args ...any) int64 {
	t.Helper()
	n, ok := h.scalar(t, query, args...).(int64)
	if !ok {
		t.Fatalf("query %q did not return a count", query)
	}
	return n
}

func (h *removalHarness) deleted(t *testing.T, table, id string) bool {
	t.Helper()
	return h.scalar(t, `SELECT "deletedAt" IS NOT NULL FROM core.`+table+` WHERE id = $1`, id) == true
}

func TestOperations_RemovalMatchNodeGolden(t *testing.T) {
	t.Parallel()
	for _, name := range []string{"DeleteCurrentWorkspace", "DeleteUserWorkspace", "DeleteUserAccount"} {
		t.Run(name, func(t *testing.T) {
			t.Parallel()
			h := newRemovalHarness(t, grants{"WORKSPACE": true, "WORKSPACE_MEMBERS": true})
			admin := h.addMember(t, 1, adminRoleID)
			h.addMember(t, 2, adminRoleID)
			h.acting = admin.principal()
			c, err := golden.Load("testdata", name)
			if err != nil {
				t.Fatal(err)
			}
			if c.Variables != nil {
				c.Variables["workspaceMemberIdToDelete"] = h.members[1].workspaceMemberID
			}
			response := strings.ReplaceAll(string(c.Response), "<second-user-workspace>", h.members[1].userWorkspaceID)
			server := httptest.NewServer(h.handler)
			t.Cleanup(server.Close)
			got, err := golden.Send(server.Client(), server.URL, "", c)
			if err != nil {
				t.Fatal(err)
			}
			want, err := golden.Mask([]byte(response), nil)
			if err != nil {
				t.Fatal(err)
			}
			gotMasked, err := golden.Mask(got, nil)
			if err != nil {
				t.Fatal(err)
			}
			if diff := cmp.Diff(want, gotMasked); diff != "" {
				t.Errorf("%s differs from golden file (-golden +got):\n%s", name, diff)
			}
		})
	}
}

func TestDeleteCurrentWorkspace(t *testing.T) {
	t.Parallel()

	t.Run("soft deletes the workspace, its memberships and users with no other workspace", func(t *testing.T) {
		t.Parallel()
		h := newRemovalHarness(t, grants{"WORKSPACE": true})
		admin := h.addMember(t, 1, adminRoleID)
		other := h.addMember(t, 2, memberRoleID)
		h.addElsewhere(t, other.userID)

		if response := h.send(t, admin, deleteWorkspaceMutation, nil); response["errors"] != nil {
			t.Fatalf("errors = %v", response["errors"])
		}

		got := []bool{
			h.deleted(t, "workspace", workspace.PinnedWorkspaceID),
			h.deleted(t, `"userWorkspace"`, admin.userWorkspaceID), h.deleted(t, `"userWorkspace"`, other.userWorkspaceID),
			h.deleted(t, `"user"`, admin.userID), h.deleted(t, `"user"`, other.userID),
		}
		want := []bool{true, true, true, true, false}
		if diff := cmp.Diff(want, got); diff != "" {
			t.Errorf("deleted workspace, userWorkspaces, users (-want +got):\n%s", diff)
		}
	})

	t.Run("without the workspace permission changes nothing", func(t *testing.T) {
		t.Parallel()
		h := newRemovalHarness(t, grants{"WORKSPACE_MEMBERS": true})
		admin := h.addMember(t, 1, adminRoleID)
		if code := errorCode(h.send(t, admin, deleteWorkspaceMutation, nil)); code != "FORBIDDEN" {
			t.Errorf("error code = %v, want FORBIDDEN", code)
		}
		if h.deleted(t, "workspace", workspace.PinnedWorkspaceID) || h.deleted(t, `"user"`, admin.userID) {
			t.Error("workspace or user was deleted without permission")
		}
	})

	t.Run("without a workspace session is unauthenticated", func(t *testing.T) {
		t.Parallel()
		h := newRemovalHarness(t, grants{"WORKSPACE": true})
		if code := errorCode(h.sendAsActing(t, deleteWorkspaceMutation, nil)); code != "UNAUTHENTICATED" {
			t.Errorf("error code = %v, want UNAUTHENTICATED", code)
		}
	})
}

func TestDeleteUserWorkspace(t *testing.T) {
	t.Parallel()

	t.Run("removes the member, their access and their account when it was their only workspace", func(t *testing.T) {
		t.Parallel()
		h := newRemovalHarness(t, grants{"WORKSPACE_MEMBERS": true})
		admin := h.addMember(t, 1, adminRoleID)
		leaving := h.addMember(t, 2, memberRoleID)
		h.exec(t, `INSERT INTO `+workspace.SchemaName()+`."agentChatThread" (id, "workspaceMemberId") VALUES ('e1000000-0000-4000-8000-000000000001', $1)`, leaving.workspaceMemberID)

		if response := h.send(t, admin, deleteMemberMutation, map[string]any{"workspaceMemberIdToDelete": leaving.workspaceMemberID}); response["errors"] != nil {
			t.Fatalf("errors = %v", response["errors"])
		}

		got := []int64{
			h.count(t, `SELECT count(*) FROM `+workspace.SchemaName()+`."workspaceMember" WHERE id = $1`, leaving.workspaceMemberID),
			h.count(t, `SELECT count(*) FROM core."roleTarget" WHERE "userWorkspaceId" = $1`, leaving.userWorkspaceID),
			h.count(t, `SELECT count(*) FROM core."userWorkspace" WHERE id = $1`, leaving.userWorkspaceID),
			h.count(t, `SELECT count(*) FROM `+workspace.SchemaName()+`."agentChatThread" WHERE "workspaceMemberId" = $1`, leaving.workspaceMemberID),
			h.count(t, `SELECT count(*) FROM core."userWorkspace" WHERE id = $1`, admin.userWorkspaceID),
		}
		if diff := cmp.Diff([]int64{0, 0, 0, 0, 1}, got); diff != "" {
			t.Errorf("remaining rows (-want +got):\n%s", diff)
		}
		if !h.deleted(t, `"user"`, leaving.userID) || h.deleted(t, `"user"`, admin.userID) {
			t.Error("want the leaving user soft deleted and the admin kept")
		}
		if h.deleted(t, "workspace", workspace.PinnedWorkspaceID) {
			t.Error("workspace was deleted though a member remains")
		}
	})

	t.Run("keeps the account of a member who belongs to another workspace", func(t *testing.T) {
		t.Parallel()
		h := newRemovalHarness(t, grants{"WORKSPACE_MEMBERS": true})
		admin := h.addMember(t, 1, adminRoleID)
		leaving := h.addMember(t, 2, memberRoleID)
		h.addElsewhere(t, leaving.userID)

		h.send(t, admin, deleteMemberMutation, map[string]any{"workspaceMemberIdToDelete": leaving.workspaceMemberID})

		if h.deleted(t, `"user"`, leaving.userID) {
			t.Error("user with another workspace was soft deleted")
		}
	})

	t.Run("hands connected accounts to the acting admin without credentials and stops their sync", func(t *testing.T) {
		t.Parallel()
		h := newRemovalHarness(t, grants{"WORKSPACE_MEMBERS": true})
		admin := h.addMember(t, 1, adminRoleID)
		leaving := h.addMember(t, 2, memberRoleID)
		const accountID = "f1000000-0000-4000-8000-000000000001"
		h.exec(t, `INSERT INTO core."connectedAccount" (id, "workspaceId", handle, provider, "userWorkspaceId", "accessToken", "refreshToken", "connectionParameters")
			VALUES ($1, $2, 'leaving@example.com', 'google', $3, 'enc:v2:a', 'enc:v2:r', '{"k": 1}')`, accountID, workspace.PinnedWorkspaceID, leaving.userWorkspaceID)
		h.exec(t, `INSERT INTO core."messageChannel" ("workspaceId", visibility, handle, type, "pendingGroupEmailsAction", "syncStage", "connectedAccountId", "webhookSubscriptionStatus")
			VALUES ($1, 'METADATA', 'leaving@example.com', 'EMAIL', 'NONE', 'PENDING_CONFIGURATION', $2, 'PENDING')`, workspace.PinnedWorkspaceID, accountID)

		h.send(t, admin, deleteMemberMutation, map[string]any{"workspaceMemberIdToDelete": leaving.workspaceMemberID})

		got := h.scalar(t, `SELECT jsonb_build_array(a."userWorkspaceId"::text, a."accessToken", a."refreshToken", a."connectionParameters", a."archivedAt" IS NOT NULL,
			c."isSyncEnabled", c."webhookSubscriptionStatus")
			FROM core."connectedAccount" a JOIN core."messageChannel" c ON c."connectedAccountId" = a.id WHERE a.id = $1`, accountID)
		want := []any{admin.userWorkspaceID, nil, nil, nil, true, false, "EXPIRED"}
		if diff := cmp.Diff(want, got); diff != "" {
			t.Errorf("connected account and channel (-want +got):\n%s", diff)
		}
	})

	t.Run("moves full record access to the acting admin", func(t *testing.T) {
		t.Parallel()
		h := newRemovalHarness(t, grants{"WORKSPACE_MEMBERS": true})
		admin := h.addMember(t, 1, adminRoleID)
		leaving := h.addMember(t, 2, memberRoleID)
		objectID, ok := h.scalar(t, `SELECT id::text FROM core."objectMetadata" WHERE "workspaceId" = $1 AND readability = 'OPEN' AND NOT "isSystem" LIMIT 1`, workspace.PinnedWorkspaceID).(string)
		if !ok {
			t.Fatal("no open object in the baseline")
		}
		const fullRecordID = "91000000-0000-4000-8000-000000000001"
		const readRecordID = "91000000-0000-4000-8000-000000000002"
		for _, grant := range []struct{ record, level string }{{fullRecordID, "FULL"}, {readRecordID, "READ"}} {
			h.exec(t, `INSERT INTO `+workspace.SchemaName()+`."recordShare" ("recordId", "objectMetadataId", "principalId", "principalType", "accessLevel", "rowCause", "sourceId")
				VALUES ($1, $2, $3, 'WORKSPACE_MEMBER', $4, 'OWNER', $1)`, grant.record, objectID, leaving.workspaceMemberID, grant.level)
		}

		h.send(t, admin, deleteMemberMutation, map[string]any{"workspaceMemberIdToDelete": leaving.workspaceMemberID})

		got := h.scalar(t, `SELECT coalesce(jsonb_agg(jsonb_build_array("recordId"::text, "principalId"::text, "accessLevel"::text) ORDER BY "recordId"), '[]'::jsonb)
			FROM `+workspace.SchemaName()+`."recordShare"`)
		want := []any{[]any{fullRecordID, admin.workspaceMemberID, "FULL"}}
		if diff := cmp.Diff(want, got); diff != "" {
			t.Errorf("record shares (-want +got):\n%s", diff)
		}
	})

	t.Run("deletes the workspace when the member is the last one", func(t *testing.T) {
		t.Parallel()
		h := newRemovalHarness(t, grants{})
		only := h.addMember(t, 1, adminRoleID)

		if response := h.send(t, only, deleteMemberMutation, map[string]any{"workspaceMemberIdToDelete": only.workspaceMemberID}); response["errors"] != nil {
			t.Fatalf("errors = %v", response["errors"])
		}
		if !h.deleted(t, "workspace", workspace.PinnedWorkspaceID) || !h.deleted(t, `"user"`, only.userID) || !h.deleted(t, `"userWorkspace"`, only.userWorkspaceID) {
			t.Error("want workspace, membership and user soft deleted")
		}
	})

	t.Run("lets a member remove themselves without the members permission", func(t *testing.T) {
		t.Parallel()
		h := newRemovalHarness(t, grants{})
		h.addMember(t, 1, adminRoleID)
		leaving := h.addMember(t, 2, memberRoleID)
		if response := h.send(t, leaving, deleteMemberMutation, map[string]any{"workspaceMemberIdToDelete": leaving.workspaceMemberID}); response["errors"] != nil {
			t.Errorf("errors = %v", response["errors"])
		}
	})

	t.Run("rejects", func(t *testing.T) {
		t.Parallel()
		tests := []struct {
			name     string
			granted  grants
			acting   int
			target   func(members []member) string
			wantCode string
		}{
			{"removing another member without the members permission", grants{}, 2, func(m []member) string { return m[0].workspaceMemberID }, "FORBIDDEN"},
			{"an unknown member", grants{"WORKSPACE_MEMBERS": true}, 0, func([]member) string { return "99000000-0000-4000-8000-000000000001" }, "BAD_USER_INPUT"},
			{"an id that is not a uuid", grants{"WORKSPACE_MEMBERS": true}, 0, func([]member) string { return "nope" }, "BAD_USER_INPUT"},
		}
		for _, tt := range tests {
			t.Run(tt.name, func(t *testing.T) {
				t.Parallel()
				h := newRemovalHarness(t, tt.granted)
				h.addMember(t, 1, adminRoleID)
				h.addMember(t, 2, adminRoleID)
				h.addMember(t, 3, memberRoleID)
				response := h.send(t, h.members[tt.acting], deleteMemberMutation, map[string]any{"workspaceMemberIdToDelete": tt.target(h.members)})
				if code := errorCode(response); code != tt.wantCode {
					t.Fatalf("error code = %v, want %s (response %v)", code, tt.wantCode, response)
				}
				if got := h.count(t, `SELECT count(*) FROM core."userWorkspace" WHERE "deletedAt" IS NULL`); got != 3 {
					t.Errorf("active memberships = %d, want 3", got)
				}
			})
		}
	})

	t.Run("refuses to remove the last admin while others remain", func(t *testing.T) {
		t.Parallel()
		h := newRemovalHarness(t, grants{"WORKSPACE_MEMBERS": true})
		admin := h.addMember(t, 1, adminRoleID)
		h.addMember(t, 2, memberRoleID)
		response := h.send(t, admin, deleteMemberMutation, map[string]any{"workspaceMemberIdToDelete": admin.workspaceMemberID})
		if code := errorCode(response); code != "FORBIDDEN" {
			t.Fatalf("error code = %v, want FORBIDDEN", code)
		}
		if got := h.count(t, `SELECT count(*) FROM core."userWorkspace" WHERE id = $1`, admin.userWorkspaceID); got != 1 {
			t.Errorf("admin memberships = %d, want 1", got)
		}
	})

	t.Run("does not let an API key remove a member", func(t *testing.T) {
		t.Parallel()
		h := newRemovalHarness(t, grants{"WORKSPACE_MEMBERS": true})
		h.addMember(t, 1, adminRoleID)
		leaving := h.addMember(t, 2, memberRoleID)
		h.acting = auth.Principal{WorkspaceID: workspace.PinnedWorkspaceID, APIKeyID: apiKeyID}
		if code := errorCode(h.sendAsActing(t, deleteMemberMutation, map[string]any{"workspaceMemberIdToDelete": leaving.workspaceMemberID})); code != "FORBIDDEN" {
			t.Errorf("error code = %v, want FORBIDDEN", code)
		}
	})
}

func TestDeleteUserAccount(t *testing.T) {
	t.Parallel()

	t.Run("leaves every workspace and soft deletes the user", func(t *testing.T) {
		t.Parallel()
		h := newRemovalHarness(t, grants{})
		h.addMember(t, 1, adminRoleID)
		leaving := h.addMember(t, 2, memberRoleID)

		if response := h.send(t, leaving, deleteAccountMutation, nil); response["errors"] != nil {
			t.Fatalf("errors = %v", response["errors"])
		}
		got := []int64{
			h.count(t, `SELECT count(*) FROM core."userWorkspace" WHERE id = $1`, leaving.userWorkspaceID),
			h.count(t, `SELECT count(*) FROM `+workspace.SchemaName()+`."workspaceMember" WHERE id = $1`, leaving.workspaceMemberID),
		}
		if diff := cmp.Diff([]int64{0, 0}, got); diff != "" {
			t.Errorf("remaining rows (-want +got):\n%s", diff)
		}
		if !h.deleted(t, `"user"`, leaving.userID) {
			t.Error("user was not soft deleted")
		}
	})

	t.Run("deletes a workspace whose only member leaves", func(t *testing.T) {
		t.Parallel()
		h := newRemovalHarness(t, grants{})
		only := h.addMember(t, 1, adminRoleID)
		h.send(t, only, deleteAccountMutation, nil)
		if !h.deleted(t, "workspace", workspace.PinnedWorkspaceID) || !h.deleted(t, `"user"`, only.userID) {
			t.Error("want workspace and user soft deleted")
		}
	})

	t.Run("is refused for the last admin of a workspace with other members, changing nothing", func(t *testing.T) {
		t.Parallel()
		h := newRemovalHarness(t, grants{})
		admin := h.addMember(t, 1, adminRoleID)
		h.addMember(t, 2, memberRoleID)
		if code := errorCode(h.send(t, admin, deleteAccountMutation, nil)); code != "FORBIDDEN" {
			t.Fatalf("error code = %v, want FORBIDDEN", code)
		}
		if h.deleted(t, `"user"`, admin.userID) || h.count(t, `SELECT count(*) FROM core."userWorkspace" WHERE id = $1`, admin.userWorkspaceID) != 1 {
			t.Error("account was changed though the deletion was refused")
		}
	})

	t.Run("is refused for an API key", func(t *testing.T) {
		t.Parallel()
		h := newRemovalHarness(t, grants{})
		h.acting = auth.Principal{WorkspaceID: workspace.PinnedWorkspaceID, APIKeyID: apiKeyID}
		if code := errorCode(h.sendAsActing(t, deleteAccountMutation, nil)); code != "FORBIDDEN" {
			t.Errorf("error code = %v, want FORBIDDEN", code)
		}
	})
}
