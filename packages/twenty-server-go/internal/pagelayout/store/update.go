package store

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"maps"
	"math"
	"reflect"
	"slices"
	"sort"
	"strings"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"

	"github.com/twentyhq/twenty/packages/twenty-server-go/internal/workspace"
)

var ErrInvalidInput = errors.New("invalid page layout input")

type invalidInputError struct{ message string }

func (e invalidInputError) Error() string { return e.message }

func (invalidInputError) Is(target error) bool { return target == ErrInvalidInput }

func invalid(format string, args ...any) error {
	return invalidInputError{message: fmt.Sprintf(format, args...)}
}

const (
	gridMaxColumns = 12
	gridMaxRows    = 100
)

var (
	tabOverridable    = []string{"title", "position", "icon", "isActive"}
	widgetOverridable = []string{"title", "position", "pageLayoutTabId", "conditionalDisplay", "conditionalAvailabilityExpression", "isActive"}
	widgetJSONColumns = map[string]bool{"position": true, "configuration": true, "conditionalDisplay": true}
	uuidColumns       = map[string]bool{"objectMetadataId": true, "pageLayoutTabId": true}
)

type LayoutInput struct {
	Name             string
	Type             string
	ObjectMetadataID *string
	IsFirstTabPinned *bool
	Tabs             []TabInput
}

type TabInput struct {
	ID, Title  string
	Position   float64
	Icon       *string
	LayoutMode *string
	Widgets    []WidgetInput
}

type WidgetInput struct {
	ID, PageLayoutTabID, Title, Type  string
	ObjectMetadataID                  *string
	Position, Configuration           any
	ConditionalAvailabilityExpression *string
	ConditionalDisplay                any
}

type tabRecord struct {
	id, title, layoutMode, owner string
	icon                         *string
	position                     float64
	isActive, isSystemSideEffect bool
	overrides                    overrides
}

type widgetRecord struct {
	id, tabID, title, widgetType, owner string
	objectMetadataID, expression        *string
	position, configuration, display    json.RawMessage
	isActive, isSystemSideEffect        bool
	overrides                           overrides
}

type application struct{ id, universalIdentifier string }

type fieldsWidget struct {
	id, tabID, viewID string
	isActive          bool
}

func (s *Store) UpdateLayout(ctx context.Context, workspaceID, id string, input LayoutInput) (Layout, error) {
	if _, err := uuid.Parse(id); err != nil {
		return Layout{}, notFound("Page layout", id)
	}
	err := pgx.BeginFunc(ctx, s.pool, func(tx pgx.Tx) error {
		var locked string
		err := tx.QueryRow(ctx, `SELECT id::text FROM core."pageLayout" WHERE id = $1::uuid AND "workspaceId" = $2::uuid AND "deletedAt" IS NULL FOR UPDATE`,
			id, workspaceID).Scan(&locked)
		if errors.Is(err, pgx.ErrNoRows) {
			return notFound("Page layout", id)
		}
		if err != nil {
			return fmt.Errorf("lock page layout: %w", err)
		}
		custom, err := customApplication(ctx, tx, workspaceID)
		if err != nil {
			return err
		}
		if _, err := tx.Exec(ctx, `UPDATE core."pageLayout" SET name = $2, type = $3, "objectMetadataId" = $4::uuid,
			"isFirstTabPinned" = COALESCE($5, "isFirstTabPinned"), "updatedAt" = now() WHERE id = $1::uuid`,
			id, input.Name, input.Type, input.ObjectMetadataID, input.IsFirstTabPinned); err != nil {
			return fmt.Errorf("update page layout: %w", err)
		}
		fieldsBefore, err := activeFieldsWidgets(ctx, tx, workspaceID, id)
		if err != nil {
			return err
		}
		removedTabs, err := syncTabs(ctx, tx, workspaceID, id, custom, input.Tabs)
		if err != nil {
			return err
		}
		removedWidgets, err := syncWidgets(ctx, tx, workspaceID, custom, input.Tabs)
		if err != nil {
			return err
		}
		if err := validateWidgets(ctx, tx, workspaceID, input.Tabs); err != nil {
			return err
		}
		if err := destroyOrphanedViews(ctx, tx, workspaceID, id, fieldsBefore, removedTabs, removedWidgets); err != nil {
			return err
		}
		return touchDashboards(ctx, tx, id)
	})
	if err != nil {
		return Layout{}, err
	}
	return s.Layout(ctx, workspaceID, id)
}

func customApplication(ctx context.Context, tx pgx.Tx, workspaceID string) (application, error) {
	var custom application
	err := tx.QueryRow(ctx, `SELECT c.id::text, c."universalIdentifier"::text FROM core.workspace ws
		JOIN core.application c ON c.id = ws."workspaceCustomApplicationId" WHERE ws.id = $1::uuid`, workspaceID).
		Scan(&custom.id, &custom.universalIdentifier)
	if err != nil {
		return custom, fmt.Errorf("load workspace custom application: %w", err)
	}
	return custom, nil
}

func jsonValue(raw json.RawMessage) any {
	var decoded any
	if len(raw) == 0 || json.Unmarshal(raw, &decoded) != nil {
		return nil
	}
	return decoded
}

func normalized(value any) any {
	if value == nil {
		return nil
	}
	encoded, err := json.Marshal(value)
	if err != nil {
		return value
	}
	return jsonValue(encoded)
}

func stringOrNil(value *string) any {
	if value == nil {
		return nil
	}
	return *value
}

func isOverridingCaller(owner string, custom application, isSystemSideEffect bool) bool {
	return owner != custom.universalIdentifier || isSystemSideEffect
}

func dispatchOverrides(existing overrides, base, updated map[string]any, overridable []string, owner string, custom application) (overrides, map[string]any) {
	entry := maps.Clone(existing[custom.universalIdentifier])
	if entry == nil {
		entry = map[string]any{}
	}
	columns := map[string]any{}
	for property, value := range updated {
		if !slices.Contains(overridable, property) {
			columns[property] = value
			continue
		}
		beneath := base[property]
		if ownerValue, found := existing[owner][property]; found && owner != custom.universalIdentifier {
			beneath = ownerValue
		}
		if reflect.DeepEqual(value, beneath) {
			delete(entry, property)
		} else {
			entry[property] = value
		}
	}
	next := overrides{}
	for author, properties := range existing {
		if author != custom.universalIdentifier {
			next[author] = properties
		}
	}
	if len(entry) > 0 {
		next[custom.universalIdentifier] = entry
	}
	if len(next) == 0 {
		return nil, columns
	}
	return next, columns
}

func updateEntity(ctx context.Context, tx pgx.Tx, table, id string, jsonColumns map[string]bool, columns map[string]any, next overrides, writeOverrides bool) error {
	names := make([]string, 0, len(columns))
	for name := range columns {
		names = append(names, name)
	}
	sort.Strings(names)
	assignments := make([]string, 0, len(names)+2)
	args := []any{id}
	for _, name := range names {
		value := columns[name]
		placeholder := fmt.Sprintf("$%d", len(args)+1)
		switch {
		case jsonColumns[name]:
			encoded, err := encodeJSON(value)
			if err != nil {
				return err
			}
			value = encoded
			placeholder += "::jsonb"
		case uuidColumns[name]:
			placeholder += "::uuid"
		}
		args = append(args, value)
		assignments = append(assignments, fmt.Sprintf(`"%s" = %s`, name, placeholder))
	}
	if writeOverrides {
		var encoded []byte
		if next != nil {
			var err error
			if encoded, err = json.Marshal(next); err != nil {
				return fmt.Errorf("encode overrides: %w", err)
			}
		}
		args = append(args, encoded)
		assignments = append(assignments, fmt.Sprintf(`overrides = $%d::jsonb`, len(args)))
	}
	assignments = append(assignments, `"updatedAt" = now()`)
	if _, err := tx.Exec(ctx, fmt.Sprintf(`UPDATE core."%s" SET %s WHERE id = $1::uuid`, table, strings.Join(assignments, ", ")), args...); err != nil {
		return fmt.Errorf("update %s: %w", table, err)
	}
	return nil
}

func encodeJSON(value any) ([]byte, error) {
	if value == nil {
		return nil, nil
	}
	encoded, err := json.Marshal(value)
	if err != nil {
		return nil, fmt.Errorf("encode json column: %w", err)
	}
	return encoded, nil
}

func effectiveTab(tab tabRecord) tabRecord {
	tab.title = effectiveAs(tab.overrides, "title", tab.owner, tab.title)
	tab.position = effectiveAs(tab.overrides, "position", tab.owner, tab.position)
	tab.icon = effectiveAs(tab.overrides, "icon", tab.owner, tab.icon)
	tab.isActive = effectiveAs(tab.overrides, "isActive", tab.owner, tab.isActive)
	return tab
}

func effectiveWidget(widget widgetRecord) widgetRecord {
	widget.title = effectiveAs(widget.overrides, "title", widget.owner, widget.title)
	widget.tabID = effectiveAs(widget.overrides, "pageLayoutTabId", widget.owner, widget.tabID)
	widget.position = effectiveAs(widget.overrides, "position", widget.owner, widget.position)
	widget.display = effectiveAs(widget.overrides, "conditionalDisplay", widget.owner, widget.display)
	widget.expression = effectiveAs(widget.overrides, "conditionalAvailabilityExpression", widget.owner, widget.expression)
	widget.isActive = effectiveAs(widget.overrides, "isActive", widget.owner, widget.isActive)
	return widget
}

func syncTabs(ctx context.Context, tx pgx.Tx, workspaceID, layoutID string, custom application, tabs []TabInput) (map[string]bool, error) {
	rows, err := tx.Query(ctx, `SELECT t.id::text, t.title, t."layoutMode", t.icon, t."position", t."isActive", t."isSystemSideEffect", t.overrides,
			a."universalIdentifier"::text
		FROM core."pageLayoutTab" t JOIN core.application a ON a.id = t."applicationId"
		WHERE t."pageLayoutId" = $1::uuid AND t."workspaceId" = $2::uuid AND t."deletedAt" IS NULL`, layoutID, workspaceID)
	if err != nil {
		return nil, fmt.Errorf("query page layout tabs: %w", err)
	}
	existing, err := pgx.CollectRows(rows, func(row pgx.CollectableRow) (tabRecord, error) {
		var (
			tab tabRecord
			raw []byte
		)
		err := row.Scan(&tab.id, &tab.title, &tab.layoutMode, &tab.icon, &tab.position, &tab.isActive, &tab.isSystemSideEffect, &raw, &tab.owner)
		tab.overrides = parseAuthoredOrLegacyOverrides(raw, tabLegacyKeys, custom.universalIdentifier)
		return tab, err
	})
	if err != nil {
		return nil, fmt.Errorf("scan page layout tabs: %w", err)
	}
	received := map[string]bool{}
	for _, tab := range tabs {
		received[tab.ID] = true
		index := slices.IndexFunc(existing, func(current tabRecord) bool { return current.id == tab.ID })
		if index < 0 {
			if err := createTab(ctx, tx, workspaceID, layoutID, custom, tab); err != nil {
				return nil, err
			}
			continue
		}
		if err := updateTab(ctx, tx, existing[index], tab, custom); err != nil {
			return nil, err
		}
	}
	removed := map[string]bool{}
	for _, tab := range existing {
		if received[tab.id] || !effectiveTab(tab).isActive {
			continue
		}
		removed[tab.id] = true
		if tab.owner == custom.universalIdentifier && !tab.isSystemSideEffect {
			if _, err := tx.Exec(ctx, `DELETE FROM core."pageLayoutTab" WHERE id = $1::uuid`, tab.id); err != nil {
				return nil, fmt.Errorf("delete page layout tab: %w", err)
			}
			continue
		}
		next := tab.overrides.withIsActive(false, tab.owner, custom.universalIdentifier, tab.isActive)
		if err := updateEntity(ctx, tx, "pageLayoutTab", tab.id, nil, nil, next, true); err != nil {
			return nil, err
		}
	}
	return removed, nil
}

func createTab(ctx context.Context, tx pgx.Tx, workspaceID, layoutID string, custom application, tab TabInput) error {
	layoutMode := "GRID"
	if tab.LayoutMode != nil {
		layoutMode = *tab.LayoutMode
	}
	_, err := tx.Exec(ctx, `INSERT INTO core."pageLayoutTab" (id, title, "position", "pageLayoutId", "workspaceId", "universalIdentifier", "applicationId", "layoutMode")
		VALUES ($1::uuid, $2, $3, $4::uuid, $5::uuid, $1::uuid, $6::uuid, $7)`,
		tab.ID, tab.Title, tab.Position, layoutID, workspaceID, custom.id, layoutMode)
	if err != nil {
		return fmt.Errorf("create page layout tab: %w", err)
	}
	return nil
}

func updateTab(ctx context.Context, tx pgx.Tx, current tabRecord, input TabInput, custom application) error {
	layoutMode := current.layoutMode
	if input.LayoutMode != nil {
		layoutMode = *input.LayoutMode
	}
	effective := effectiveTab(current)
	if input.Icon == nil {
		input.Icon = effective.icon
	}
	if effective.isActive && effective.title == input.Title && effective.position == input.Position &&
		reflect.DeepEqual(effective.icon, input.Icon) && current.layoutMode == layoutMode {
		return nil
	}
	updated := map[string]any{"title": input.Title, "position": input.Position, "icon": stringOrNil(input.Icon), "layoutMode": layoutMode}
	if !isOverridingCaller(current.owner, custom, current.isSystemSideEffect) {
		if !effective.isActive {
			updated["isActive"] = true
		}
		return updateEntity(ctx, tx, "pageLayoutTab", current.id, nil, updated, nil, false)
	}
	base := map[string]any{"title": current.title, "position": current.position, "icon": stringOrNil(current.icon)}
	next, columns := dispatchOverrides(current.overrides, base, updated, tabOverridable, current.owner, custom)
	if !effective.isActive {
		next = next.withIsActive(true, current.owner, custom.universalIdentifier, current.isActive)
	}
	return updateEntity(ctx, tx, "pageLayoutTab", current.id, nil, columns, next, true)
}

func syncWidgets(ctx context.Context, tx pgx.Tx, workspaceID string, custom application, tabs []TabInput) (map[string]bool, error) {
	tabIDs, widgetIDs := []string{}, []string{}
	inInput := map[string]bool{}
	for _, tab := range tabs {
		tabIDs = append(tabIDs, tab.ID)
		for _, widget := range tab.Widgets {
			widgetIDs = append(widgetIDs, widget.ID)
			inInput[widget.ID] = true
			if widget.Configuration != nil {
				if err := validateConfiguration(widget.Configuration); err != nil {
					return nil, err
				}
			}
		}
	}
	existing, err := loadWidgets(ctx, tx, workspaceID, custom, tabIDs, widgetIDs)
	if err != nil {
		return nil, err
	}
	removed := map[string]bool{}
	for _, current := range existing {
		if inInput[current.id] || !slices.Contains(tabIDs, current.tabID) || !effectiveWidget(current).isActive {
			continue
		}
		removed[current.id] = true
		if err := removeWidget(ctx, tx, current, custom); err != nil {
			return nil, err
		}
	}
	for _, tab := range tabs {
		for _, widget := range tab.Widgets {
			if err := upsertWidget(ctx, tx, workspaceID, custom, existing, widget); err != nil {
				return nil, err
			}
		}
	}
	return removed, nil
}

func loadWidgets(ctx context.Context, tx pgx.Tx, workspaceID string, custom application, tabIDs, widgetIDs []string) ([]widgetRecord, error) {
	rows, err := tx.Query(ctx, `SELECT w.id::text, w."pageLayoutTabId"::text, w.title, w.type, w."objectMetadataId"::text, w."conditionalAvailabilityExpression",
			w."position", w.configuration, w."conditionalDisplay", w."isActive", w."isSystemSideEffect", w.overrides, a."universalIdentifier"::text
		FROM core."pageLayoutWidget" w JOIN core.application a ON a.id = w."applicationId"
		WHERE w."workspaceId" = $1::uuid AND w."deletedAt" IS NULL AND (w."pageLayoutTabId" = ANY($2::uuid[]) OR w.id = ANY($3::uuid[]))
		ORDER BY w."createdAt", w.id`, workspaceID, tabIDs, widgetIDs)
	if err != nil {
		return nil, fmt.Errorf("query page layout widgets: %w", err)
	}
	widgets, err := pgx.CollectRows(rows, func(row pgx.CollectableRow) (widgetRecord, error) {
		var (
			widget widgetRecord
			raw    []byte
		)
		err := row.Scan(&widget.id, &widget.tabID, &widget.title, &widget.widgetType, &widget.objectMetadataID, &widget.expression,
			&widget.position, &widget.configuration, &widget.display, &widget.isActive, &widget.isSystemSideEffect, &raw, &widget.owner)
		widget.overrides = parseAuthoredOrLegacyOverrides(raw, widgetLegacyKeys, custom.universalIdentifier)
		return widget, err
	})
	if err != nil {
		return nil, fmt.Errorf("scan page layout widgets: %w", err)
	}
	return widgets, nil
}

func removeWidget(ctx context.Context, tx pgx.Tx, widget widgetRecord, custom application) error {
	if widget.owner == custom.universalIdentifier && !widget.isSystemSideEffect {
		if _, err := tx.Exec(ctx, `DELETE FROM core."pageLayoutWidget" WHERE id = $1::uuid`, widget.id); err != nil {
			return fmt.Errorf("delete page layout widget: %w", err)
		}
		return nil
	}
	next := widget.overrides.withIsActive(false, widget.owner, custom.universalIdentifier, widget.isActive)
	return updateEntity(ctx, tx, "pageLayoutWidget", widget.id, nil, nil, next, true)
}

func upsertWidget(ctx context.Context, tx pgx.Tx, workspaceID string, custom application, existing []widgetRecord, input WidgetInput) error {
	index := slices.IndexFunc(existing, func(widget widgetRecord) bool { return widget.id == input.ID })
	if index < 0 {
		return createWidget(ctx, tx, workspaceID, custom, input)
	}
	current := existing[index]
	effective := effectiveWidget(current)
	if input.ConditionalAvailabilityExpression == nil {
		input.ConditionalAvailabilityExpression = effective.expression
	}
	if input.ConditionalDisplay == nil {
		input.ConditionalDisplay = jsonValue(effective.display)
	}
	if effective.isActive && effective.title == input.Title && effective.widgetType == input.Type &&
		reflect.DeepEqual(effective.objectMetadataID, input.ObjectMetadataID) && effective.tabID == input.PageLayoutTabID &&
		reflect.DeepEqual(jsonValue(effective.position), normalized(input.Position)) &&
		reflect.DeepEqual(jsonValue(effective.configuration), normalized(input.Configuration)) &&
		reflect.DeepEqual(effective.expression, input.ConditionalAvailabilityExpression) &&
		reflect.DeepEqual(jsonValue(effective.display), normalized(input.ConditionalDisplay)) {
		return nil
	}
	updated := map[string]any{
		"title": input.Title, "type": input.Type, "objectMetadataId": stringOrNil(input.ObjectMetadataID),
		"position": normalized(input.Position), "configuration": normalized(input.Configuration),
		"pageLayoutTabId": input.PageLayoutTabID, "conditionalAvailabilityExpression": stringOrNil(input.ConditionalAvailabilityExpression),
		"conditionalDisplay": normalized(input.ConditionalDisplay),
	}
	if !isOverridingCaller(current.owner, custom, current.isSystemSideEffect) {
		if !effective.isActive {
			updated["isActive"] = true
		}
		return updateEntity(ctx, tx, "pageLayoutWidget", current.id, widgetJSONColumns, updated, nil, false)
	}
	base := map[string]any{
		"title": current.title, "position": jsonValue(current.position), "pageLayoutTabId": current.tabID,
		"conditionalDisplay": jsonValue(current.display), "conditionalAvailabilityExpression": stringOrNil(current.expression),
	}
	next, columns := dispatchOverrides(current.overrides, base, updated, widgetOverridable, current.owner, custom)
	if !effective.isActive {
		next = next.withIsActive(true, current.owner, custom.universalIdentifier, current.isActive)
	}
	return updateEntity(ctx, tx, "pageLayoutWidget", current.id, widgetJSONColumns, columns, next, true)
}

func createWidget(ctx context.Context, tx pgx.Tx, workspaceID string, custom application, input WidgetInput) error {
	if input.Configuration == nil {
		return invalid("Invalid configuration: not an object")
	}
	configuration, err := encodeJSON(input.Configuration)
	if err != nil {
		return err
	}
	position, err := encodeJSON(input.Position)
	if err != nil {
		return err
	}
	_, err = tx.Exec(ctx, `INSERT INTO core."pageLayoutWidget" (id, "pageLayoutTabId", "workspaceId", title, type, "objectMetadataId", "gridPosition",
			configuration, "position", "conditionalAvailabilityExpression", "universalIdentifier", "applicationId", "createdAt", "updatedAt")
		VALUES ($1::uuid, $2::uuid, $3::uuid, $4, $5, $6::uuid, $7::jsonb, $8::jsonb, $9::jsonb, $10, $1::uuid, $11::uuid, clock_timestamp(), clock_timestamp())`,
		input.ID, input.PageLayoutTabID, workspaceID, input.Title, input.Type, input.ObjectMetadataID, gridPositionFor(input.Position),
		configuration, position, input.ConditionalAvailabilityExpression, custom.id)
	if err != nil {
		return fmt.Errorf("create page layout widget: %w", err)
	}
	return nil
}

func gridPositionFor(position any) []byte {
	if grid, ok := normalized(position).(map[string]any); ok && grid["layoutMode"] == "GRID" {
		encoded, err := json.Marshal(map[string]any{"row": grid["row"], "column": grid["column"], "rowSpan": grid["rowSpan"], "columnSpan": grid["columnSpan"]})
		if err == nil {
			return encoded
		}
	}
	return []byte(`{"row":0,"column":0,"rowSpan":1,"columnSpan":12}`)
}

func validateConfiguration(configuration any) error {
	record, ok := normalized(configuration).(map[string]any)
	if !ok || len(record) == 0 {
		return invalid("Invalid configuration: not an object")
	}
	if _, ok := record["configurationType"]; !ok {
		return invalid("Invalid configuration: missing configuration type")
	}
	return nil
}

func activeFieldsWidgets(ctx context.Context, tx pgx.Tx, workspaceID, layoutID string) ([]fieldsWidget, error) {
	rows, err := tx.Query(ctx, `SELECT w.id::text, w."pageLayoutTabId"::text, w.configuration->>'viewId', w."isActive", w.overrides, a."universalIdentifier"::text
		FROM core."pageLayoutWidget" w
		JOIN core."pageLayoutTab" t ON t.id = w."pageLayoutTabId"
		JOIN core.application a ON a.id = w."applicationId"
		WHERE w."workspaceId" = $1::uuid AND w."deletedAt" IS NULL AND t."pageLayoutId" = $2::uuid
		  AND w.configuration->>'configurationType' = 'FIELDS' AND w.configuration->>'viewId' IS NOT NULL`, workspaceID, layoutID)
	if err != nil {
		return nil, fmt.Errorf("query fields widgets: %w", err)
	}
	widgets, err := pgx.CollectRows(rows, func(row pgx.CollectableRow) (fieldsWidget, error) {
		var (
			widget fieldsWidget
			raw    []byte
			owner  string
		)
		err := row.Scan(&widget.id, &widget.tabID, &widget.viewID, &widget.isActive, &raw, &owner)
		authored := parseAuthoredOrLegacyOverrides(raw, widgetLegacyKeys, "")
		widget.isActive = effectiveAs(authored, "isActive", owner, widget.isActive)
		widget.tabID = effectiveAs(authored, "pageLayoutTabId", owner, widget.tabID)
		return widget, err
	})
	if err != nil {
		return nil, fmt.Errorf("scan fields widgets: %w", err)
	}
	return widgets, nil
}

func destroyOrphanedViews(ctx context.Context, tx pgx.Tx, workspaceID, layoutID string, before []fieldsWidget, removedTabs, removedWidgets map[string]bool) error {
	after, err := activeFieldsWidgets(ctx, tx, workspaceID, layoutID)
	if err != nil {
		return err
	}
	inUse := map[string]bool{}
	for _, widget := range after {
		if widget.isActive && !removedTabs[widget.tabID] {
			inUse[widget.viewID] = true
		}
	}
	var orphaned []string
	for _, widget := range before {
		if widget.isActive && (removedWidgets[widget.id] || removedTabs[widget.tabID]) && !inUse[widget.viewID] && !slices.Contains(orphaned, widget.viewID) {
			orphaned = append(orphaned, widget.viewID)
		}
	}
	if len(orphaned) == 0 {
		return nil
	}
	if _, err := tx.Exec(ctx, `DELETE FROM core.view WHERE id = ANY($1::uuid[]) AND "workspaceId" = $2::uuid`, orphaned, workspaceID); err != nil {
		return fmt.Errorf("delete orphaned fields widget views: %w", err)
	}
	return nil
}

func touchDashboards(ctx context.Context, tx pgx.Tx, layoutID string) error {
	_, err := tx.Exec(ctx, `UPDATE `+workspace.SchemaName()+`.dashboard SET "updatedAt" = (SELECT "updatedAt" FROM core."pageLayout" WHERE id = $1::uuid)
		WHERE "pageLayoutId" = $1::uuid`, layoutID)
	if err != nil {
		return fmt.Errorf("touch linked dashboards: %w", err)
	}
	return nil
}

func validateWidgets(ctx context.Context, tx pgx.Tx, workspaceID string, tabs []TabInput) error {
	rows, err := tx.Query(ctx, `SELECT id::text, "layoutMode" FROM core."pageLayoutTab" WHERE "workspaceId" = $1::uuid AND "deletedAt" IS NULL`, workspaceID)
	if err != nil {
		return fmt.Errorf("query tab layout modes: %w", err)
	}
	layoutModes := map[string]string{}
	for rows.Next() {
		var id, mode string
		if err := rows.Scan(&id, &mode); err != nil {
			rows.Close()
			return fmt.Errorf("scan tab layout mode: %w", err)
		}
		layoutModes[id] = mode
	}
	if err := rows.Err(); err != nil {
		return fmt.Errorf("read tab layout modes: %w", err)
	}
	for _, tab := range tabs {
		for _, widget := range tab.Widgets {
			mode, found := layoutModes[widget.PageLayoutTabID]
			if !found {
				return invalid("Page layout tab not found")
			}
			if err := validatePosition(normalized(widget.Position), mode, widget.Title); err != nil {
				return err
			}
		}
	}
	return nil
}

func validatePosition(position any, tabLayoutMode, title string) error {
	record, ok := position.(map[string]any)
	if !ok {
		return nil
	}
	layoutMode, _ := record["layoutMode"].(string)
	if layoutMode != tabLayoutMode {
		return invalid("Position layoutMode %q does not match tab layoutMode %q", layoutMode, tabLayoutMode)
	}
	fail := func(detail string) error {
		return invalid("Invalid widget position for widget %q: %s", title, detail)
	}
	number := func(property string) float64 {
		value, _ := record[property].(float64)
		return value
	}
	switch layoutMode {
	case "GRID":
		for property, minimum := range map[string]float64{"row": 0, "column": 0, "rowSpan": 1, "columnSpan": 1} {
			value, isNumber := record[property].(float64)
			if !isNumber || value != math.Trunc(value) || value < minimum {
				return fail(fmt.Sprintf("%s must be an integer greater than or equal to %v", property, minimum))
			}
		}
		if number("column") >= gridMaxColumns || number("column")+number("columnSpan") > gridMaxColumns {
			return fail("widget extends beyond grid width")
		}
		if number("row") >= gridMaxRows || number("row")+number("rowSpan") > gridMaxRows {
			return fail("widget extends beyond grid height")
		}
	case "VERTICAL_LIST":
		index, isNumber := record["index"].(float64)
		if !isNumber || index < 0 || index != math.Trunc(index) {
			return fail(fmt.Sprintf("index %v must be a non-negative integer", record["index"]))
		}
		if behavior, set := record["heightBehavior"].(string); set && behavior != "FIT_CONTENT" && behavior != "TAB_VIEWPORT" {
			return fail(fmt.Sprintf("height behavior %s is not supported", behavior))
		}
	case "CANVAS":
	default:
		return invalid("Invalid widget position layout mode")
	}
	return nil
}
