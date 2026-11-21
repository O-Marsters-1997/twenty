package accessgql_test

import (
	"testing"

	"github.com/google/go-cmp/cmp"

	"github.com/twentyhq/twenty/packages/twenty-server-go/internal/auth"
	"github.com/twentyhq/twenty/packages/twenty-server-go/internal/golden"
	"github.com/twentyhq/twenty/packages/twenty-server-go/internal/workspace"
)

const (
	adminRoleID  = "25e5d967-e3b2-434e-bbd6-53a6181cf580"
	memberRoleID = "f4cc34a9-a20e-418f-8c5c-78b7b1c77881"

	createRole  = `mutation CreateOneRole($createRoleInput: CreateRoleInput!) { createOneRole(createRoleInput: $createRoleInput) { id label description icon canReadAllObjectRecords canBeAssignedToApiKeys isEditable } }`
	updateRole  = `mutation UpdateOneRole($updateRoleInput: UpdateRoleInput!) { updateOneRole(updateRoleInput: $updateRoleInput) { id label description canUpdateAllSettings canReadAllObjectRecords } }`
	deleteRole  = `mutation DeleteOneRole($roleId: UUID!) { deleteOneRole(roleId: $roleId) }`
	upsertFlags = `mutation UpsertPermissionFlags($upsertPermissionFlagsInput: UpsertPermissionFlagsInput!) { upsertPermissionFlags(upsertPermissionFlagsInput: $upsertPermissionFlagsInput) { flag roleId } }`
	upsertObjs  = `mutation UpsertObjectPermissions($upsertObjectPermissionsInput: UpsertObjectPermissionsInput!) { upsertObjectPermissions(upsertObjectPermissionsInput: $upsertObjectPermissionsInput) { objectMetadataId canReadObjectRecords canUpdateObjectRecords canSoftDeleteObjectRecords canDestroyObjectRecords restrictedFields } }`
	upsertField = `mutation UpsertFieldPermissions($upsertFieldPermissionsInput: UpsertFieldPermissionsInput!) { upsertFieldPermissions(upsertFieldPermissionsInput: $upsertFieldPermissionsInput) { objectMetadataId fieldMetadataId roleId canReadFieldValue canUpdateFieldValue } }`
)

func (h harness) exec(t *testing.T, statement string, args ...any) {
	t.Helper()
	if _, err := h.pool.Exec(t.Context(), statement, args...); err != nil {
		t.Fatalf("exec %q: %v", statement, err)
	}
}

func (h harness) scan(t *testing.T, statement string, args ...any) string {
	t.Helper()
	var value string
	if err := h.pool.QueryRow(t.Context(), statement, args...).Scan(&value); err != nil {
		t.Fatalf("query %q: %v", statement, err)
	}
	return value
}

func (h harness) personObjectID(t *testing.T) string {
	t.Helper()
	return h.scan(t, `SELECT id::text FROM core."objectMetadata" WHERE "nameSingular" = 'person' AND "workspaceId" = $1::uuid`, workspace.PinnedWorkspaceID)
}

func TestGetRoles_matchesNodeGolden(t *testing.T) {
	t.Parallel()
	h := newHarness(t)
	golden.Assert(t, h.handler, "testdata", "GetRoles", "data.getRoles.*.id")
}

func TestGetRole_matchesNodeGolden(t *testing.T) {
	t.Parallel()
	h := newHarness(t)
	h.exec(t, `INSERT INTO core."rolePermissionFlag" ("roleId", "workspaceId", "universalIdentifier", "applicationId", "permissionFlagId")
		SELECT $1::uuid, $2::uuid, gen_random_uuid(), "applicationId", id FROM core."permissionFlag" WHERE key = 'ROLES' AND "workspaceId" = $2::uuid`, memberRoleID, workspace.PinnedWorkspaceID)
	h.exec(t, `INSERT INTO core."objectPermission" ("roleId", "objectMetadataId", "canReadObjectRecords", "workspaceId", "universalIdentifier", "applicationId")
		VALUES ($1::uuid, $2::uuid, false, $3::uuid, gen_random_uuid(), (SELECT "workspaceCustomApplicationId" FROM core.workspace WHERE id = $3::uuid))`,
		memberRoleID, h.personObjectID(t), workspace.PinnedWorkspaceID)
	golden.Assert(t, h.handler, "testdata", "GetRole", "data.getRole.permissionFlags.*.id", "data.getRole.objectPermissions.*.objectMetadataId")
}

func TestRoleRelations(t *testing.T) {
	t.Parallel()
	h := newHarness(t)
	apiKeyID := h.scan(t, `INSERT INTO core."apiKey" (name, "expiresAt", "workspaceId") VALUES ('CI', '2030-01-01', $1::uuid) RETURNING id::text`, workspace.PinnedWorkspaceID)
	h.exec(t, `INSERT INTO core."roleTarget" ("roleId", "apiKeyId", "universalIdentifier", "workspaceId", "applicationId")
		VALUES ($1::uuid, $2::uuid, gen_random_uuid(), $3::uuid, (SELECT "workspaceCustomApplicationId" FROM core.workspace WHERE id = $3::uuid))`, adminRoleID, apiKeyID, workspace.PinnedWorkspaceID)
	h.exec(t, `INSERT INTO workspace_2abogkkt2zd45pa9aun09djpf."workspaceMember" ("nameFirstName", "nameLastName", "userEmail", "userId") VALUES ('Ada', 'Lovelace', 'ada@example.com', $1::uuid)`, memberUserID)
	h.exec(t, `UPDATE core."roleTarget" SET "roleId" = $1::uuid WHERE "userWorkspaceId" = $2::uuid`, memberRoleID, memberWorkspaceID)

	got := h.data(t, "GetRole", `query GetRole($id: UUID!) { getRole(id: $id) { workspaceMembers { name { firstName lastName } userEmail userId userWorkspaceId } } }`,
		map[string]any{"id": memberRoleID})["getRole"].(map[string]any)["workspaceMembers"]
	want := []any{map[string]any{"name": map[string]any{"firstName": "Ada", "lastName": "Lovelace"}, "userEmail": "ada@example.com", "userId": memberUserID, "userWorkspaceId": memberWorkspaceID}}
	if diff := cmp.Diff(want, got); diff != "" {
		t.Errorf("workspaceMembers (-want +got):\n%s", diff)
	}

	keys := h.data(t, "GetRole", `query GetRole($id: UUID!) { getRole(id: $id) { apiKeys { id name revokedAt } } }`, map[string]any{"id": adminRoleID})["getRole"].(map[string]any)["apiKeys"]
	if diff := cmp.Diff([]any{map[string]any{"id": apiKeyID, "name": "CI", "revokedAt": nil}}, keys); diff != "" {
		t.Errorf("apiKeys (-want +got):\n%s", diff)
	}

	flags := h.data(t, "GetRoles", `query GetRoles { getPermissionFlags { key permissionType } }`, nil)["getPermissionFlags"].([]any)
	if len(flags) == 0 {
		t.Errorf("getPermissionFlags = %v, want the catalogue", flags)
	}
}

func TestRoleOperations(t *testing.T) {
	t.Parallel()
	h := newHarness(t)

	created := h.data(t, "CreateOneRole", createRole, map[string]any{"createRoleInput": map[string]any{"label": "  Sales   rep ", "description": " Sells "}})["createOneRole"].(map[string]any)
	id := created["id"].(string)
	want := map[string]any{"id": id, "label": "Sales rep", "description": "Sells", "icon": nil, "canReadAllObjectRecords": false, "canBeAssignedToApiKeys": true, "isEditable": true}
	if diff := cmp.Diff(want, created); diff != "" {
		t.Errorf("createOneRole (-want +got):\n%s", diff)
	}

	updated := h.data(t, "UpdateOneRole", updateRole, map[string]any{"updateRoleInput": map[string]any{"id": id, "update": map[string]any{"description": nil, "canReadAllObjectRecords": true}}})["updateOneRole"].(map[string]any)
	wantUpdated := map[string]any{"id": id, "label": "Sales rep", "description": nil, "canUpdateAllSettings": false, "canReadAllObjectRecords": true}
	if diff := cmp.Diff(wantUpdated, updated); diff != "" {
		t.Errorf("updateOneRole (-want +got):\n%s", diff)
	}

	apiKeyID := h.scan(t, `INSERT INTO core."apiKey" (name, "expiresAt", "workspaceId") VALUES ('CI', '2030-01-01', $1::uuid) RETURNING id::text`, workspace.PinnedWorkspaceID)
	h.exec(t, `UPDATE core.role SET "canBeAssignedToApiKeys" = true WHERE id = $1::uuid`, memberRoleID)
	h.exec(t, `INSERT INTO core."roleTarget" ("roleId", "apiKeyId", "universalIdentifier", "workspaceId", "applicationId")
		VALUES ($1::uuid, $2::uuid, gen_random_uuid(), $3::uuid, (SELECT "workspaceCustomApplicationId" FROM core.workspace WHERE id = $3::uuid))`, id, apiKeyID, workspace.PinnedWorkspaceID)
	deleted := h.data(t, "DeleteOneRole", deleteRole, map[string]any{"roleId": id})["deleteOneRole"]
	if deleted != id {
		t.Errorf("deleteOneRole = %v, want %s", deleted, id)
	}
	if rebound := h.scan(t, `SELECT "roleId"::text FROM core."roleTarget" WHERE "apiKeyId" = $1::uuid`, apiKeyID); rebound != memberRoleID {
		t.Errorf("API key role after delete = %s, want the default role %s", rebound, memberRoleID)
	}
}

func TestRoleOperations_errors(t *testing.T) {
	t.Parallel()
	h := newHarness(t)
	salesID := h.insertRole(t, "Sales", true)
	adminRole := h.scan(t, `SELECT "roleId"::text FROM core."roleTarget" WHERE "userWorkspaceId" = $1::uuid`, adminUserWorkspaceID)
	update := func(id string, changes map[string]any) map[string]any {
		return map[string]any{"updateRoleInput": map[string]any{"id": id, "update": changes}}
	}
	tests := []struct {
		name      string
		operation string
		query     string
		variables map[string]any
		wantCode  string
	}{
		{"create with a taken label", "CreateOneRole", createRole, map[string]any{"createRoleInput": map[string]any{"label": "Sales"}}, "BAD_USER_INPUT"},
		{"create writing without reading", "CreateOneRole", createRole, map[string]any{"createRoleInput": map[string]any{"label": "Writer", "canUpdateAllObjectRecords": true}}, "BAD_USER_INPUT"},
		{"update an unknown role", "UpdateOneRole", updateRole, update(missingID, map[string]any{"label": "X"}), "NOT_FOUND"},
		{"update a system role", "UpdateOneRole", updateRole, update(adminRoleID, map[string]any{"label": "X"}), "FORBIDDEN"},
		{"update to a taken label", "UpdateOneRole", updateRole, update(salesID, map[string]any{"label": "Member"}), "BAD_USER_INPUT"},
		{"clear the label", "UpdateOneRole", updateRole, update(salesID, map[string]any{"label": nil}), "BAD_USER_INPUT"},
		{"revoke own settings access", "UpdateOneRole", updateRole, update(adminRole, map[string]any{"canUpdateAllSettings": false}), "FORBIDDEN"},
		{"delete an unknown role", "DeleteOneRole", deleteRole, map[string]any{"roleId": missingID}, "NOT_FOUND"},
		{"delete the default role", "DeleteOneRole", deleteRole, map[string]any{"roleId": memberRoleID}, "FORBIDDEN"},
		{"delete a system role", "DeleteOneRole", deleteRole, map[string]any{"roleId": adminRoleID}, "FORBIDDEN"},
		{"delete own role", "DeleteOneRole", deleteRole, map[string]any{"roleId": adminRole}, "FORBIDDEN"},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()
			if got := errorCode(t, h.send(t, tt.operation, tt.query, tt.variables)); got != tt.wantCode {
				t.Errorf("error code = %q, want %q", got, tt.wantCode)
			}
		})
	}

	t.Run("a member without the ROLES permission is refused", func(t *testing.T) {
		t.Parallel()
		member := h.as(auth.Principal{UserWorkspaceID: memberWorkspaceID})
		if got := errorCode(t, member.send(t, "GetRoles", `query GetRoles { getRoles { id } }`, nil)); got != "FORBIDDEN" {
			t.Errorf("error code = %q, want FORBIDDEN", got)
		}
	})
}

func TestUpsertPermissionFlags(t *testing.T) {
	t.Parallel()
	h := newHarness(t)
	roleID := h.insertRole(t, "Support", true)
	send := func(keys ...any) map[string]any {
		return map[string]any{"upsertPermissionFlagsInput": map[string]any{"roleId": roleID, "permissionFlagKeys": keys}}
	}

	got := h.data(t, "UpsertPermissionFlags", upsertFlags, send("ROLES", "API_KEYS_AND_WEBHOOKS"))["upsertPermissionFlags"].([]any)
	if len(got) != 2 {
		t.Errorf("upsertPermissionFlags = %v, want both flags", got)
	}
	got = h.data(t, "UpsertPermissionFlags", upsertFlags, send("ROLES"))["upsertPermissionFlags"].([]any)
	if diff := cmp.Diff([]any{map[string]any{"flag": "ROLES", "roleId": roleID}}, got); diff != "" {
		t.Errorf("upsertPermissionFlags after removing one (-want +got):\n%s", diff)
	}
	if got := errorCode(t, h.send(t, "UpsertPermissionFlags", upsertFlags, send("NOT_A_FLAG"))); got != "BAD_USER_INPUT" {
		t.Errorf("unknown flag error code = %q, want BAD_USER_INPUT", got)
	}
	missing := map[string]any{"upsertPermissionFlagsInput": map[string]any{"roleId": missingID, "permissionFlagKeys": []any{}}}
	if got := errorCode(t, h.send(t, "UpsertPermissionFlags", upsertFlags, missing)); got != "NOT_FOUND" {
		t.Errorf("unknown role error code = %q, want NOT_FOUND", got)
	}
	system := map[string]any{"upsertPermissionFlagsInput": map[string]any{"roleId": adminRoleID, "permissionFlagKeys": []any{"ROLES"}}}
	if got := errorCode(t, h.send(t, "UpsertPermissionFlags", upsertFlags, system)); got != "FORBIDDEN" {
		t.Errorf("system role error code = %q, want FORBIDDEN", got)
	}
}

func TestUpsertObjectPermissions(t *testing.T) {
	t.Parallel()
	h := newHarness(t)
	roleID := h.insertRole(t, "Support", true)
	personID := h.personObjectID(t)
	companyID := h.scan(t, `SELECT id::text FROM core."objectMetadata" WHERE "nameSingular" = 'company' AND "workspaceId" = $1::uuid`, workspace.PinnedWorkspaceID)
	send := func(permissions ...any) map[string]any {
		return map[string]any{"upsertObjectPermissionsInput": map[string]any{"roleId": roleID, "objectPermissions": permissions}}
	}

	got := h.data(t, "UpsertObjectPermissions", upsertObjs, send(
		map[string]any{"objectMetadataId": personID, "canReadObjectRecords": true},
		map[string]any{"objectMetadataId": companyID, "canReadObjectRecords": true, "canDestroyObjectRecords": false},
	))["upsertObjectPermissions"].([]any)
	if len(got) != 2 {
		t.Fatalf("upsertObjectPermissions = %v, want two permissions", got)
	}

	got = h.data(t, "UpsertObjectPermissions", upsertObjs, send(map[string]any{"objectMetadataId": personID, "canUpdateObjectRecords": true}))["upsertObjectPermissions"].([]any)
	wantPerson := map[string]any{"objectMetadataId": personID, "canReadObjectRecords": true, "canUpdateObjectRecords": true,
		"canSoftDeleteObjectRecords": nil, "canDestroyObjectRecords": nil, "restrictedFields": nil}
	if diff := cmp.Diff([]any{wantPerson}, got); diff != "" {
		t.Errorf("upsertObjectPermissions merge (-want +got):\n%s", diff)
	}
	if remaining := h.scan(t, `SELECT count(*)::text FROM core."objectPermission" WHERE "roleId" = $1::uuid`, roleID); remaining != "1" {
		t.Errorf("object permissions kept = %s, want the omitted object removed", remaining)
	}

	tests := []struct {
		name     string
		variable map[string]any
		wantCode string
	}{
		{"update without read", send(map[string]any{"objectMetadataId": personID, "canReadObjectRecords": false, "canUpdateObjectRecords": true}), "BAD_USER_INPUT"},
		{"unknown object", send(map[string]any{"objectMetadataId": missingID, "canReadObjectRecords": true}), "NOT_FOUND"},
		{"system role", map[string]any{"upsertObjectPermissionsInput": map[string]any{"roleId": adminRoleID, "objectPermissions": []any{map[string]any{"objectMetadataId": personID}}}}, "FORBIDDEN"},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()
			if got := errorCode(t, h.send(t, "UpsertObjectPermissions", upsertObjs, tt.variable)); got != tt.wantCode {
				t.Errorf("error code = %q, want %q", got, tt.wantCode)
			}
		})
	}
}

func TestUpsertFieldPermissions(t *testing.T) {
	t.Parallel()
	h := newHarness(t)
	roleID := h.insertRole(t, "Support", true)
	personID := h.personObjectID(t)
	jobTitleID := h.scan(t, `SELECT id::text FROM core."fieldMetadata" WHERE name = 'jobTitle' AND "objectMetadataId" = $1::uuid`, personID)
	companyFieldID := h.scan(t, `SELECT id::text FROM core."fieldMetadata" WHERE name = 'company' AND "objectMetadataId" = $1::uuid`, personID)
	companyObjectID := h.scan(t, `SELECT "relationTargetObjectMetadataId"::text FROM core."fieldMetadata" WHERE id = $1::uuid`, companyFieldID)
	peopleFieldID := h.scan(t, `SELECT "relationTargetFieldMetadataId"::text FROM core."fieldMetadata" WHERE id = $1::uuid`, companyFieldID)
	send := func(permissions ...any) map[string]any {
		return map[string]any{"upsertFieldPermissionsInput": map[string]any{"roleId": roleID, "fieldPermissions": permissions}}
	}
	restrict := func(fieldID string, read any) map[string]any {
		return map[string]any{"objectMetadataId": personID, "fieldMetadataId": fieldID, "canReadFieldValue": read}
	}

	got := h.data(t, "UpsertFieldPermissions", upsertField, send(restrict(jobTitleID, false)))["upsertFieldPermissions"].([]any)
	want := []any{map[string]any{"objectMetadataId": personID, "fieldMetadataId": jobTitleID, "roleId": roleID, "canReadFieldValue": false, "canUpdateFieldValue": nil}}
	if diff := cmp.Diff(want, got); diff != "" {
		t.Errorf("upsertFieldPermissions (-want +got):\n%s", diff)
	}

	h.data(t, "UpsertFieldPermissions", upsertField, send(restrict(companyFieldID, false)))
	mirrored := h.scan(t, `SELECT "canReadFieldValue"::text FROM core."fieldPermission" WHERE "fieldMetadataId" = $1::uuid AND "objectMetadataId" = $2::uuid AND "roleId" = $3::uuid`, peopleFieldID, companyObjectID, roleID)
	if mirrored != "false" {
		t.Errorf("mirrored relation permission = %q, want false", mirrored)
	}
	h.data(t, "UpsertFieldPermissions", upsertField, send(restrict(companyFieldID, nil)))
	if remaining := h.scan(t, `SELECT count(*)::text FROM core."fieldPermission" WHERE "roleId" = $1::uuid`, roleID); remaining != "1" {
		t.Errorf("field permissions after clearing the relation = %s, want only the jobTitle restriction", remaining)
	}

	tests := []struct {
		name     string
		variable map[string]any
		wantCode string
	}{
		{"granting access", send(restrict(jobTitleID, true)), "BAD_USER_INPUT"},
		{"duplicate field", send(restrict(jobTitleID, false), restrict(jobTitleID, false)), "BAD_USER_INPUT"},
		{"unknown field", send(restrict(missingID, false)), "NOT_FOUND"},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()
			if got := errorCode(t, h.send(t, "UpsertFieldPermissions", upsertField, tt.variable)); got != tt.wantCode {
				t.Errorf("error code = %q, want %q", got, tt.wantCode)
			}
		})
	}
}
