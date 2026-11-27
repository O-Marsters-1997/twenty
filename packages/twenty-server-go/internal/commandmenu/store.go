package commandmenu

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"maps"
	"slices"
	"strconv"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgconn"
	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/twentyhq/twenty/packages/twenty-server-go/internal/metadata"
	"github.com/twentyhq/twenty/packages/twenty-server-go/internal/overrides"
)

const (
	standardApplicationUniversalIdentifier = "20202020-64aa-4b6f-b003-9c74b97cee20"
	notFoundText                           = "Command menu item not found"
)

var editableColumns = map[string]string{
	"label": "$%d", "icon": "$%d", "shortLabel": "$%d", "position": "$%d", "isPinned": "$%d",
	"hotKeys": "$%d::text[]", "availabilityType": "$%d", "availabilityObjectMetadataId": "$%d::uuid",
	"engineComponentKey": "$%d", "pageLayoutId": "$%d::uuid",
}

var requiredColumns = []string{"label", "position", "isPinned", "availabilityType", "engineComponentKey"}

type queryer interface {
	Query(ctx context.Context, sql string, args ...any) (pgx.Rows, error)
	QueryRow(ctx context.Context, sql string, args ...any) pgx.Row
	Exec(ctx context.Context, sql string, args ...any) (pgconn.CommandTag, error)
}

type Store struct{ pool *pgxpool.Pool }

func New(pool *pgxpool.Pool) *Store { return &Store{pool: pool} }

type record struct {
	row   map[string]any
	owner string
}

type environment struct {
	catalog overrides.ApplicationCatalog
	custom  string
	objects map[string]*navigationTarget
}

func loadEnvironment(ctx context.Context, q queryer, workspaceID string) (environment, error) {
	env := environment{
		catalog: overrides.ApplicationCatalog{Translator: identityTranslator{}, UniversalIdentifierByID: map[string]string{}},
		objects: map[string]*navigationTarget{},
	}
	rows, err := q.Query(ctx, `SELECT a.id::text, a."universalIdentifier"::text, a.id = ws."workspaceCustomApplicationId"
		FROM core.application a JOIN core.workspace ws ON ws.id = a."workspaceId" WHERE a."workspaceId" = $1::uuid`, workspaceID)
	if err != nil {
		return env, fmt.Errorf("query applications: %w", err)
	}
	for rows.Next() {
		var id, universalIdentifier string
		var isCustom bool
		if err := rows.Scan(&id, &universalIdentifier, &isCustom); err != nil {
			rows.Close()
			return env, fmt.Errorf("scan application: %w", err)
		}
		env.catalog.UniversalIdentifierByID[id] = universalIdentifier
		if isCustom {
			env.custom = universalIdentifier
			env.catalog.CustomUniversalIdentifier = universalIdentifier
		}
		if universalIdentifier == standardApplicationUniversalIdentifier {
			env.catalog.StandardApplicationID = id
		}
	}
	rows.Close()
	if err := rows.Err(); err != nil {
		return env, fmt.Errorf("read applications: %w", err)
	}
	objects, err := q.Query(ctx, `SELECT id::text, "labelPlural", COALESCE(icon, ''), "applicationId"::text, overrides
		FROM core."objectMetadata" WHERE "workspaceId" = $1::uuid`, workspaceID)
	if err != nil {
		return env, fmt.Errorf("query object metadata: %w", err)
	}
	defer objects.Close()
	for objects.Next() {
		var id string
		var target navigationTarget
		var raw []byte
		if err := objects.Scan(&id, &target.LabelPlural, &target.Icon, &target.ApplicationID, &raw); err != nil {
			return env, fmt.Errorf("scan object metadata: %w", err)
		}
		if target.Overrides, err = decodeJSON(raw); err != nil {
			return env, err
		}
		env.objects[id] = &target
	}
	return env, objects.Err()
}

func decodeJSON(raw []byte) (any, error) {
	if len(raw) == 0 {
		return nil, nil
	}
	var value any
	if err := json.Unmarshal(raw, &value); err != nil {
		return nil, fmt.Errorf("decode json column: %w", err)
	}
	return value, nil
}

const accessibleWorkflow = `NOT EXISTS (SELECT 1 FROM core."workflowVersion" v JOIN core.workflow w ON w.id = v."coreWorkflowId"
	WHERE v."workspaceId" = t."workspaceId"
		AND (v.id = t."coreWorkflowVersionId" OR v."workspaceWorkflowVersionId" = t."workflowVersionId")
		AND w.visibility = 'PRIVATE' AND w."createdByUserWorkspaceId" IS NOT NULL
		AND w."createdByUserWorkspaceId" IS DISTINCT FROM NULLIF($2, '')::uuid)`

func loadRecords(ctx context.Context, q queryer, workspaceID, where, suffix string, args ...any) ([]record, error) {
	rows, err := q.Query(ctx, `SELECT to_jsonb(t), a."universalIdentifier"::text
		FROM core."commandMenuItem" t JOIN core.application a ON a.id = t."applicationId"
		WHERE t."workspaceId" = $1::uuid AND `+where+` ORDER BY t."position", t."createdAt", t.id `+suffix,
		append([]any{workspaceID}, args...)...)
	if err != nil {
		return nil, fmt.Errorf("query command menu items: %w", err)
	}
	defer rows.Close()
	var records []record
	for rows.Next() {
		var raw []byte
		var rec record
		if err := rows.Scan(&raw, &rec.owner); err != nil {
			return nil, fmt.Errorf("scan command menu item: %w", err)
		}
		if err := json.Unmarshal(raw, &rec.row); err != nil {
			return nil, fmt.Errorf("decode command menu item: %w", err)
		}
		records = append(records, rec)
	}
	return records, rows.Err()
}

func (s *Store) List(ctx context.Context, workspaceID, userWorkspaceID string) ([]Item, error) {
	env, err := loadEnvironment(ctx, s.pool, workspaceID)
	if err != nil {
		return nil, err
	}
	records, err := loadRecords(ctx, s.pool, workspaceID, accessibleWorkflow, "", userWorkspaceID)
	if err != nil {
		return nil, err
	}
	return buildAll(records, env)
}

func buildAll(records []record, env environment) ([]Item, error) {
	items := make([]Item, 0, len(records))
	for _, rec := range records {
		item, err := build(rec, env)
		if err != nil {
			return nil, err
		}
		items = append(items, item)
	}
	return items, nil
}

func text(value any) *string {
	if value, ok := value.(string); ok {
		return &value
	}
	return nil
}

func timestamp(value any) (metadata.Timestamp, error) {
	parsed, err := time.Parse(time.RFC3339Nano, fmt.Sprint(value))
	if err != nil {
		return metadata.Timestamp{}, fmt.Errorf("parse command menu item timestamp: %w", err)
	}
	return metadata.Timestamp{Time: parsed}, nil
}

func effectiveRow(rec record) map[string]any {
	effective := maps.Clone(rec.row)
	authors := overrides.Authors{Owner: rec.owner}
	for _, property := range overrides.CommandMenuItem.Overridable {
		if value, ok := overrides.CommandMenuItem.ReadProperty(rec.row["overrides"], []string{property}, authors); ok {
			effective[property] = value
		}
	}
	return effective
}

func build(rec record, env environment) (Item, error) {
	row := effectiveRow(rec)
	i18n := env.catalog.For(fmt.Sprint(row["applicationId"]))
	resolve := func(property string) *string {
		base, _ := row[property].(string)
		resolved := overrides.CommandMenuItem.Resolve(base, rec.row["overrides"], property, i18n)
		if resolved == "" {
			return nil
		}
		return &resolved
	}
	item := Item{
		ID: fmt.Sprint(row["id"]), UniversalIdentifier: fmt.Sprint(row["universalIdentifier"]), ApplicationID: fmt.Sprint(row["applicationId"]),
		WorkflowVersionID: text(row["workflowVersionId"]), CoreWorkflowVersionID: text(row["coreWorkflowVersionId"]),
		EngineComponentKey: fmt.Sprint(row["engineComponentKey"]), Icon: resolve("icon"), ShortLabel: resolve("shortLabel"),
		ConditionalAvailabilityExpression: text(row["conditionalAvailabilityExpression"]),
		ConditionalPinnedExpression:       text(row["conditionalPinnedExpression"]),
		AvailabilityType:                  fmt.Sprint(row["availabilityType"]),
		AvailabilityObjectMetadataID:      text(row["availabilityObjectMetadataId"]),
		NavigationTargetObjectMetadataID:  text(row["navigationTargetObjectMetadataId"]),
		PageLayoutID:                      text(row["pageLayoutId"]),
	}
	label := resolve("label")
	item.Position, _ = row["position"].(float64)
	item.IsPinned, _ = row["isPinned"].(bool)
	item.IsActive, _ = row["isActive"].(bool)
	if hotKeys, ok := row["hotKeys"].([]any); ok {
		for _, key := range hotKeys {
			item.HotKeys = append(item.HotKeys, fmt.Sprint(key))
		}
	}
	if payload, ok := row["payload"].(map[string]any); ok {
		if _, legacy := payload["objectMetadataItemId"]; !legacy {
			path, _ := payload["path"].(string)
			item.Payload = &PathPayload{Path: path}
		}
	}
	if item.EngineComponentKey == engineKeyNavigation && item.NavigationTargetObjectMetadataID != nil {
		target := env.objects[*item.NavigationTargetObjectMetadataID]
		var targetI18n overrides.I18nContext
		if target != nil {
			targetI18n = env.catalog.For(target.ApplicationID)
		}
		label = interpolateNavigation(label, target, targetI18n)
		item.ShortLabel = interpolateNavigation(item.ShortLabel, target, targetI18n)
		item.Icon = interpolateNavigation(item.Icon, target, targetI18n)
	}
	if label != nil {
		item.Label = *label
	}
	var err error
	if item.CreatedAt, err = timestamp(row["createdAt"]); err != nil {
		return item, err
	}
	item.UpdatedAt, err = timestamp(row["updatedAt"])
	return item, err
}

func notFound() error { return fmt.Errorf("%w: %s", metadata.ErrNotFound, notFoundText) }

func lockRecord(ctx context.Context, q queryer, workspaceID, id string) (record, error) {
	if _, err := uuid.Parse(id); err != nil {
		return record{}, invalid("id must be a UUID")
	}
	records, err := loadRecords(ctx, q, workspaceID, `t.id = $2::uuid`, `FOR UPDATE OF t`, id)
	if err != nil {
		return record{}, err
	}
	if len(records) == 0 {
		return record{}, notFound()
	}
	return records[0], nil
}

func (s *Store) reload(ctx context.Context, q queryer, workspaceID, id string, env environment) (Item, error) {
	records, err := loadRecords(ctx, q, workspaceID, `t.id = $2::uuid`, "", id)
	if err != nil {
		return Item{}, err
	}
	if len(records) == 0 {
		return Item{}, notFound()
	}
	return build(records[0], env)
}

func (s *Store) Update(ctx context.Context, workspaceID string, input map[string]any) (Item, error) {
	id, _ := input["id"].(string)
	updates := maps.Clone(input)
	delete(updates, "id")
	var item Item
	err := pgx.BeginFunc(ctx, s.pool, func(tx pgx.Tx) error {
		rec, err := lockRecord(ctx, tx, workspaceID, id)
		if err != nil {
			return err
		}
		env, err := loadEnvironment(ctx, tx, workspaceID)
		if err != nil {
			return err
		}
		isSideEffect, _ := rec.row["isSystemSideEffect"].(bool)
		columns, authored, overridden := updates, overrides.Authored(nil), false
		if overrides.IsCallerOverriding(env.custom, rec.owner, env.custom, isSideEffect) {
			update := overrides.CommandMenuItem.Dispatch(updates, rec.row, rec.row["overrides"], env.custom,
				overrides.Authors{Custom: env.custom, Owner: rec.owner})
			columns, authored, overridden = update.Column, update.Overrides, true
		}
		if err := checkUpdate(ctx, tx, workspaceID, rec.row, columns, updates, env); err != nil {
			return err
		}
		if err := writeUpdate(ctx, tx, id, columns, authored, overridden); err != nil {
			return err
		}
		item, err = s.reload(ctx, tx, workspaceID, id, env)
		return err
	})
	return item, err
}

func (s *Store) Reset(ctx context.Context, workspaceID, id string) (Item, error) {
	var item Item
	err := pgx.BeginFunc(ctx, s.pool, func(tx pgx.Tx) error {
		rec, err := lockRecord(ctx, tx, workspaceID, id)
		if err != nil {
			return err
		}
		env, err := loadEnvironment(ctx, tx, workspaceID)
		if err != nil {
			return err
		}
		if rec.owner == env.custom {
			return invalid("Custom command menu item cannot be reset to default")
		}
		remaining := overrides.CommandMenuItem.Reset(rec.row["overrides"], env.custom, env.custom)
		if err := checkCoherence(rec.row); err != nil {
			return err
		}
		encoded, err := authoredJSON(remaining)
		if err != nil {
			return err
		}
		if _, err := tx.Exec(ctx, `UPDATE core."commandMenuItem" SET overrides = $2::jsonb, "isActive" = true, "updatedAt" = now()
			WHERE id = $1::uuid`, id, encoded); err != nil {
			return fmt.Errorf("reset command menu item: %w", err)
		}
		item, err = s.reload(ctx, tx, workspaceID, id, env)
		return err
	})
	return item, err
}

func authoredJSON(authored overrides.Authored) (any, error) {
	if len(authored) == 0 {
		return nil, nil
	}
	encoded, err := json.Marshal(authored)
	if err != nil {
		return nil, fmt.Errorf("encode overrides: %w", err)
	}
	return string(encoded), nil
}

func checkUpdate(ctx context.Context, q queryer, workspaceID string, row, columns, requested map[string]any, env environment) error {
	for _, property := range requiredColumns {
		if value, present := columns[property]; present && value == nil {
			return invalid("%s must not be null", property)
		}
	}
	if label, present := columns["label"].(string); present && label == "" {
		return invalid("Label is required")
	}
	merged := maps.Clone(row)
	maps.Copy(merged, columns)
	if err := checkCoherence(merged); err != nil {
		return err
	}
	if target, ok := merged["navigationTargetObjectMetadataId"].(string); ok && env.objects[target] == nil {
		return invalid("Navigation target object metadata not found")
	}
	if target, ok := requested["availabilityObjectMetadataId"].(string); ok && env.objects[target] == nil {
		return invalid("Availability object metadata not found")
	}
	if layout, ok := requested["pageLayoutId"].(string); ok {
		var exists bool
		if _, err := uuid.Parse(layout); err == nil {
			err = q.QueryRow(ctx, `SELECT EXISTS (SELECT 1 FROM core."pageLayout" WHERE id = $1::uuid AND "workspaceId" = $2::uuid AND "deletedAt" IS NULL)`,
				layout, workspaceID).Scan(&exists)
			if err != nil {
				return fmt.Errorf("look up page layout: %w", err)
			}
		}
		if !exists {
			return invalid("Page layout not found")
		}
	}
	return nil
}

func writeUpdate(ctx context.Context, q queryer, id string, columns map[string]any, authored overrides.Authored, overridden bool) error {
	sets := []string{`"updatedAt" = now()`}
	args := []any{id}
	for _, property := range slices.Sorted(maps.Keys(columns)) {
		template, ok := editableColumns[property]
		if !ok {
			continue
		}
		args = append(args, columns[property])
		sets = append(sets, `"`+property+`" = `+fmt.Sprintf(template, len(args)))
	}
	if overridden {
		encoded, err := authoredJSON(authored)
		if err != nil {
			return err
		}
		args = append(args, encoded)
		sets = append(sets, "overrides = $"+strconv.Itoa(len(args))+"::jsonb")
	}
	if _, err := q.Exec(ctx, `UPDATE core."commandMenuItem" SET `+strings.Join(sets, ", ")+` WHERE id = $1::uuid`, args...); err != nil {
		var pgErr *pgconn.PgError
		if errors.As(err, &pgErr) && pgErr.Code == "23514" {
			return invalid("%s", pgErr.Message)
		}
		return fmt.Errorf("update command menu item: %w", err)
	}
	return nil
}
