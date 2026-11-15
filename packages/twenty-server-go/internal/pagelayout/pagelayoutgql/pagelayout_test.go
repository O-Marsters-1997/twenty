package pagelayoutgql_test

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
	"github.com/twentyhq/twenty/packages/twenty-server-go/internal/auth"
	"github.com/twentyhq/twenty/packages/twenty-server-go/internal/golden"
	"github.com/twentyhq/twenty/packages/twenty-server-go/internal/pagelayout/pagelayoutgql"
	"github.com/twentyhq/twenty/packages/twenty-server-go/internal/pagelayout/store"
	"github.com/twentyhq/twenty/packages/twenty-server-go/internal/pgtest"
	"github.com/twentyhq/twenty/packages/twenty-server-go/internal/workspace"
)

const (
	adminUserID          = "0b7a6c1e-3f55-4a47-8d6e-6c1f1b7f2a01"
	adminUserWorkspaceID = "0b7a6c1e-3f55-4a47-8d6e-6c1f1b7f2a02"
	memberUserID         = "0b7a6c1e-3f55-4a47-8d6e-6c1f1b7f2a03"
	memberWorkspaceID    = "0b7a6c1e-3f55-4a47-8d6e-6c1f1b7f2a04"
	standardApplication  = "6b1f0000-0000-4000-8000-0000000000a1"
	standardUID          = "6b1f0000-0000-4000-8000-0000000000a2"
	formWidgetID         = "6b1f0000-0000-4000-8000-000000000021"
	chartWidgetID        = "6b1f0000-0000-4000-8000-000000000022"
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
	graphql := pagelayoutgql.NewHandler(&pagelayoutgql.Resolver{
		PageLayouts: store.NewPageLayouts(pool),
		Permissions: accessstore.NewPermissions(pool),
	}, slog.New(slog.NewTextHandler(io.Discard, nil)))
	h := harness{graphql: graphql, pool: pool}
	h.seedSession(t, adminUserID, adminUserWorkspaceID, true)
	h.seedSession(t, memberUserID, memberWorkspaceID, false)
	h.seedLayouts(t)
	return h.as(auth.Principal{UserID: adminUserID, UserWorkspaceID: adminUserWorkspaceID})
}

func (h harness) exec(t *testing.T, statement string, args ...any) {
	t.Helper()
	if _, err := h.pool.Exec(t.Context(), statement, args...); err != nil {
		t.Fatalf("exec %.60s: %v", statement, err)
	}
}

func (h harness) seedSession(t *testing.T, userID, userWorkspaceID string, canUpdateAllSettings bool) {
	t.Helper()
	h.exec(t, `INSERT INTO core."user" (id, email) VALUES ($1::uuid, $1 || '@example.com')`, userID)
	h.exec(t, `INSERT INTO core."userWorkspace" (id, "userId", "workspaceId") VALUES ($1::uuid, $2::uuid, $3::uuid)`, userWorkspaceID, userID, workspace.PinnedWorkspaceID)
	var roleID string
	err := h.pool.QueryRow(t.Context(), `INSERT INTO core.role (label, "workspaceId", "canUpdateAllSettings", "universalIdentifier", "applicationId")
		VALUES ($1, $2::uuid, $3, gen_random_uuid(), (SELECT "workspaceCustomApplicationId" FROM core.workspace WHERE id = $2::uuid)) RETURNING id::text`,
		userID, workspace.PinnedWorkspaceID, canUpdateAllSettings).Scan(&roleID)
	if err != nil {
		t.Fatalf("seed role: %v", err)
	}
	h.exec(t, `INSERT INTO core."roleTarget" ("roleId", "userWorkspaceId", "universalIdentifier", "workspaceId", "applicationId")
		VALUES ($1::uuid, $2::uuid, gen_random_uuid(), $3::uuid, (SELECT "workspaceCustomApplicationId" FROM core.workspace WHERE id = $3::uuid))`,
		roleID, userWorkspaceID, workspace.PinnedWorkspaceID)
}

func (h harness) seedLayouts(t *testing.T) {
	t.Helper()
	var customUID string
	err := h.pool.QueryRow(t.Context(), `SELECT a."universalIdentifier"::text FROM core.workspace w JOIN core.application a ON a.id = w."workspaceCustomApplicationId" WHERE w.id = $1::uuid`,
		workspace.PinnedWorkspaceID).Scan(&customUID)
	if err != nil {
		t.Fatalf("read custom application: %v", err)
	}
	h.exec(t, `UPDATE core."pageLayout" SET "deletedAt" = now()`)
	h.exec(t, `INSERT INTO core.application (id, "universalIdentifier", name, "workspaceId") VALUES ($1::uuid, $2::uuid, 'Twenty standard', $3::uuid)`,
		standardApplication, standardUID, workspace.PinnedWorkspaceID)

	const custom = `(SELECT "workspaceCustomApplicationId" FROM core.workspace WHERE id = $1::uuid)`
	layout := func(id, name, layoutType, applicationID, createdAt string) {
		h.exec(t, `INSERT INTO core."pageLayout" (id, name, type, "workspaceId", "universalIdentifier", "applicationId", "createdAt", "updatedAt")
			VALUES ($2::uuid, $3, $4::core."pageLayout_type_enum", $1::uuid, $2::uuid, `+applicationID+`, $5::timestamptz, $5::timestamptz)`,
			workspace.PinnedWorkspaceID, id, name, layoutType, createdAt)
	}
	tab := func(id, title string, icon *string, position float64, mode, layoutID, applicationID string) {
		h.exec(t, `INSERT INTO core."pageLayoutTab" (id, title, icon, position, "layoutMode", "pageLayoutId", "workspaceId", "universalIdentifier", "applicationId")
			VALUES ($2::uuid, $3, $4, $5, $6::core."pageLayoutTab_layoutmode_enum", $7::uuid, $1::uuid, $2::uuid, `+applicationID+`)`,
			workspace.PinnedWorkspaceID, id, title, icon, position, mode, layoutID)
	}
	widget := func(id, tabID, title, widgetType, position, configuration, overrides, applicationID string, isSystemSideEffect bool, createdAt string) {
		h.exec(t, `INSERT INTO core."pageLayoutWidget" (id, "pageLayoutTabId", title, type, position, "gridPosition", configuration, overrides, "isSystemSideEffect", "workspaceId", "universalIdentifier", "applicationId", "createdAt")
			VALUES ($2::uuid, $3::uuid, $4, $5::core."pageLayoutWidget_type_enum", NULLIF($6, '')::jsonb, '{"row":0,"column":0,"rowSpan":1,"columnSpan":12}', $7::jsonb, NULLIF($8, '')::jsonb, $9, $1::uuid, $2::uuid, `+applicationID+`, $10::timestamptz)`,
			workspace.PinnedWorkspaceID, id, tabID, title, widgetType, position, configuration, overrides, isSystemSideEffect, createdAt)
	}
	standard := `'` + standardApplication + `'::uuid`
	home := "IconHome"

	layout("6b1f0000-0000-4000-8000-000000000001", "Person form", "RECORD_FORM", standard, "2026-01-01T00:00:00Z")
	layout("6b1f0000-0000-4000-8000-000000000002", "Company page", "RECORD_PAGE", custom, "2026-01-02T00:00:00Z")
	layout("6b1f0000-0000-4000-8000-000000000003", "Reports", "STANDALONE_PAGE", custom, "2026-01-03T00:00:00Z")
	tab("6b1f0000-0000-4000-8000-000000000011", "Form", nil, 0, "VERTICAL_LIST", "6b1f0000-0000-4000-8000-000000000001", standard)
	tab("6b1f0000-0000-4000-8000-000000000012", "Home", &home, 1, "GRID", "6b1f0000-0000-4000-8000-000000000002", custom)
	tab("6b1f0000-0000-4000-8000-000000000013", "Notes", nil, 0, "GRID", "6b1f0000-0000-4000-8000-000000000002", custom)
	hidden := `{"` + customUID + `":{"isActive":false,"title":"Given name"}}`
	widget(formWidgetID, "6b1f0000-0000-4000-8000-000000000011", "First name", "FORM_FIELD",
		`{"layoutMode":"VERTICAL_LIST","index":0}`, `{"configurationType":"FORM_FIELD","fieldMetadataId":"6b1f0000-0000-4000-8000-0000000000f1"}`,
		hidden, standard, true, "2026-01-01T00:00:00Z")
	widget(chartWidgetID, "6b1f0000-0000-4000-8000-000000000012", "Deals by stage", "GRAPH",
		`{"layoutMode":"GRID","row":0,"column":0,"rowSpan":4,"columnSpan":6}`,
		`{"configurationType":"BAR_CHART","aggregateOperation":"COUNT","primaryAxisOrderBy":"FIELD_ASC","primaryAxisManualSortOrder":["a","b"],"displayLegend":true,"rangeMin":1.5,"layout":"VERTICAL","filter":{"recordFilters":[]}}`,
		"", custom, false, "2026-01-02T00:00:00Z")
	widget("6b1f0000-0000-4000-8000-000000000023", "6b1f0000-0000-4000-8000-000000000012", "Docs", "IFRAME",
		`{"layoutMode":"CANVAS"}`, `{"configurationType":"IFRAME","url":"https://example.com"}`, "", custom, false, "2026-01-02T00:00:01Z")
	widget("6b1f0000-0000-4000-8000-000000000024", "6b1f0000-0000-4000-8000-000000000013", "Intro", "STANDALONE_RICH_TEXT",
		"", `{"configurationType":"STANDALONE_RICH_TEXT","body":{"blocknote":null,"markdown":"hi"}}`, "", custom, false, "2026-01-02T00:00:02Z")
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

func errorCode(t *testing.T, decoded map[string]any) string {
	t.Helper()
	errs, ok := decoded["errors"].([]any)
	if !ok || len(errs) == 0 {
		t.Fatalf("response = %v, want an error", decoded)
	}
	return errs[0].(map[string]any)["extensions"].(map[string]any)["code"].(string)
}

func layoutVolatile(prefix string) []string {
	var paths []string
	for _, path := range []string{"createdAt", "updatedAt", "applicationId", "tabs.*.createdAt", "tabs.*.updatedAt", "tabs.*.applicationId",
		"tabs.*.widgets.*.createdAt", "tabs.*.widgets.*.updatedAt", "tabs.*.widgets.*.applicationId"} {
		paths = append(paths, prefix+"."+path)
	}
	return paths
}

func TestPageLayoutReads_matchNodeGolden(t *testing.T) {
	t.Parallel()
	h := newHarness(t)
	tests := []struct {
		operation string
		ignore    []string
	}{
		{"FindAllRecordFormPageLayouts", layoutVolatile("data.getPageLayouts.*")},
		{"FindAllRecordPageLayouts", layoutVolatile("data.getPageLayouts.*")},
		{"FindAllStandalonePageLayouts", nil},
		{"FindOnePageLayout", layoutVolatile("data.getPageLayout")},
		{"FindOnePageLayoutType", nil},
	}
	for _, tt := range tests {
		t.Run(tt.operation, func(t *testing.T) {
			t.Parallel()
			golden.Assert(t, h.handler, "testdata", tt.operation, tt.ignore...)
		})
	}
}

func TestUpdatePageLayoutWidgetIsActive_matchesNodeGolden(t *testing.T) {
	t.Parallel()
	h := newHarness(t)
	golden.Assert(t, h.handler, "testdata", "UpdatePageLayoutWidgetIsActive")

	var isActive bool
	if err := h.pool.QueryRow(t.Context(), `SELECT "isActive" FROM core."pageLayoutWidget" WHERE id = $1::uuid`, chartWidgetID).Scan(&isActive); err != nil {
		t.Fatal(err)
	}
	if isActive {
		t.Error("workspace-owned widget column isActive = true, want false")
	}
}

func TestGetPageLayouts_filtersAndErrors(t *testing.T) {
	t.Parallel()
	h := newHarness(t)

	listed := h.send(t, "Layouts", `query Layouts { getPageLayouts { id } }`, nil)["data"].(map[string]any)["getPageLayouts"].([]any)
	var ids []string
	for _, layout := range listed {
		ids = append(ids, layout.(map[string]any)["id"].(string))
	}
	want := []string{"6b1f0000-0000-4000-8000-000000000001", "6b1f0000-0000-4000-8000-000000000002", "6b1f0000-0000-4000-8000-000000000003"}
	if diff := cmp.Diff(want, ids); diff != "" {
		t.Errorf("getPageLayouts ids (-want +got):\n%s", diff)
	}

	if got := errorCode(t, h.send(t, "One", `query One($id: String!) { getPageLayout(id: $id) { id } }`, map[string]any{"id": missingID})); got != "NOT_FOUND" {
		t.Errorf("unknown layout error code = %q, want NOT_FOUND", got)
	}
}

func TestUpdatePageLayoutWidgetIsActive_overridesEngineOwnedWidgets(t *testing.T) {
	t.Parallel()
	h := newHarness(t)
	const query = `mutation Toggle($id: String!, $isActive: Boolean!) { updatePageLayoutWidget(id: $id, input: { isActive: $isActive }) { id isActive title } }`
	var customUID string
	err := h.pool.QueryRow(t.Context(), `SELECT a."universalIdentifier"::text FROM core.workspace w JOIN core.application a ON a.id = w."workspaceCustomApplicationId" WHERE w.id = $1::uuid`,
		workspace.PinnedWorkspaceID).Scan(&customUID)
	if err != nil {
		t.Fatal(err)
	}
	overrides := func() map[string]any {
		var raw []byte
		var column bool
		err := h.pool.QueryRow(t.Context(), `SELECT overrides, "isActive" FROM core."pageLayoutWidget" WHERE id = $1::uuid`, formWidgetID).Scan(&raw, &column)
		if err != nil {
			t.Fatal(err)
		}
		if !column {
			t.Error("engine-owned widget column isActive = false, want it untouched")
		}
		var decoded map[string]any
		if err := json.Unmarshal(raw, &decoded); err != nil {
			t.Fatal(err)
		}
		return decoded
	}

	shown := h.send(t, "Toggle", query, map[string]any{"id": formWidgetID, "isActive": true})["data"].(map[string]any)["updatePageLayoutWidget"].(map[string]any)
	if shown["isActive"] != true {
		t.Errorf("showing the widget returned %v, want isActive true", shown)
	}
	if diff := cmp.Diff(map[string]any{customUID: map[string]any{"title": "Given name"}}, overrides()); diff != "" {
		t.Errorf("overrides after showing (-want +got):\n%s", diff)
	}

	hidden := h.send(t, "Toggle", query, map[string]any{"id": formWidgetID, "isActive": false})["data"].(map[string]any)["updatePageLayoutWidget"].(map[string]any)
	if hidden["isActive"] != false || hidden["title"] != "Given name" {
		t.Errorf("hiding the widget returned %v, want isActive false and the overridden title", hidden)
	}
	if diff := cmp.Diff(map[string]any{customUID: map[string]any{"title": "Given name", "isActive": false}}, overrides()); diff != "" {
		t.Errorf("overrides after hiding (-want +got):\n%s", diff)
	}
}

func TestUpdatePageLayoutWidgetIsActive_errors(t *testing.T) {
	t.Parallel()
	h := newHarness(t)
	const query = `mutation Toggle($id: String!, $isActive: Boolean!) { updatePageLayoutWidget(id: $id, input: { isActive: $isActive }) { id } }`
	tests := []struct {
		name      string
		principal auth.Principal
		id        string
		wantCode  string
	}{
		{"member without the layouts permission", auth.Principal{UserWorkspaceID: memberWorkspaceID}, chartWidgetID, "FORBIDDEN"},
		{"unknown widget", auth.Principal{UserWorkspaceID: adminUserWorkspaceID}, missingID, "NOT_FOUND"},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()
			got := errorCode(t, h.as(tt.principal).send(t, "Toggle", query, map[string]any{"id": tt.id, "isActive": false}))
			if got != tt.wantCode {
				t.Errorf("error code = %q, want %q", got, tt.wantCode)
			}
		})
	}
}
