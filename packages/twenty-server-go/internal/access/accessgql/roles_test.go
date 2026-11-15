package accessgql_test

import (
	"testing"

	"github.com/google/go-cmp/cmp"

	"github.com/twentyhq/twenty/packages/twenty-server-go/internal/auth"
	"github.com/twentyhq/twenty/packages/twenty-server-go/internal/golden"
	"github.com/twentyhq/twenty/packages/twenty-server-go/internal/workspace"
)

const (
	auditorID = "7c9e6679-7425-40de-944b-e07fc1f90ae7"

	createRole = `mutation CreateOneRole($createRoleInput: CreateRoleInput!) { createOneRole(createRoleInput: $createRoleInput) { id label description icon canReadAllObjectRecords canBeAssignedToApiKeys } }`
	updateRole = `mutation UpdateOneRole($updateRoleInput: UpdateRoleInput!) { updateOneRole(updateRoleInput: $updateRoleInput) { id label canReadAllObjectRecords canUpdateAllObjectRecords } }`
	deleteRole = `mutation DeleteOneRole($roleId: UUID!) { deleteOneRole(roleId: $roleId) }`
	upsertFlag = `mutation UpsertPermissionFlags($upsertPermissionFlagsInput: UpsertPermissionFlagsInput!) { upsertPermissionFlags(upsertPermissionFlagsInput: $upsertPermissionFlagsInput) { flag roleId } }`
)

func (h harness) createRole(t *testing.T, input map[string]any) string {
	t.Helper()
	return h.data(t, "CreateOneRole", createRole, map[string]any{"createRoleInput": input})["createOneRole"].(map[string]any)["id"].(string)
}

func (h harness) insertObject(t *testing.T, name string, system bool) string {
	t.Helper()
	var id string
	err := h.pool.QueryRow(t.Context(), `INSERT INTO core."objectMetadata" ("nameSingular", "namePlural", "labelSingular", "labelPlural", "targetTableName", "isSystem",
			"workspaceId", "universalIdentifier", "applicationId")
		VALUES ($1::text, $1::text || 's', $1::text, $1::text || 's', 'DEPRECATED', $2, $3::uuid, gen_random_uuid(), (SELECT "workspaceCustomApplicationId" FROM core.workspace WHERE id = $3::uuid))
		RETURNING id::text`, name, system, workspace.PinnedWorkspaceID).Scan(&id)
	if err != nil {
		t.Fatalf("insert object: %v", err)
	}
	return id
}

func (h harness) insertField(t *testing.T, objectID, name, fieldType string, settings, targetObjectID, targetFieldID any) string {
	t.Helper()
	var id string
	err := h.pool.QueryRow(t.Context(), `INSERT INTO core."fieldMetadata" ("objectMetadataId", type, name, label, settings, "relationTargetObjectMetadataId", "relationTargetFieldMetadataId",
			"workspaceId", "universalIdentifier", "applicationId")
		VALUES ($1::uuid, $2, $3, $3, $4::jsonb, $5::uuid, $6::uuid, $7::uuid, gen_random_uuid(), (SELECT "workspaceCustomApplicationId" FROM core.workspace WHERE id = $7::uuid))
		RETURNING id::text`, objectID, fieldType, name, settings, targetObjectID, targetFieldID, workspace.PinnedWorkspaceID).Scan(&id)
	if err != nil {
		t.Fatalf("insert field: %v", err)
	}
	return id
}

func TestGetRole_matchesNodeGolden(t *testing.T) {
	t.Parallel()
	h := newHarness(t)
	h.createRole(t, map[string]any{"id": auditorID, "label": "Auditor", "icon": "IconEye", "canReadAllObjectRecords": true})
	h.data(t, "UpsertPermissionFlags", upsertFlag, map[string]any{"upsertPermissionFlagsInput": map[string]any{"roleId": auditorID, "permissionFlagKeys": []any{"API_KEYS_AND_WEBHOOKS"}}})
	golden.Assert(t, h.handler, "testdata", "GetRole", "data.getRole.permissionFlags.*.id")
}

func TestRoleOperations(t *testing.T) {
	t.Parallel()
	h := newHarness(t)

	created := h.data(t, "CreateOneRole", createRole, map[string]any{"createRoleInput": map[string]any{
		"label": "  Sales   lead ", "description": "Owns deals", "canReadAllObjectRecords": true, "canBeAssignedToApiKeys": false,
	}})["createOneRole"].(map[string]any)
	id := created["id"].(string)
	want := map[string]any{"id": id, "label": "Sales lead", "description": "Owns deals", "icon": nil, "canReadAllObjectRecords": true, "canBeAssignedToApiKeys": false}
	if diff := cmp.Diff(want, created); diff != "" {
		t.Errorf("createOneRole (-want +got):\n%s", diff)
	}

	updated := h.data(t, "UpdateOneRole", updateRole, map[string]any{"updateRoleInput": map[string]any{
		"id": id, "update": map[string]any{"label": "Revenue lead", "canUpdateAllObjectRecords": true},
	}})["updateOneRole"].(map[string]any)
	if diff := cmp.Diff(map[string]any{"id": id, "label": "Revenue lead", "canReadAllObjectRecords": true, "canUpdateAllObjectRecords": true}, updated); diff != "" {
		t.Errorf("updateOneRole (-want +got):\n%s", diff)
	}

	roles := h.data(t, "GetRoles", `query GetRoles { getRoles { id label } }`, nil)["getRoles"].([]any)
	if !containsRole(roles, id) {
		t.Errorf("getRoles = %v, want the created role listed", roles)
	}

	if got := h.data(t, "DeleteOneRole", deleteRole, map[string]any{"roleId": id})["deleteOneRole"]; got != id {
		t.Errorf("deleteOneRole = %v, want %s", got, id)
	}
	if got := errorCode(t, h.send(t, "GetRole", `query GetRole($id: UUID!) { getRole(id: $id) { id } }`, map[string]any{"id": id})); got != "NOT_FOUND" {
		t.Errorf("getRole after delete error code = %q, want NOT_FOUND", got)
	}
}

func containsRole(roles []any, id string) bool {
	for _, role := range roles {
		if role.(map[string]any)["id"] == id {
			return true
		}
	}
	return false
}

func TestRoleOperations_errors(t *testing.T) {
	t.Parallel()
	h := newHarness(t)
	existing := h.createRole(t, map[string]any{"label": "Existing"})
	var systemRoleID string
	if err := h.pool.QueryRow(t.Context(), `UPDATE core.role SET "isEditable" = false WHERE label = 'Plain member' RETURNING id::text`).Scan(&systemRoleID); err != nil {
		t.Fatalf("lock role: %v", err)
	}
	var adminRoleID string
	if err := h.pool.QueryRow(t.Context(), `SELECT "roleId"::text FROM core."roleTarget" WHERE "userWorkspaceId" = $1::uuid`, adminUserWorkspaceID).Scan(&adminRoleID); err != nil {
		t.Fatalf("find admin role: %v", err)
	}
	if _, err := h.pool.Exec(t.Context(), `UPDATE core.workspace SET "defaultRoleId" = $1::uuid WHERE id = $2::uuid`, existing, workspace.PinnedWorkspaceID); err != nil {
		t.Fatalf("set default role: %v", err)
	}
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
		{"duplicate label", "CreateOneRole", createRole, map[string]any{"createRoleInput": map[string]any{"label": "Existing"}}, "BAD_USER_INPUT"},
		{"write without read", "CreateOneRole", createRole, map[string]any{"createRoleInput": map[string]any{"label": "Odd", "canUpdateAllObjectRecords": true}}, "BAD_USER_INPUT"},
		{"update a system role", "UpdateOneRole", updateRole, update(systemRoleID, map[string]any{"label": "Renamed"}), "FORBIDDEN"},
		{"update an unknown role", "UpdateOneRole", updateRole, update(missingID, map[string]any{"label": "Renamed"}), "NOT_FOUND"},
		{"revoke own settings access", "UpdateOneRole", updateRole, update(adminRoleID, map[string]any{"canUpdateAllSettings": false}), "FORBIDDEN"},
		{"delete a system role", "DeleteOneRole", deleteRole, map[string]any{"roleId": systemRoleID}, "FORBIDDEN"},
		{"delete own role", "DeleteOneRole", deleteRole, map[string]any{"roleId": adminRoleID}, "FORBIDDEN"},
		{"delete the default role", "DeleteOneRole", deleteRole, map[string]any{"roleId": existing}, "FORBIDDEN"},
		{"unknown permission flag", "UpsertPermissionFlags", upsertFlag, map[string]any{"upsertPermissionFlagsInput": map[string]any{"roleId": existing, "permissionFlagKeys": []any{"NOPE"}}}, "BAD_USER_INPUT"},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()
			if got := errorCode(t, h.send(t, tt.operation, tt.query, tt.variables)); got != tt.wantCode {
				t.Errorf("error code = %q, want %q", got, tt.wantCode)
			}
		})
	}

	t.Run("member without the ROLES flag", func(t *testing.T) {
		t.Parallel()
		member := h.as(auth.Principal{UserWorkspaceID: memberWorkspaceID})
		if got := errorCode(t, member.send(t, "GetRoles", `query GetRoles { getRoles { id } }`, nil)); got != "FORBIDDEN" {
			t.Errorf("getRoles error code = %q, want FORBIDDEN", got)
		}
	})
}

func TestUpsertObjectPermissions(t *testing.T) {
	t.Parallel()
	h := newHarness(t)
	roleID := h.createRole(t, map[string]any{"label": "Scoped", "canReadAllObjectRecords": true})
	first, second := h.insertObject(t, "ticket", false), h.insertObject(t, "invoice", false)
	const upsert = `mutation UpsertObjectPermissions($upsertObjectPermissionsInput: UpsertObjectPermissionsInput!) {
		upsertObjectPermissions(upsertObjectPermissionsInput: $upsertObjectPermissionsInput) { objectMetadataId canReadObjectRecords canUpdateObjectRecords canSoftDeleteObjectRecords canDestroyObjectRecords restrictedFields } }`
	send := func(permissions ...map[string]any) map[string]any {
		items := make([]any, len(permissions))
		for i, permission := range permissions {
			items[i] = permission
		}
		return h.send(t, "UpsertObjectPermissions", upsert, map[string]any{"upsertObjectPermissionsInput": map[string]any{"roleId": roleID, "objectPermissions": items}})
	}
	decoded := func(response map[string]any) []any {
		t.Helper()
		if errs, bad := response["errors"]; bad {
			t.Fatalf("upsertObjectPermissions returned errors: %v", errs)
		}
		return response["data"].(map[string]any)["upsertObjectPermissions"].([]any)
	}

	got := decoded(send(map[string]any{"objectMetadataId": first, "canUpdateObjectRecords": false}, map[string]any{"objectMetadataId": second, "canReadObjectRecords": false}))
	if len(got) != 2 {
		t.Fatalf("upsertObjectPermissions = %v, want two permissions", got)
	}

	kept := decoded(send(map[string]any{"objectMetadataId": first, "canReadObjectRecords": true}))
	want := []any{map[string]any{"objectMetadataId": first, "canReadObjectRecords": true, "canUpdateObjectRecords": false,
		"canSoftDeleteObjectRecords": nil, "canDestroyObjectRecords": nil, "restrictedFields": nil}}
	if diff := cmp.Diff(want, kept); diff != "" {
		t.Errorf("upsert keeps unspecified flags (-want +got):\n%s", diff)
	}
	var remaining int
	if err := h.pool.QueryRow(t.Context(), `SELECT count(*) FROM core."objectPermission" WHERE "roleId" = $1::uuid`, roleID).Scan(&remaining); err != nil {
		t.Fatal(err)
	}
	if remaining != 1 {
		t.Errorf("permissions left after upserting one object = %d, want 1 because omitted objects are removed", remaining)
	}

	if got := errorCode(t, send(map[string]any{"objectMetadataId": second, "canReadObjectRecords": false, "canUpdateObjectRecords": true})); got != "BAD_USER_INPUT" {
		t.Errorf("update without read error code = %q, want BAD_USER_INPUT", got)
	}
	if got := errorCode(t, send(map[string]any{"objectMetadataId": missingID, "canReadObjectRecords": true})); got != "NOT_FOUND" {
		t.Errorf("unknown object error code = %q, want NOT_FOUND", got)
	}
}

func TestUpsertFieldPermissions(t *testing.T) {
	t.Parallel()
	h := newHarness(t)
	roleID := h.createRole(t, map[string]any{"label": "Restricted", "canReadAllObjectRecords": true})
	company, person, system := h.insertObject(t, "account", false), h.insertObject(t, "contact", false), h.insertObject(t, "ledger", true)
	revenue := h.insertField(t, company, "revenue", "NUMBER", nil, nil, nil)
	people := h.insertField(t, company, "people", "RELATION", `{"relationType":"ONE_TO_MANY"}`, nil, nil)
	employer := h.insertField(t, person, "employer", "RELATION", `{"relationType":"MANY_TO_ONE"}`, company, people)
	if _, err := h.pool.Exec(t.Context(), `UPDATE core."fieldMetadata" SET "relationTargetObjectMetadataId" = $2::uuid, "relationTargetFieldMetadataId" = $3::uuid WHERE id = $1::uuid`, people, person, employer); err != nil {
		t.Fatal(err)
	}
	hidden := h.insertField(t, system, "hidden", "TEXT", nil, nil, nil)
	const upsert = `mutation UpsertFieldPermissions($upsertFieldPermissionsInput: UpsertFieldPermissionsInput!) {
		upsertFieldPermissions(upsertFieldPermissionsInput: $upsertFieldPermissionsInput) { objectMetadataId fieldMetadataId roleId canReadFieldValue canUpdateFieldValue } }`
	send := func(permissions ...map[string]any) map[string]any {
		items := make([]any, len(permissions))
		for i, permission := range permissions {
			items[i] = permission
		}
		return h.send(t, "UpsertFieldPermissions", upsert, map[string]any{"upsertFieldPermissionsInput": map[string]any{"roleId": roleID, "fieldPermissions": items}})
	}

	response := send(map[string]any{"objectMetadataId": company, "fieldMetadataId": revenue, "canReadFieldValue": false})
	if errs, bad := response["errors"]; bad {
		t.Fatalf("upsertFieldPermissions returned errors: %v", errs)
	}
	want := []any{map[string]any{"objectMetadataId": company, "fieldMetadataId": revenue, "roleId": roleID, "canReadFieldValue": false, "canUpdateFieldValue": nil}}
	if diff := cmp.Diff(want, response["data"].(map[string]any)["upsertFieldPermissions"]); diff != "" {
		t.Errorf("upsertFieldPermissions (-want +got):\n%s", diff)
	}

	if errs := send(map[string]any{"objectMetadataId": company, "fieldMetadataId": people, "canUpdateFieldValue": false}); errs["errors"] != nil {
		t.Fatalf("restricting a relation returned errors: %v", errs["errors"])
	}
	var mirrored int
	if err := h.pool.QueryRow(t.Context(), `SELECT count(*) FROM core."fieldPermission" WHERE "roleId" = $1::uuid AND "fieldMetadataId" = $2::uuid AND "canUpdateFieldValue" = false`, roleID, employer).Scan(&mirrored); err != nil {
		t.Fatal(err)
	}
	if mirrored != 1 {
		t.Errorf("mirrored permissions on the relation target = %d, want 1", mirrored)
	}

	if errs := send(map[string]any{"objectMetadataId": company, "fieldMetadataId": revenue}); errs["errors"] != nil {
		t.Fatalf("clearing a permission returned errors: %v", errs["errors"])
	}
	var revenueRows int
	if err := h.pool.QueryRow(t.Context(), `SELECT count(*) FROM core."fieldPermission" WHERE "roleId" = $1::uuid AND "fieldMetadataId" = $2::uuid`, roleID, revenue).Scan(&revenueRows); err != nil {
		t.Fatal(err)
	}
	if revenueRows != 0 {
		t.Errorf("rows left after clearing a permission = %d, want 0", revenueRows)
	}

	errorCases := map[string]struct {
		permission map[string]any
		wantCode   string
	}{
		"grant instead of restrict": {map[string]any{"objectMetadataId": company, "fieldMetadataId": revenue, "canReadFieldValue": true}, "BAD_USER_INPUT"},
		"system object":             {map[string]any{"objectMetadataId": system, "fieldMetadataId": hidden, "canReadFieldValue": false}, "BAD_USER_INPUT"},
		"unknown field":             {map[string]any{"objectMetadataId": company, "fieldMetadataId": missingID, "canReadFieldValue": false}, "NOT_FOUND"},
	}
	for name, tt := range errorCases {
		if got := errorCode(t, send(tt.permission)); got != tt.wantCode {
			t.Errorf("%s error code = %q, want %q", name, got, tt.wantCode)
		}
	}
}

func TestGetRoles_relations(t *testing.T) {
	t.Parallel()
	h := newHarness(t)
	h.createRole(t, map[string]any{"id": auditorID, "label": "Auditor"})
	if _, err := h.pool.Exec(t.Context(), `UPDATE core."roleTarget" SET "roleId" = $1::uuid WHERE "userWorkspaceId" = $2::uuid`, auditorID, memberWorkspaceID); err != nil {
		t.Fatal(err)
	}
	if _, err := h.pool.Exec(t.Context(), `INSERT INTO `+workspace.SchemaName()+`."workspaceMember" ("userId", "nameFirstName", "nameLastName", "userEmail") VALUES ($1::uuid, 'Ada', 'Lovelace', 'ada@example.com')`, memberUserID); err != nil {
		t.Fatalf("insert workspace member: %v", err)
	}
	got := h.data(t, "GetRoles", `query GetRoles { getPermissionFlags { key } getRoles { id workspaceMembers { name { firstName lastName } userEmail userId userWorkspaceId avatarUrl }
		agents { id } apiKeys { id } permissionFlags { id } objectPermissions { objectMetadataId } fieldPermissions { id }
		rowLevelPermissionPredicates { id } rowLevelPermissionPredicateGroups { id } } }`, nil)
	if len(got["getPermissionFlags"].([]any)) == 0 {
		t.Errorf("getPermissionFlags = %v, want the flag catalogue", got["getPermissionFlags"])
	}
	for _, role := range got["getRoles"].([]any) {
		entry := role.(map[string]any)
		if entry["id"] != auditorID {
			continue
		}
		wantMembers := []any{map[string]any{
			"name": map[string]any{"firstName": "Ada", "lastName": "Lovelace"}, "userEmail": "ada@example.com", "userId": memberUserID,
			"userWorkspaceId": memberWorkspaceID, "avatarUrl": nil,
		}}
		if diff := cmp.Diff(wantMembers, entry["workspaceMembers"]); diff != "" {
			t.Errorf("workspaceMembers (-want +got):\n%s", diff)
		}
		return
	}
	t.Errorf("getRoles = %v, want the Auditor role", got["getRoles"])
}
