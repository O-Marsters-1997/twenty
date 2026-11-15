package applicationgql_test

import (
	"bytes"
	"encoding/json"
	"io"
	"log/slog"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/google/go-cmp/cmp"
	"github.com/jackc/pgx/v5/pgxpool"

	accessstore "github.com/twentyhq/twenty/packages/twenty-server-go/internal/access/store"
	"github.com/twentyhq/twenty/packages/twenty-server-go/internal/application/applicationgql"
	"github.com/twentyhq/twenty/packages/twenty-server-go/internal/application/store"
	"github.com/twentyhq/twenty/packages/twenty-server-go/internal/auth"
	"github.com/twentyhq/twenty/packages/twenty-server-go/internal/golden"
	"github.com/twentyhq/twenty/packages/twenty-server-go/internal/pgtest"
	"github.com/twentyhq/twenty/packages/twenty-server-go/internal/workspace"
)

const (
	customApplicationID  = "ad2ef204-2bbe-4670-b093-6c8ad3c40ca7"
	standardUniversalID  = "20202020-64aa-4b6f-b003-9c74b97cee20"
	recordCreatedTypeID  = "81ad5bfe-511d-4964-a9b0-61febda61923"
	adminUserID          = "0b7a6c1e-3f55-4a47-8d6e-6c1f1b7f2a01"
	adminUserWorkspaceID = "0b7a6c1e-3f55-4a47-8d6e-6c1f1b7f2a02"
	memberUserID         = "0b7a6c1e-3f55-4a47-8d6e-6c1f1b7f2a03"
	memberWorkspaceID    = "0b7a6c1e-3f55-4a47-8d6e-6c1f1b7f2a04"
	missingID            = "00000000-0000-4000-8000-000000000000"
)

type harness struct {
	handler http.Handler
	graphql http.Handler
	pool    *pgxpool.Pool
}

func (h harness) as(principal auth.Principal) harness {
	h.handler = http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		h.graphql.ServeHTTP(w, r.WithContext(auth.WithPrincipal(r.Context(), principal)))
	})
	return h
}

func newHarness(t *testing.T) harness {
	t.Helper()
	pool, err := pgxpool.New(t.Context(), pgtest.New(t))
	if err != nil {
		t.Fatalf("connect: %v", err)
	}
	t.Cleanup(pool.Close)
	graphql := applicationgql.NewHandler(&applicationgql.Resolver{
		Applications:  store.NewApplications(pool, "https://crm.example.com"),
		TimelineTypes: store.NewTimelineActivityTypes(pool),
		Permissions:   accessstore.NewPermissions(pool),
	}, slog.New(slog.NewTextHandler(io.Discard, nil)))
	h := harness{graphql: graphql, pool: pool}
	h.seedSession(t, adminUserID, adminUserWorkspaceID, "Workspace admin", true)
	h.seedSession(t, memberUserID, memberWorkspaceID, "Plain member", false)
	return h.as(auth.Principal{UserID: adminUserID, UserWorkspaceID: adminUserWorkspaceID})
}

func (h harness) seedSession(t *testing.T, userID, userWorkspaceID, roleLabel string, canUpdateAllSettings bool) {
	t.Helper()
	statements := []string{
		`INSERT INTO core."user" (id, email) VALUES ('` + userID + `', '` + userID + `@example.com')`,
		`INSERT INTO core."userWorkspace" (id, "userId", "workspaceId") VALUES ('` + userWorkspaceID + `', '` + userID + `', '` + workspace.PinnedWorkspaceID + `')`,
	}
	for _, statement := range statements {
		if _, err := h.pool.Exec(t.Context(), statement); err != nil {
			t.Fatalf("seed session: %v", err)
		}
	}
	var roleID string
	err := h.pool.QueryRow(t.Context(), `INSERT INTO core.role (label, "workspaceId", "canUpdateAllSettings", "canBeAssignedToApiKeys", "universalIdentifier", "applicationId")
		VALUES ($1, $2::uuid, $3, false, gen_random_uuid(), (SELECT "workspaceCustomApplicationId" FROM core.workspace WHERE id = $2::uuid)) RETURNING id::text`,
		roleLabel, workspace.PinnedWorkspaceID, canUpdateAllSettings).Scan(&roleID)
	if err != nil {
		t.Fatalf("seed role: %v", err)
	}
	_, err = h.pool.Exec(t.Context(), `INSERT INTO core."roleTarget" ("roleId", "userWorkspaceId", "universalIdentifier", "workspaceId", "applicationId")
		VALUES ($1::uuid, $2::uuid, gen_random_uuid(), $3::uuid, (SELECT "workspaceCustomApplicationId" FROM core.workspace WHERE id = $3::uuid))`,
		roleID, userWorkspaceID, workspace.PinnedWorkspaceID)
	if err != nil {
		t.Fatalf("seed role target: %v", err)
	}
}

func (h harness) send(t *testing.T, operation, query string, variables map[string]any) map[string]any {
	t.Helper()
	body, err := json.Marshal(map[string]any{"operationName": operation, "query": query, "variables": variables})
	if err != nil {
		t.Fatal(err)
	}
	req := httptest.NewRequestWithContext(t.Context(), http.MethodPost, "/metadata", bytes.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	recorder := httptest.NewRecorder()
	h.handler.ServeHTTP(recorder, req)
	var decoded map[string]any
	if err := json.Unmarshal(recorder.Body.Bytes(), &decoded); err != nil {
		t.Fatalf("decode %s response: %v", operation, err)
	}
	return decoded
}

func (h harness) data(t *testing.T, operation, query string, variables map[string]any) map[string]any {
	t.Helper()
	decoded := h.send(t, operation, query, variables)
	if errs, bad := decoded["errors"]; bad {
		t.Fatalf("%s returned errors: %v", operation, errs)
	}
	return decoded["data"].(map[string]any)
}

func errorCode(t *testing.T, decoded map[string]any) string {
	t.Helper()
	errs, ok := decoded["errors"].([]any)
	if !ok || len(errs) == 0 {
		t.Fatalf("response = %v, want an error", decoded)
	}
	return errs[0].(map[string]any)["extensions"].(map[string]any)["code"].(string)
}

const (
	setActiveMutation = `mutation UpdateTimelineActivityTypeIsActive($input: UpdateTimelineActivityTypeInput!) { updateTimelineActivityType(input: $input) { id isActive } }`
	resetMutation     = `mutation ResetTimelineActivityType($id: UUID!) { resetTimelineActivityType(id: $id) { id label icon isActive } }`
	listTypesQuery    = `query FindManyTimelineActivityTypes { timelineActivityTypes { id isActive } }`
)

func (h harness) isActive(t *testing.T, id string) bool {
	t.Helper()
	for _, item := range h.data(t, "FindManyTimelineActivityTypes", listTypesQuery, nil)["timelineActivityTypes"].([]any) {
		if row := item.(map[string]any); row["id"] == id {
			return row["isActive"].(bool)
		}
	}
	t.Fatalf("timeline activity type %s not listed", id)
	return false
}

func (h harness) overrides(t *testing.T, id string) *string {
	t.Helper()
	var stored *string
	if err := h.pool.QueryRow(t.Context(), `SELECT overrides::text FROM core."timelineActivityType" WHERE id = $1::uuid`, id).Scan(&stored); err != nil {
		t.Fatalf("read overrides: %v", err)
	}
	return stored
}

func TestApplicationQueries_matchNodeGoldens(t *testing.T) {
	t.Parallel()
	h := newHarness(t)
	for _, name := range []string{"FindManyApplications", "FindManyApplicationsForToolTable", "FindOneApplicationName", "FindOneApplicationByUniversalIdentifier", "FindOneApplicationSummary"} {
		t.Run(name, func(t *testing.T) {
			golden.Assert(t, h.handler, "testdata", name, "data.findManyApplications.*.createdAt", "data.findOneApplication.createdAt")
		})
	}
}

func TestFindManyTimelineActivityTypes_matchesNodeGolden(t *testing.T) {
	t.Parallel()
	h := newHarness(t)
	golden.Assert(t, h.handler, "testdata", "FindManyTimelineActivityTypes")
}

func TestFindOneApplication(t *testing.T) {
	t.Parallel()
	h := newHarness(t)
	const query = `query FindOneApplicationName($id: UUID, $universalIdentifier: UUID) { findOneApplication(id: $id, universalIdentifier: $universalIdentifier) { id name } }`

	t.Run("errors", func(t *testing.T) {
		tests := []struct {
			name      string
			variables map[string]any
			wantCode  string
		}{
			{name: "unknown id", variables: map[string]any{"id": missingID}, wantCode: "NOT_FOUND"},
			{name: "neither argument", variables: map[string]any{}, wantCode: "BAD_USER_INPUT"},
			{name: "both arguments", variables: map[string]any{"id": customApplicationID, "universalIdentifier": standardUniversalID}, wantCode: "BAD_USER_INPUT"},
		}
		for _, tt := range tests {
			t.Run(tt.name, func(t *testing.T) {
				if got := errorCode(t, h.send(t, "FindOneApplicationName", query, tt.variables)); got != tt.wantCode {
					t.Errorf("code = %q, want %q", got, tt.wantCode)
				}
			})
		}
	})

	t.Run("logo url", func(t *testing.T) {
		if _, err := h.pool.Exec(t.Context(), `UPDATE core.application SET logo = 'logo.png' WHERE id = $1::uuid`, customApplicationID); err != nil {
			t.Fatal(err)
		}
		got := h.data(t, "FindManyApplications", `query FindManyApplications { findManyApplications { id logoUrl } }`, nil)["findManyApplications"].([]any)
		want := "https://crm.example.com/public-assets/" + workspace.PinnedWorkspaceID + "/" + customApplicationID + "/logo.png"
		for _, item := range got {
			if row := item.(map[string]any); row["id"] == customApplicationID && row["logoUrl"] != want {
				t.Errorf("logoUrl = %v, want %s", row["logoUrl"], want)
			}
		}
	})
}

func TestApplicationOperations_requireApplicationsPermission(t *testing.T) {
	t.Parallel()
	h := newHarness(t)
	member := h.as(auth.Principal{UserID: memberUserID, UserWorkspaceID: memberWorkspaceID})

	tests := []struct {
		name, query string
		variables   map[string]any
	}{
		{name: "FindManyApplications", query: `query FindManyApplications { findManyApplications { id } }`},
		{name: "UpdateTimelineActivityTypeIsActive", query: setActiveMutation, variables: map[string]any{"input": map[string]any{"id": recordCreatedTypeID, "isActive": false}}},
		{name: "ResetTimelineActivityType", query: resetMutation, variables: map[string]any{"id": recordCreatedTypeID}},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if got := errorCode(t, member.send(t, tt.name, tt.query, tt.variables)); got != "FORBIDDEN" {
				t.Errorf("code = %q, want FORBIDDEN", got)
			}
		})
	}

	t.Run("listing timeline activity types needs no permission", func(t *testing.T) {
		member.data(t, "FindManyTimelineActivityTypes", listTypesQuery, nil)
	})
}

func TestUpdateTimelineActivityTypeIsActive(t *testing.T) {
	t.Parallel()

	t.Run("standard type records an override and leaves the column", func(t *testing.T) {
		h := newHarness(t)
		h.data(t, "UpdateTimelineActivityTypeIsActive", setActiveMutation, map[string]any{"input": map[string]any{"id": recordCreatedTypeID, "isActive": false}})

		if h.isActive(t, recordCreatedTypeID) {
			t.Error("isActive = true after deactivating, want false")
		}
		var column bool
		if err := h.pool.QueryRow(t.Context(), `SELECT "isActive" FROM core."timelineActivityType" WHERE id = $1::uuid`, recordCreatedTypeID).Scan(&column); err != nil {
			t.Fatal(err)
		}
		if !column {
			t.Error(`column "isActive" = false, want it untouched`)
		}
		var override map[string]any
		stored := h.overrides(t, recordCreatedTypeID)
		if stored == nil {
			t.Fatal("overrides = NULL, want the custom application entry")
		}
		if err := json.Unmarshal([]byte(*stored), &override); err != nil {
			t.Fatal(err)
		}
		want := map[string]any{customApplicationID: map[string]any{"isActive": false}}
		if diff := cmp.Diff(want, override); diff != "" {
			t.Errorf("overrides (-want +got):\n%s", diff)
		}
	})

	t.Run("reactivating removes the override", func(t *testing.T) {
		h := newHarness(t)
		for _, active := range []bool{false, true} {
			h.data(t, "UpdateTimelineActivityTypeIsActive", setActiveMutation, map[string]any{"input": map[string]any{"id": recordCreatedTypeID, "isActive": active}})
		}
		if !h.isActive(t, recordCreatedTypeID) {
			t.Error("isActive = false after reactivating, want true")
		}
		if stored := h.overrides(t, recordCreatedTypeID); stored != nil {
			t.Errorf("overrides = %s, want NULL", *stored)
		}
	})

	t.Run("custom type updates the column", func(t *testing.T) {
		h := newHarness(t)
		customTypeID := h.insertCustomType(t)
		h.data(t, "UpdateTimelineActivityTypeIsActive", setActiveMutation, map[string]any{"input": map[string]any{"id": customTypeID, "isActive": false}})

		var column bool
		if err := h.pool.QueryRow(t.Context(), `SELECT "isActive" FROM core."timelineActivityType" WHERE id = $1::uuid`, customTypeID).Scan(&column); err != nil {
			t.Fatal(err)
		}
		if column {
			t.Error(`column "isActive" = true, want false`)
		}
		if stored := h.overrides(t, customTypeID); stored != nil {
			t.Errorf("overrides = %s, want NULL", *stored)
		}
	})

	t.Run("unknown type", func(t *testing.T) {
		h := newHarness(t)
		got := h.send(t, "UpdateTimelineActivityTypeIsActive", setActiveMutation, map[string]any{"input": map[string]any{"id": missingID, "isActive": false}})
		if code := errorCode(t, got); code != "NOT_FOUND" {
			t.Errorf("code = %q, want NOT_FOUND", code)
		}
	})
}

func TestResetTimelineActivityType(t *testing.T) {
	t.Parallel()

	t.Run("restores a standard type", func(t *testing.T) {
		h := newHarness(t)
		h.data(t, "UpdateTimelineActivityTypeIsActive", setActiveMutation, map[string]any{"input": map[string]any{"id": recordCreatedTypeID, "isActive": false}})
		reset := h.data(t, "ResetTimelineActivityType", resetMutation, map[string]any{"id": recordCreatedTypeID})["resetTimelineActivityType"].(map[string]any)

		want := map[string]any{"id": recordCreatedTypeID, "label": "was created by", "icon": "IconCirclePlus", "isActive": true}
		if diff := cmp.Diff(want, reset); diff != "" {
			t.Errorf("reset (-want +got):\n%s", diff)
		}
		if stored := h.overrides(t, recordCreatedTypeID); stored != nil {
			t.Errorf("overrides = %s, want NULL", *stored)
		}
	})

	t.Run("keeps other authors' overrides", func(t *testing.T) {
		h := newHarness(t)
		if _, err := h.pool.Exec(t.Context(), `UPDATE core."timelineActivityType" SET overrides = jsonb_build_object($2::text, jsonb_build_object('isActive', false), $3::text, jsonb_build_object('label', 'edited'))
			WHERE id = $1::uuid`, recordCreatedTypeID, customApplicationID, standardUniversalID); err != nil {
			t.Fatal(err)
		}
		reset := h.data(t, "ResetTimelineActivityType", resetMutation, map[string]any{"id": recordCreatedTypeID})["resetTimelineActivityType"].(map[string]any)
		if reset["label"] != "edited" || reset["isActive"] != true {
			t.Errorf("reset = %v, want label edited and isActive true", reset)
		}
	})

	t.Run("errors", func(t *testing.T) {
		h := newHarness(t)
		customTypeID := h.insertCustomType(t)
		tests := []struct {
			name     string
			id       string
			wantCode string
		}{
			{name: "custom type", id: customTypeID, wantCode: "BAD_USER_INPUT"},
			{name: "unknown type", id: missingID, wantCode: "NOT_FOUND"},
		}
		for _, tt := range tests {
			t.Run(tt.name, func(t *testing.T) {
				if got := errorCode(t, h.send(t, "ResetTimelineActivityType", resetMutation, map[string]any{"id": tt.id})); got != tt.wantCode {
					t.Errorf("code = %q, want %q", got, tt.wantCode)
				}
			})
		}
	})
}

func (h harness) insertCustomType(t *testing.T) string {
	t.Helper()
	var id string
	err := h.pool.QueryRow(t.Context(), `INSERT INTO core."timelineActivityType" ("workspaceId", "universalIdentifier", "applicationId", name, label)
		VALUES ($1::uuid, gen_random_uuid(), $2::uuid, 'customEvent', 'did a thing') RETURNING id::text`, workspace.PinnedWorkspaceID, customApplicationID).Scan(&id)
	if err != nil {
		t.Fatalf("insert custom type: %v", err)
	}
	return id
}
