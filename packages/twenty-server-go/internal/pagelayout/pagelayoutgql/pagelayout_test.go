package pagelayoutgql_test

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"log/slog"
	"net/http"
	"net/http/httptest"
	"strconv"
	"testing"

	"github.com/google/go-cmp/cmp"
	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/twentyhq/twenty/packages/twenty-server-go/internal/auth"
	"github.com/twentyhq/twenty/packages/twenty-server-go/internal/golden"
	"github.com/twentyhq/twenty/packages/twenty-server-go/internal/pagelayout/pagelayoutgql"
	"github.com/twentyhq/twenty/packages/twenty-server-go/internal/pagelayout/store"
	"github.com/twentyhq/twenty/packages/twenty-server-go/internal/pgtest"
)

const (
	workspaceID = "26a06a83-ad30-4547-9126-7f6339d43e03"
	standardApp = "49b628b1-2acf-487e-b40a-4c9f5e53a125"
	customApp   = "ad2ef204-2bbe-4670-b093-6c8ad3c40ca7"
	standardUID = "20202020-64aa-4b6f-b003-9c74b97cee20"

	layoutRecordPage = "a1000000-0000-4000-8000-000000000001"
	layoutRecordForm = "a1000000-0000-4000-8000-000000000002"
	layoutStandalone = "a1000000-0000-4000-8000-000000000003"
	layoutDeleted    = "a1000000-0000-4000-8000-000000000004"
	layoutDashboard  = "a1000000-0000-4000-8000-000000000005"

	tabTimeline = "b1000000-0000-4000-8000-000000000001"
	tabHome     = "b1000000-0000-4000-8000-000000000002"
	tabForm     = "b1000000-0000-4000-8000-000000000003"
	tabDeleted  = "b1000000-0000-4000-8000-000000000004"
	tabCharts   = "b1000000-0000-4000-8000-000000000005"

	widgetFields     = "c1000000-0000-4000-8000-000000000001"
	widgetTimeline   = "c1000000-0000-4000-8000-000000000002"
	widgetMoved      = "c1000000-0000-4000-8000-000000000003"
	widgetPie        = "c1000000-0000-4000-8000-000000000004"
	widgetRichText   = "c1000000-0000-4000-8000-000000000005"
	widgetFormField  = "c1000000-0000-4000-8000-000000000006"
	widgetDeleted    = "c1000000-0000-4000-8000-000000000007"
	widgetCustom     = "c1000000-0000-4000-8000-000000000008"
	widgetRatio      = "c1000000-0000-4000-8000-000000000009"
	widgetBar        = "c1000000-0000-4000-8000-00000000000a"
	widgetViewTable  = "c1000000-0000-4000-8000-00000000000b"
	dashboardID      = "d1000000-0000-4000-8000-000000000001"
	adminUserWSID    = "e1000000-0000-4000-8000-000000000001"
	flaggedUserWSID  = "e1000000-0000-4000-8000-000000000002"
	memberUserWSID   = "e1000000-0000-4000-8000-000000000003"
	adminRoleID      = "f1000000-0000-4000-8000-000000000001"
	flaggedRoleID    = "f1000000-0000-4000-8000-000000000002"
	memberRoleID     = "f1000000-0000-4000-8000-000000000003"
	missingID        = "00000000-0000-4000-8000-000000000000"
	updatedAtBefore  = "2026-01-01T00:00:00.000Z"
	viewID           = "11000000-0000-4000-8000-000000000001"
	objectMetadataID = "22000000-0000-4000-8000-000000000001"
)

type harness struct {
	pool *pgxpool.Pool
}

func widgetRow(id, tabID, title, widgetType, configuration, gridPosition, position, overrides, application string, extra ...string) string {
	nullable := func(value string) string {
		if value == "" {
			return "NULL"
		}
		return "'" + value + "'"
	}
	deletedAt, conditionalDisplay, systemSideEffect := "NULL", "NULL", "false"
	if len(extra) > 0 && extra[0] != "" {
		deletedAt = "'2026-02-01'"
	}
	if len(extra) > 1 && extra[1] != "" {
		conditionalDisplay = "'" + extra[1] + "'"
	}
	if len(extra) > 2 && extra[2] != "" {
		systemSideEffect = extra[2]
	}
	return `INSERT INTO core."pageLayoutWidget" (id, "pageLayoutTabId", "workspaceId", title, type, "gridPosition", configuration, "position", overrides,
		"conditionalDisplay", "deletedAt", "isSystemSideEffect", "universalIdentifier", "applicationId", "createdAt", "updatedAt")
		VALUES ('` + id + `', '` + tabID + `', '` + workspaceID + `', '` + title + `', '` + widgetType + `', '` + gridPosition + `', '` + configuration + `',
		` + nullable(position) + `, ` + nullable(overrides) + `, ` + conditionalDisplay + `, ` + deletedAt + `, ` + systemSideEffect + `,
		'` + id + `', '` + application + `', '2026-01-01T00:00:` + createdSecond(id) + `Z', '2026-01-01')`
}

func createdSecond(id string) string {
	second, err := strconv.ParseInt(id[len(id)-1:], 16, 0)
	if err != nil {
		panic(err)
	}
	return fmt.Sprintf("%02d", second)
}

func newHarness(t *testing.T) *harness {
	t.Helper()
	pool, err := pgxpool.New(t.Context(), pgtest.New(t))
	if err != nil {
		t.Fatalf("connect: %v", err)
	}
	t.Cleanup(pool.Close)
	grid := `{"row": 0, "column": 0, "rowSpan": 2, "columnSpan": 6}`
	statements := []string{
		`SET LOCAL session_replication_role = replica`,
		`DELETE FROM core."pageLayoutWidget"`,
		`DELETE FROM core."pageLayoutTab"`,
		`DELETE FROM core."pageLayout"`,
		`UPDATE ` + "workspace_2abogkkt2zd45pa9aun09djpf" + `.dashboard SET "pageLayoutId" = '` + layoutDashboard + `', "updatedAt" = '` + updatedAtBefore + `'`,
		pageLayoutRow(layoutRecordPage, "Company page", "RECORD_PAGE", objectMetadataID, "2026-01-01", tabHome, false),
		pageLayoutRow(layoutRecordForm, "Creation form", "RECORD_FORM", objectMetadataID, "2026-01-02", "", false),
		pageLayoutRow(layoutStandalone, "Settings home", "STANDALONE_PAGE", "", "2026-01-03", "", false),
		pageLayoutRow(layoutDeleted, "Removed", "RECORD_PAGE", "", "2026-01-04", "", true),
		pageLayoutRow(layoutDashboard, "Sales dashboard", "DASHBOARD", "", "2026-01-05", "", false),
		tabRow(tabTimeline, layoutRecordPage, "Timeline", 5, "GRID", "", `{"`+customApp+`": {"title": "Activity", "icon": "IconActivity"}}`, false),
		tabRow(tabHome, layoutRecordPage, "Home", 10, "VERTICAL_LIST", "IconHome", "", false),
		tabRow(tabDeleted, layoutRecordPage, "Gone", 1, "GRID", "", "", true),
		tabRow(tabForm, layoutRecordForm, "Fields", 0, "VERTICAL_LIST", "", "", false),
		tabRow(tabCharts, layoutDashboard, "Charts", 0, "GRID", "", "", false),
		widgetRow(widgetFields, tabHome, "Fields", "FIELDS",
			`{"configurationType": "FIELDS", "viewId": "`+viewID+`", "newFieldDefaultVisibility": true, "shouldAllowUserToSeeHiddenFields": false}`,
			grid, `{"layoutMode": "VERTICAL_LIST", "index": 0, "heightBehavior": "FIT_CONTENT"}`, `{"`+customApp+`": {"isActive": false}}`, standardApp,
			"", `{"and": [{"fieldName": "name"}]}`),
		widgetRow(widgetTimeline, tabHome, "Timeline", "TIMELINE", `{"configurationType": "TIMELINE"}`,
			grid, `{"layoutMode": "VERTICAL_LIST", "index": 1}`, "", standardApp),
		widgetRow(widgetMoved, tabTimeline, "Notes", "NOTES", `{"configurationType": "NOTES"}`,
			grid, `{"layoutMode": "CANVAS"}`, `{"`+customApp+`": {"pageLayoutTabId": "`+tabHome+`", "title": "My notes"}}`, standardApp),
		widgetRow(widgetDeleted, tabHome, "Deleted", "TASKS", `{"configurationType": "TASKS"}`, grid, "", "", standardApp, "x"),
		widgetRow(widgetCustom, tabHome, "Custom iframe", "IFRAME", `{"configurationType": "IFRAME", "url": "https://example.com/embed"}`,
			grid, `{"layoutMode": "GRID", "row": 3, "column": 0, "rowSpan": 4, "columnSpan": 12}`, "", customApp),
		widgetRow(widgetFormField, tabForm, "Name", "FORM_FIELD", `{"configurationType": "FORM_FIELD", "fieldMetadataId": "33000000-0000-4000-8000-000000000001"}`,
			grid, "", "", standardApp),
		widgetRow(widgetPie, tabCharts, "Deals by company", "GRAPH",
			`{"color": "orange", "orderBy": "FIELD_ASC", "timezone": "UTC", "displayLegend": true, "displayDataLabel": false, "showCenterMetric": true, "configurationType": "PIE_CHART", "firstDayOfTheWeek": 0, "aggregateOperation": "COUNT", "groupBySubFieldName": "name", "groupByFieldMetadataId": "44000000-0000-4000-8000-000000000001", "aggregateFieldMetadataId": "44000000-0000-4000-8000-000000000002"}`,
			grid, `{"layoutMode": "GRID", "row": 0, "column": 0, "rowSpan": 2, "columnSpan": 6}`, "", standardApp),
		widgetRow(widgetRichText, tabCharts, "Welcome", "STANDALONE_RICH_TEXT",
			`{"configurationType": "STANDALONE_RICH_TEXT", "body": {"markdown": null, "blocknote": "[{\"type\":\"paragraph\"}]"}}`,
			grid, `{"layoutMode": "GRID", "row": 0, "column": 6, "rowSpan": 2, "columnSpan": 6}`, "", standardApp),
		widgetRow(widgetRatio, tabCharts, "Win rate", "GRAPH",
			`{"configurationType": "AGGREGATE_CHART", "aggregateFieldMetadataId": "44000000-0000-4000-8000-000000000002", "aggregateOperation": "PERCENTAGE_NOT_EMPTY", "ratioAggregateConfig": {"fieldMetadataId": "44000000-0000-4000-8000-000000000003", "optionValue": "WON"}, "filter": {"recordFilters": []}}`,
			grid, `{"layoutMode": "GRID", "row": 2, "column": 0, "rowSpan": 2, "columnSpan": 6}`, "", standardApp),
		widgetRow(widgetBar, tabCharts, "Revenue", "GRAPH",
			`{"configurationType": "BAR_CHART", "aggregateFieldMetadataId": "44000000-0000-4000-8000-000000000002", "aggregateOperation": "SUM", "primaryAxisGroupByFieldMetadataId": "44000000-0000-4000-8000-000000000001", "layout": "VERTICAL", "rangeMin": 0.5, "primaryAxisManualSortOrder": ["a", "b"]}`,
			grid, `{"layoutMode": "GRID", "row": 2, "column": 6, "rowSpan": 2, "columnSpan": 6}`, "", standardApp),
		widgetRow(widgetViewTable, tabCharts, "Open deals", "RECORD_TABLE", `{"configurationType": "RECORD_TABLE", "viewId": "`+viewID+`", "recordLimit": 10}`,
			grid, `{"layoutMode": "GRID", "row": 4, "column": 0, "rowSpan": 2, "columnSpan": 12}`, "", standardApp),
		roleRow(adminRoleID, "Test admin", true), roleRow(flaggedRoleID, "Test layouts editor", false), roleRow(memberRoleID, "Test member", false),
		`INSERT INTO core."rolePermissionFlag" ("roleId", "workspaceId", "universalIdentifier", "applicationId", "permissionFlagId")
			SELECT '` + flaggedRoleID + `', '` + workspaceID + `', gen_random_uuid(), '` + standardApp + `', id FROM core."permissionFlag" WHERE key = 'LAYOUTS'`,
		roleTarget(adminRoleID, adminUserWSID), roleTarget(flaggedRoleID, flaggedUserWSID), roleTarget(memberRoleID, memberUserWSID),
	}
	tx, err := pool.Begin(t.Context())
	if err != nil {
		t.Fatalf("begin: %v", err)
	}
	t.Cleanup(func() { _ = tx.Rollback(context.Background()) })
	for _, statement := range statements {
		if _, err := tx.Exec(t.Context(), statement); err != nil {
			t.Fatalf("seed %q: %v", statement, err)
		}
	}
	if err := tx.Commit(t.Context()); err != nil {
		t.Fatalf("commit: %v", err)
	}
	return &harness{pool: pool}
}

func pageLayoutRow(id, name, layoutType, objectMetadata, createdAt, defaultTab string, deleted bool) string {
	nullable := func(value string) string {
		if value == "" {
			return "NULL"
		}
		return "'" + value + "'"
	}
	deletedAt := "NULL"
	if deleted {
		deletedAt = "'2026-02-01'"
	}
	return `INSERT INTO core."pageLayout" (id, name, "workspaceId", type, "objectMetadataId", "defaultTabToFocusOnMobileAndSidePanelId", "deletedAt",
		"universalIdentifier", "applicationId", "createdAt", "updatedAt", "isSystemSideEffect")
		VALUES ('` + id + `', '` + name + `', '` + workspaceID + `', '` + layoutType + `', ` + nullable(objectMetadata) + `, ` + nullable(defaultTab) + `, ` + deletedAt + `,
		'` + id + `', '` + standardApp + `', '` + createdAt + `', '` + createdAt + `', false)`
}

func tabRow(id, layoutID, title string, position int, layoutMode, icon, overrides string, deleted bool) string {
	nullable := func(value string) string {
		if value == "" {
			return "NULL"
		}
		return "'" + value + "'"
	}
	deletedAt := "NULL"
	if deleted {
		deletedAt = "'2026-02-01'"
	}
	return `INSERT INTO core."pageLayoutTab" (id, title, "workspaceId", "position", "pageLayoutId", "deletedAt", "universalIdentifier", "applicationId",
		icon, "layoutMode", overrides, "createdAt", "updatedAt")
		VALUES ('` + id + `', '` + title + `', '` + workspaceID + `', ` + strconv.Itoa(position) + `, '` + layoutID + `', ` + deletedAt + `,
		'` + id + `', '` + standardApp + `', ` + nullable(icon) + `, '` + layoutMode + `', ` + nullable(overrides) + `, '2026-01-01', '2026-01-02')`
}

func roleRow(id, label string, canUpdateAllSettings bool) string {
	flag := "false"
	if canUpdateAllSettings {
		flag = "true"
	}
	return `INSERT INTO core.role (id, label, "canUpdateAllSettings", "workspaceId", "universalIdentifier", "applicationId")
		VALUES ('` + id + `', '` + label + `', ` + flag + `, '` + workspaceID + `', gen_random_uuid(), '` + standardApp + `')`
}

func roleTarget(roleID, userWorkspaceID string) string {
	return `INSERT INTO core."roleTarget" ("workspaceId", "roleId", "userWorkspaceId", "universalIdentifier", "applicationId")
		VALUES ('` + workspaceID + `', '` + roleID + `', '` + userWorkspaceID + `', gen_random_uuid(), '` + standardApp + `')`
}

func (h *harness) handler(userWorkspaceID string) http.Handler {
	graphql := pagelayoutgql.NewHandler(&pagelayoutgql.Resolver{Store: store.New(h.pool)}, slog.New(slog.NewTextHandler(io.Discard, nil)))
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		principal := auth.Principal{UserID: "u", WorkspaceID: workspaceID, UserWorkspaceID: userWorkspaceID}
		graphql.ServeHTTP(w, r.WithContext(auth.WithPrincipal(r.Context(), principal)))
	})
}

func (h *harness) send(t *testing.T, handler http.Handler, query string, variables map[string]any) map[string]any {
	t.Helper()
	body, err := json.Marshal(map[string]any{"query": query, "variables": variables})
	if err != nil {
		t.Fatal(err)
	}
	request := httptest.NewRequestWithContext(t.Context(), http.MethodPost, "/metadata", bytes.NewReader(body))
	request.Header.Set("Content-Type", "application/json")
	recorder := httptest.NewRecorder()
	handler.ServeHTTP(recorder, request)
	var decoded map[string]any
	if err := json.Unmarshal(recorder.Body.Bytes(), &decoded); err != nil {
		t.Fatalf("decode %s: %v", recorder.Body.String(), err)
	}
	return decoded
}

func (h *harness) widgetState(t *testing.T, id string) (isActive bool, overrides map[string]any) {
	t.Helper()
	var raw []byte
	if err := h.pool.QueryRow(t.Context(), `SELECT "isActive", overrides FROM core."pageLayoutWidget" WHERE id = $1`, id).Scan(&isActive, &raw); err != nil {
		t.Fatalf("read widget %s: %v", id, err)
	}
	if raw != nil {
		if err := json.Unmarshal(raw, &overrides); err != nil {
			t.Fatalf("decode overrides: %v", err)
		}
	}
	return isActive, overrides
}

func errorCode(decoded map[string]any) any {
	errs, ok := decoded["errors"].([]any)
	if !ok {
		return nil
	}
	return errs[0].(map[string]any)["extensions"].(map[string]any)["code"]
}

func TestOperations_MatchNodeGolden(t *testing.T) {
	t.Parallel()
	for _, name := range []string{
		"FindAllRecordFormPageLayouts", "FindAllRecordPageLayouts", "FindAllStandalonePageLayouts",
		"FindOnePageLayout", "FindOnePageLayoutType", "UpdatePageLayoutWidgetIsActive",
	} {
		t.Run(name, func(t *testing.T) {
			t.Parallel()
			h := newHarness(t)
			golden.Assert(t, h.handler(adminUserWSID), "testdata", name)
		})
	}
}

func TestFindOnePageLayout(t *testing.T) {
	t.Parallel()
	h := newHarness(t)
	const query = `query($id: String!) { getPageLayout(id: $id) { id name type tabs { id widgets { id } } } }`
	t.Run("lists tabs by position and widgets under their effective tab", func(t *testing.T) {
		got := h.send(t, h.handler(memberUserWSID), query, map[string]any{"id": layoutRecordPage})
		want := map[string]any{"data": map[string]any{"getPageLayout": map[string]any{
			"id": layoutRecordPage, "name": "Company page", "type": "RECORD_PAGE",
			"tabs": []any{
				map[string]any{"id": tabTimeline, "widgets": []any{}},
				map[string]any{"id": tabHome, "widgets": []any{
					map[string]any{"id": widgetFields}, map[string]any{"id": widgetTimeline},
					map[string]any{"id": widgetMoved}, map[string]any{"id": widgetCustom},
				}},
			},
		}}}
		if diff := cmp.Diff(want, got); diff != "" {
			t.Errorf("response (-want +got):\n%s", diff)
		}
	})
	for _, id := range []string{layoutDeleted, missingID, "not-a-uuid"} {
		t.Run("rejects "+id, func(t *testing.T) {
			got := h.send(t, h.handler(memberUserWSID), query, map[string]any{"id": id})
			if code := errorCode(got); code != "NOT_FOUND" {
				t.Errorf("error code = %v, want NOT_FOUND", code)
			}
		})
	}
}

func TestGetPageLayouts_FiltersByObject(t *testing.T) {
	t.Parallel()
	h := newHarness(t)
	got := h.send(t, h.handler(memberUserWSID), `query($object: String) { getPageLayouts(objectMetadataId: $object) { id } }`,
		map[string]any{"object": objectMetadataID})
	want := map[string]any{"data": map[string]any{"getPageLayouts": []any{
		map[string]any{"id": layoutRecordPage}, map[string]any{"id": layoutRecordForm},
	}}}
	if diff := cmp.Diff(want, got); diff != "" {
		t.Errorf("response (-want +got):\n%s", diff)
	}
}

func TestUpdatePageLayoutWidget_IsActive(t *testing.T) {
	t.Parallel()
	const mutation = `mutation($id: String!, $isActive: Boolean!) { updatePageLayoutWidget(id: $id, input: {isActive: $isActive}) { id isActive } }`
	tests := []struct {
		name          string
		id            string
		isActive      bool
		wantColumn    bool
		wantOverrides map[string]any
	}{
		{"hides a standard widget through an override", widgetTimeline, false, true,
			map[string]any{customApp: map[string]any{"isActive": false}}},
		{"drops the override once it matches the standard value", widgetFields, true, true, nil},
		{"keeps a standard widget's other overrides", widgetMoved, false, true,
			map[string]any{customApp: map[string]any{"isActive": false, "pageLayoutTabId": tabHome, "title": "My notes"}}},
		{"edits a custom widget's own column", widgetCustom, false, false, nil},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()
			h := newHarness(t)
			got := h.send(t, h.handler(flaggedUserWSID), mutation, map[string]any{"id": tt.id, "isActive": tt.isActive})
			want := map[string]any{"data": map[string]any{"updatePageLayoutWidget": map[string]any{"id": tt.id, "isActive": tt.isActive}}}
			if diff := cmp.Diff(want, got); diff != "" {
				t.Errorf("response (-want +got):\n%s", diff)
			}
			column, overrides := h.widgetState(t, tt.id)
			if column != tt.wantColumn {
				t.Errorf("isActive column = %v, want %v", column, tt.wantColumn)
			}
			if diff := cmp.Diff(tt.wantOverrides, overrides); diff != "" {
				t.Errorf("overrides (-want +got):\n%s", diff)
			}
		})
	}
}

func TestUpdatePageLayoutWidget_TouchesLinkedDashboards(t *testing.T) {
	t.Parallel()
	h := newHarness(t)
	got := h.send(t, h.handler(adminUserWSID), `mutation($id: String!) { updatePageLayoutWidget(id: $id, input: {isActive: false}) { id } }`,
		map[string]any{"id": widgetPie})
	if got["errors"] != nil {
		t.Fatalf("errors = %v", got["errors"])
	}
	var touched bool
	if err := h.pool.QueryRow(t.Context(), `SELECT "updatedAt" > $1::timestamptz FROM workspace_2abogkkt2zd45pa9aun09djpf.dashboard`, updatedAtBefore).Scan(&touched); err != nil {
		t.Fatalf("read dashboard: %v", err)
	}
	if !touched {
		t.Error("dashboard updatedAt was not advanced")
	}
}

func TestUpdatePageLayoutWidget_Rejects(t *testing.T) {
	t.Parallel()
	tests := []struct {
		name, query, caller, wantCode string
	}{
		{"caller without the layouts permission", `mutation { updatePageLayoutWidget(id: "` + widgetFields + `", input: {isActive: true}) { id } }`, memberUserWSID, "FORBIDDEN"},
		{"unknown widget", `mutation { updatePageLayoutWidget(id: "` + missingID + `", input: {isActive: true}) { id } }`, adminUserWSID, "NOT_FOUND"},
		{"deleted widget", `mutation { updatePageLayoutWidget(id: "` + widgetDeleted + `", input: {isActive: true}) { id } }`, adminUserWSID, "NOT_FOUND"},
		{"widget id that is not a uuid", `mutation { updatePageLayoutWidget(id: "nope", input: {isActive: true}) { id } }`, adminUserWSID, "NOT_FOUND"},
		{"edit beyond isActive", `mutation { updatePageLayoutWidget(id: "` + widgetFields + `", input: {isActive: true, title: "x"}) { id } }`, adminUserWSID, "BAD_USER_INPUT"},
		{"edit without isActive", `mutation { updatePageLayoutWidget(id: "` + widgetFields + `", input: {title: "x"}) { id } }`, adminUserWSID, "BAD_USER_INPUT"},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()
			h := newHarness(t)
			if code := errorCode(h.send(t, h.handler(tt.caller), tt.query, nil)); code != tt.wantCode {
				t.Errorf("error code = %v, want %s", code, tt.wantCode)
			}
			if _, overrides := h.widgetState(t, widgetFields); overrides == nil {
				t.Error("rejected request changed the widget's overrides")
			}
		})
	}
}

func TestOperations_RequirePrincipal(t *testing.T) {
	t.Parallel()
	h := newHarness(t)
	graphql := pagelayoutgql.NewHandler(&pagelayoutgql.Resolver{Store: store.New(h.pool)}, slog.New(slog.NewTextHandler(io.Discard, nil)))
	if code := errorCode(h.send(t, graphql, `{ getPageLayouts { id } }`, nil)); code != "UNAUTHENTICATED" {
		t.Errorf("error code = %v, want UNAUTHENTICATED", code)
	}
}
