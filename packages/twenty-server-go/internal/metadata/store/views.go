package store

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"slices"
	"strings"

	"github.com/jackc/pgx/v5/pgconn"
	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/twentyhq/twenty/packages/twenty-server-go/internal/metadata"
)

var (
	viewColumns = []string{
		"id", "name", "objectMetadataId", "type", "key", "icon", "position", "isCompact", "openRecordIn",
		"kanbanAggregateOperation", "kanbanAggregateOperationFieldMetadataId", "anyFieldFilterValue",
		"calendarLayout", "calendarFieldMetadataId", "calendarEndFieldMetadataId", "visibility",
		"createdByUserWorkspaceId", "mainGroupByFieldMetadataId", "shouldHideEmptyGroups",
		"kanbanColumnWidth", "groupLoadLimit",
	}
	viewFieldColumns       = []string{"id", "fieldMetadataId", "viewId", "viewFieldGroupId", "isVisible", "position", "size", "aggregateOperation"}
	viewFilterColumns      = []string{"id", "fieldMetadataId", "viewId", "viewFilterGroupId", "operand", "value", "positionInViewFilterGroup", "subFieldName", "relationTargetFieldMetadataId"}
	viewFilterGroupColumns = []string{"id", "viewId", "parentViewFilterGroupId", "logicalOperator", "positionInViewFilterGroup"}
	viewSortColumns        = []string{"id", "fieldMetadataId", "viewId", "direction", "subFieldName"}
	viewGroupColumns       = []string{"id", "viewId", "fieldValue", "isVisible", "position"}
)

type executor interface {
	querier
	Exec(ctx context.Context, sql string, args ...any) (pgconn.CommandTag, error)
}

type viewTables struct {
	db           executor
	View         Rows[metadata.ViewRecord]
	Fields       Rows[metadata.ViewField]
	Filters      Rows[metadata.ViewFilter]
	FilterGroups Rows[metadata.ViewFilterGroup]
	Sorts        Rows[metadata.ViewSort]
	Groups       Rows[metadata.ViewGroup]
}

func bindViewTables(db executor) viewTables {
	return viewTables{
		db:           db,
		View:         Rows[metadata.ViewRecord]{db: db, table: "core.view", writable: viewColumns},
		Fields:       Rows[metadata.ViewField]{db: db, table: `core."viewField"`, writable: viewFieldColumns},
		Filters:      Rows[metadata.ViewFilter]{db: db, table: `core."viewFilter"`, writable: viewFilterColumns},
		FilterGroups: Rows[metadata.ViewFilterGroup]{db: db, table: `core."viewFilterGroup"`, writable: viewFilterGroupColumns},
		Sorts:        Rows[metadata.ViewSort]{db: db, table: `core."viewSort"`, writable: viewSortColumns},
		Groups:       Rows[metadata.ViewGroup]{db: db, table: `core."viewGroup"`, writable: viewGroupColumns},
	}
}

type Views struct {
	viewTables
	pool *pgxpool.Pool
}

var _ metadata.ViewWriter = (*Views)(nil)

func NewViews(pool *pgxpool.Pool) *Views {
	return &Views{viewTables: bindViewTables(pool), pool: pool}
}

func (v *Views) List(ctx context.Context, objectMetadataID string, viewTypes []string) ([]metadata.ViewRecord, error) {
	if viewTypes == nil {
		viewTypes = []string{}
	}
	return v.load(ctx, `SELECT to_jsonb(v) FROM core.view v
		WHERE v."deletedAt" IS NULL
		AND ($1::text = '' OR v."objectMetadataId"::text = $1::text)
		AND (cardinality($2::text[]) = 0 OR v.type::text = ANY($2::text[]))
		ORDER BY v."position", v."createdAt", v.id`, objectMetadataID, viewTypes)
}

func (v *Views) Views(ctx context.Context, objectMetadataID string) ([]metadata.View, error) {
	records, err := v.List(ctx, objectMetadataID, nil)
	if err != nil {
		return nil, err
	}
	views := make([]metadata.View, len(records))
	for i, record := range records {
		views[i] = record.View
	}
	return views, nil
}

func (v *Views) Get(ctx context.Context, id string) (metadata.ViewRecord, error) {
	found, err := v.load(ctx, `SELECT to_jsonb(v) FROM core.view v WHERE v."deletedAt" IS NULL AND v.id = $1::uuid`, id)
	switch {
	case err != nil:
		return metadata.ViewRecord{}, err
	case len(found) == 0:
		return metadata.ViewRecord{}, metadata.ErrNotFound
	}
	return found[0], nil
}

func (v *Views) Create(ctx context.Context, values map[string]any) (metadata.ViewRecord, error) {
	created, err := v.View.Insert(ctx, values)
	if err != nil {
		return metadata.ViewRecord{}, err
	}
	return v.Get(ctx, created.ID)
}

func (v *Views) Update(ctx context.Context, id string, patch map[string]any) (metadata.ViewRecord, error) {
	if _, err := v.View.Update(ctx, id, patch); err != nil {
		return metadata.ViewRecord{}, err
	}
	return v.Get(ctx, id)
}

func (v *Views) SaveView(ctx context.Context, view metadata.View) (metadata.View, error) {
	tx, err := v.pool.Begin(ctx)
	if err != nil {
		return metadata.View{}, fmt.Errorf("begin save view: %w", err)
	}
	defer func() { _ = tx.Rollback(ctx) }()
	tables := bindViewTables(tx)

	values, err := columnsOf(view, viewColumns)
	if err != nil {
		return metadata.View{}, err
	}
	saved := metadata.ViewRecord{}
	err = metadata.ErrNotFound
	if view.ID != "" {
		saved, err = tables.View.Update(ctx, view.ID, values)
	}
	if errors.Is(err, metadata.ErrNotFound) {
		saved, err = tables.View.Insert(ctx, values)
	}
	if err != nil {
		return metadata.View{}, err
	}
	if err := tables.replaceChildren(ctx, saved.ID, view); err != nil {
		return metadata.View{}, err
	}
	if err := tx.Commit(ctx); err != nil {
		return metadata.View{}, fmt.Errorf("commit save view: %w", err)
	}
	record, err := v.Get(ctx, saved.ID)
	return record.View, err
}

func (v *Views) DeleteView(ctx context.Context, id string) error {
	_, err := v.View.Destroy(ctx, id)
	return err
}

func (t viewTables) replaceChildren(ctx context.Context, viewID string, view metadata.View) error {
	for _, table := range []string{`core."viewField"`, `core."viewFilter"`, `core."viewFilterGroup"`, `core."viewSort"`, `core."viewGroup"`} {
		if _, err := t.db.Exec(ctx, `DELETE FROM `+table+` WHERE "viewId" = $1::uuid`, viewID); err != nil {
			return fmt.Errorf("clear %s: %w", table, err)
		}
	}
	for _, group := range view.FilterGroups {
		if err := insertChild(ctx, t.FilterGroups, viewID, group); err != nil {
			return err
		}
	}
	for _, field := range view.Fields {
		if err := insertChild(ctx, t.Fields, viewID, field); err != nil {
			return err
		}
	}
	for _, filter := range view.Filters {
		if err := insertChild(ctx, t.Filters, viewID, filter); err != nil {
			return err
		}
	}
	for _, sort := range view.Sorts {
		if err := insertChild(ctx, t.Sorts, viewID, sort); err != nil {
			return err
		}
	}
	for _, group := range view.Groups {
		if err := insertChild(ctx, t.Groups, viewID, group); err != nil {
			return err
		}
	}
	return nil
}

func insertChild[TRow any](ctx context.Context, rows Rows[TRow], viewID string, child any) error {
	values, err := columnsOf(child, rows.writable)
	if err != nil {
		return err
	}
	values["viewId"] = viewID
	_, err = rows.Insert(ctx, values)
	return err
}

func columnsOf(value any, writable []string) (map[string]any, error) {
	encoded, err := json.Marshal(value)
	if err != nil {
		return nil, fmt.Errorf("encode view: %w", err)
	}
	var fields map[string]any
	if err := json.Unmarshal(encoded, &fields); err != nil {
		return nil, fmt.Errorf("decode view: %w", err)
	}
	values := map[string]any{}
	for key, field := range fields {
		index := slices.IndexFunc(writable, func(column string) bool { return strings.EqualFold(key, column) })
		if index < 0 {
			continue
		}
		if text, isText := field.(string); isText && text == "" && key != "Name" {
			continue
		}
		values[writable[index]] = field
	}
	return values, nil
}

func (v *Views) load(ctx context.Context, statement string, args ...any) ([]metadata.ViewRecord, error) {
	views, err := many[metadata.ViewRecord](ctx, v.db, statement, args...)
	if err != nil || len(views) == 0 {
		return views, err
	}
	ids := make([]string, len(views))
	for i, view := range views {
		ids[i] = view.ID
	}
	fields, err := children[metadata.ViewField](ctx, v.db, "viewField", `"position", "createdAt", id`, ids)
	if err != nil {
		return nil, err
	}
	filters, err := children[metadata.ViewFilter](ctx, v.db, "viewFilter", `"createdAt", id`, ids)
	if err != nil {
		return nil, err
	}
	filterGroups, err := children[metadata.ViewFilterGroup](ctx, v.db, "viewFilterGroup", `"createdAt", id`, ids)
	if err != nil {
		return nil, err
	}
	sorts, err := children[metadata.ViewSort](ctx, v.db, "viewSort", `"createdAt", id`, ids)
	if err != nil {
		return nil, err
	}
	groups, err := children[metadata.ViewGroup](ctx, v.db, "viewGroup", `"position", "createdAt", id`, ids)
	if err != nil {
		return nil, err
	}
	fieldGroups, err := children[metadata.ViewFieldGroup](ctx, v.db, "viewFieldGroup", `"position", "createdAt", id`, ids)
	if err != nil {
		return nil, err
	}
	for i := range views {
		view := &views[i]
		view.Fields = matching(fields, func(f metadata.ViewField) bool { return f.ViewID == view.ID })
		view.Filters = matching(filters, func(f metadata.ViewFilter) bool { return f.ViewID == view.ID })
		view.FilterGroups = matching(filterGroups, func(g metadata.ViewFilterGroup) bool { return g.ViewID == view.ID })
		view.Sorts = matching(sorts, func(s metadata.ViewSort) bool { return s.ViewID == view.ID })
		view.Groups = matching(groups, func(g metadata.ViewGroup) bool { return g.ViewID == view.ID })
		view.FieldGroups = matching(fieldGroups, func(g metadata.ViewFieldGroup) bool { return g.ViewID == view.ID })
		for j := range view.FieldGroups {
			group := &view.FieldGroups[j]
			group.ViewFields = matching(view.Fields, func(f metadata.ViewField) bool { return f.ViewFieldGroupID != nil && *f.ViewFieldGroupID == group.ID })
		}
	}
	return views, nil
}

func children[TRow any](ctx context.Context, db querier, table, order string, viewIDs []string) ([]TRow, error) {
	return many[TRow](ctx, db, fmt.Sprintf(`SELECT to_jsonb(t) FROM core."%s" t WHERE t."viewId"::text = ANY($1::text[]) AND t."deletedAt" IS NULL ORDER BY %s`, table, order), viewIDs)
}

func matching[TRow any](rows []TRow, keep func(TRow) bool) []TRow {
	kept := []TRow{}
	for _, row := range rows {
		if keep(row) {
			kept = append(kept, row)
		}
	}
	return kept
}
