package store

import (
	"bytes"
	"cmp"
	"context"
	"encoding/json"
	"fmt"
	"maps"
	"slices"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/twentyhq/twenty/packages/twenty-server-go/internal/metadata"
	"github.com/twentyhq/twenty/packages/twenty-server-go/internal/workspace"
)

const FlagLayouts = "LAYOUTS"

type GridPosition struct {
	Row        float64 `json:"row"`
	Column     float64 `json:"column"`
	RowSpan    float64 `json:"rowSpan"`
	ColumnSpan float64 `json:"columnSpan"`
}

type Widget struct {
	ID                                string              `json:"id"`
	ApplicationID                     string              `json:"applicationId"`
	ApplicationUniversalIdentifier    string              `json:"applicationUniversalIdentifier"`
	UniversalIdentifier               string              `json:"universalIdentifier"`
	IsSystemSideEffect                bool                `json:"isSystemSideEffect"`
	PageLayoutTabID                   string              `json:"pageLayoutTabId"`
	Title                             string              `json:"title"`
	Type                              string              `json:"type"`
	ObjectMetadataID                  *string             `json:"objectMetadataId"`
	GridPosition                      *GridPosition       `json:"gridPosition"`
	Position                          json.RawMessage     `json:"position"`
	Configuration                     json.RawMessage     `json:"configuration"`
	ConditionalDisplay                any                 `json:"conditionalDisplay"`
	ConditionalAvailabilityExpression *string             `json:"conditionalAvailabilityExpression"`
	CreatedAt                         metadata.Timestamp  `json:"createdAt"`
	UpdatedAt                         metadata.Timestamp  `json:"updatedAt"`
	DeletedAt                         *metadata.Timestamp `json:"deletedAt"`
	IsActive                          bool                `json:"isActive"`
	Overrides                         json.RawMessage     `json:"overrides"`
}

type Tab struct {
	ID                             string             `json:"id"`
	ApplicationID                  string             `json:"applicationId"`
	ApplicationUniversalIdentifier string             `json:"applicationUniversalIdentifier"`
	UniversalIdentifier            string             `json:"universalIdentifier"`
	IsSystemSideEffect             bool               `json:"isSystemSideEffect"`
	Title                          string             `json:"title"`
	Icon                           *string            `json:"icon"`
	Position                       float64            `json:"position"`
	LayoutMode                     string             `json:"layoutMode"`
	PageLayoutID                   string             `json:"pageLayoutId"`
	IsActive                       bool               `json:"isActive"`
	CreatedAt                      metadata.Timestamp `json:"createdAt"`
	UpdatedAt                      metadata.Timestamp `json:"updatedAt"`
	Overrides                      json.RawMessage    `json:"overrides"`
	Widgets                        []Widget           `json:"-"`
}

type PageLayout struct {
	ID                                      string             `json:"id"`
	ApplicationID                           string             `json:"applicationId"`
	UniversalIdentifier                     string             `json:"universalIdentifier"`
	Name                                    string             `json:"name"`
	Type                                    string             `json:"type"`
	ObjectMetadataID                        *string            `json:"objectMetadataId"`
	DefaultTabToFocusOnMobileAndSidePanelID *string            `json:"defaultTabToFocusOnMobileAndSidePanelId"`
	IsSystemSideEffect                      bool               `json:"isSystemSideEffect"`
	IsFirstTabPinned                        bool               `json:"isFirstTabPinned"`
	CreatedAt                               metadata.Timestamp `json:"createdAt"`
	UpdatedAt                               metadata.Timestamp `json:"updatedAt"`
	Tabs                                    []Tab              `json:"-"`
}

type PageLayouts struct {
	pool *pgxpool.Pool
}

func NewPageLayouts(pool *pgxpool.Pool) *PageLayouts {
	return &PageLayouts{pool: pool}
}

type querier interface {
	Query(ctx context.Context, sql string, args ...any) (pgx.Rows, error)
}

func collect[TRow any](ctx context.Context, db querier, statement string, args ...any) ([]TRow, error) {
	rows, err := db.Query(ctx, statement, args...)
	if err != nil {
		return nil, fmt.Errorf("query page layout rows: %w", err)
	}
	documents, err := pgx.CollectRows(rows, pgx.RowTo[[]byte])
	if err != nil {
		return nil, fmt.Errorf("read page layout rows: %w", err)
	}
	decoded := make([]TRow, len(documents))
	for i, document := range documents {
		if err := json.Unmarshal(document, &decoded[i]); err != nil {
			return nil, fmt.Errorf("decode page layout row: %w", err)
		}
	}
	return decoded, nil
}

const withApplication = ` || jsonb_build_object('applicationUniversalIdentifier', a."universalIdentifier") FROM %s t JOIN core.application a ON a.id = t."applicationId" WHERE t."workspaceId" = $1::uuid AND t."deletedAt" IS NULL`

// List returns the workspace's live layouts with their tabs and widgets, filtered by object and type when given.
func (p *PageLayouts) List(ctx context.Context, objectMetadataID, layoutType string) ([]PageLayout, error) {
	layouts, err := collect[PageLayout](ctx, p.pool, `SELECT to_jsonb(t) FROM core."pageLayout" t
		WHERE t."workspaceId" = $1::uuid AND t."deletedAt" IS NULL
			AND ($2 = '' OR t."objectMetadataId" = NULLIF($2, '')::uuid) AND ($3 = '' OR t.type::text = $3)
		ORDER BY t."createdAt", t.id`, workspace.PinnedWorkspaceID, objectMetadataID, layoutType)
	if err != nil {
		return nil, err
	}
	return p.assemble(ctx, layouts)
}

// Get returns one live layout with its tabs and widgets.
func (p *PageLayouts) Get(ctx context.Context, id string) (PageLayout, error) {
	layouts, err := collect[PageLayout](ctx, p.pool, `SELECT to_jsonb(t) FROM core."pageLayout" t
		WHERE t."workspaceId" = $1::uuid AND t."deletedAt" IS NULL AND t.id::text = $2`, workspace.PinnedWorkspaceID, id)
	if err != nil {
		return PageLayout{}, err
	}
	if len(layouts) == 0 {
		return PageLayout{}, metadata.ErrNotFound
	}
	assembled, err := p.assemble(ctx, layouts)
	if err != nil {
		return PageLayout{}, err
	}
	return assembled[0], nil
}

func (p *PageLayouts) assemble(ctx context.Context, layouts []PageLayout) ([]PageLayout, error) {
	custom, err := p.customApplicationUID(ctx, p.pool)
	if err != nil {
		return nil, err
	}
	tabs, err := collect[Tab](ctx, p.pool, `SELECT to_jsonb(t)`+fmt.Sprintf(withApplication, `core."pageLayoutTab"`), workspace.PinnedWorkspaceID)
	if err != nil {
		return nil, err
	}
	widgets, err := collect[Widget](ctx, p.pool, `SELECT to_jsonb(t)`+fmt.Sprintf(withApplication, `core."pageLayoutWidget"`), workspace.PinnedWorkspaceID)
	if err != nil {
		return nil, err
	}
	slices.SortFunc(widgets, func(a, b Widget) int {
		return cmp.Or(cmp.Compare(a.CreatedAt.UnixNano(), b.CreatedAt.UnixNano()), cmp.Compare(a.ID, b.ID))
	})
	slices.SortStableFunc(tabs, func(a, b Tab) int {
		return cmp.Or(cmp.Compare(a.Position, b.Position), cmp.Compare(a.ID, b.ID))
	})

	effectiveWidgets := make([]Widget, len(widgets))
	for i, widget := range widgets {
		effectiveWidgets[i] = widget.effective(custom)
	}
	for i := range layouts {
		for _, tab := range tabs {
			if tab.PageLayoutID != layouts[i].ID {
				continue
			}
			for _, widget := range effectiveWidgets {
				if widget.PageLayoutTabID == tab.ID {
					tab.Widgets = append(tab.Widgets, widget)
				}
			}
			layouts[i].Tabs = append(layouts[i].Tabs, tab.effective(custom))
		}
	}
	return layouts, nil
}

func (w Widget) effective(customApplicationUID string) Widget {
	overrides := parseOverrides("pageLayoutWidget", w.Overrides, customApplicationUID)
	owner := w.ApplicationUniversalIdentifier
	override(overrides, owner, "isActive", &w.IsActive)
	override(overrides, owner, "title", &w.Title)
	override(overrides, owner, "pageLayoutTabId", &w.PageLayoutTabID)
	override(overrides, owner, "conditionalAvailabilityExpression", &w.ConditionalAvailabilityExpression)
	override(overrides, owner, "conditionalDisplay", &w.ConditionalDisplay)
	if value, ok := overrides.effective(owner, "position"); ok {
		w.Position = value
	}
	return w
}

func (t Tab) effective(customApplicationUID string) Tab {
	overrides := parseOverrides("pageLayoutTab", t.Overrides, customApplicationUID)
	owner := t.ApplicationUniversalIdentifier
	override(overrides, owner, "isActive", &t.IsActive)
	override(overrides, owner, "title", &t.Title)
	override(overrides, owner, "icon", &t.Icon)
	override(overrides, owner, "position", &t.Position)
	return t
}

func override[TValue any](overrides authoredOverrides, owner, property string, target *TValue) {
	if value, ok := overrides.effective(owner, property); ok {
		var decoded TValue
		if json.Unmarshal(value, &decoded) == nil {
			*target = decoded
		}
	}
}

func (p *PageLayouts) customApplicationUID(ctx context.Context, db interface {
	QueryRow(ctx context.Context, sql string, args ...any) pgx.Row
}) (string, error) {
	var uid string
	err := db.QueryRow(ctx, `SELECT a."universalIdentifier"::text FROM core.workspace w JOIN core.application a ON a.id = w."workspaceCustomApplicationId" WHERE w.id = $1::uuid`,
		workspace.PinnedWorkspaceID).Scan(&uid)
	if err != nil {
		return "", fmt.Errorf("read workspace custom application: %w", err)
	}
	return uid, nil
}

// SetWidgetActive shows or hides a widget. Widgets the workspace does not own outright are
// hidden through a workspace override and keep their own column.
func (p *PageLayouts) SetWidgetActive(ctx context.Context, id string, isActive bool) (Widget, error) {
	tx, err := p.pool.Begin(ctx)
	if err != nil {
		return Widget{}, fmt.Errorf("begin set widget active: %w", err)
	}
	defer func() { _ = tx.Rollback(ctx) }()

	custom, err := p.customApplicationUID(ctx, tx)
	if err != nil {
		return Widget{}, err
	}
	widgets, err := collect[Widget](ctx, tx, `SELECT to_jsonb(t)`+fmt.Sprintf(withApplication, `core."pageLayoutWidget"`)+` AND t.id::text = $2 FOR UPDATE OF t`, workspace.PinnedWorkspaceID, id)
	if err != nil {
		return Widget{}, err
	}
	if len(widgets) == 0 {
		return Widget{}, metadata.ErrNotFound
	}
	widget := widgets[0]

	overriding := widget.ApplicationUniversalIdentifier != custom || widget.IsSystemSideEffect
	if overriding {
		next, err := widget.hide(custom, isActive)
		if err != nil {
			return Widget{}, err
		}
		_, err = tx.Exec(ctx, `UPDATE core."pageLayoutWidget" SET overrides = $2::jsonb, "updatedAt" = now() WHERE id = $1::uuid`, widget.ID, next)
		if err != nil {
			return Widget{}, fmt.Errorf("update widget overrides: %w", err)
		}
	} else if _, err := tx.Exec(ctx, `UPDATE core."pageLayoutWidget" SET "isActive" = $2, "updatedAt" = now() WHERE id = $1::uuid`, widget.ID, isActive); err != nil {
		return Widget{}, fmt.Errorf("update widget: %w", err)
	}
	_, err = tx.Exec(ctx, fmt.Sprintf(`UPDATE %s."dashboard" SET "updatedAt" = now() WHERE "pageLayoutId" = (
		SELECT l.id FROM core."pageLayoutTab" t JOIN core."pageLayout" l ON l.id = t."pageLayoutId" WHERE t.id = $1::uuid AND l.type = 'DASHBOARD')`, pgx.Identifier{workspace.SchemaName()}.Sanitize()), widget.PageLayoutTabID)
	if err != nil {
		return Widget{}, fmt.Errorf("touch linked dashboards: %w", err)
	}

	updated, err := collect[Widget](ctx, tx, `SELECT to_jsonb(t)`+fmt.Sprintf(withApplication, `core."pageLayoutWidget"`)+` AND t.id::text = $2`, workspace.PinnedWorkspaceID, id)
	if err != nil {
		return Widget{}, err
	}
	if err := tx.Commit(ctx); err != nil {
		return Widget{}, fmt.Errorf("commit set widget active: %w", err)
	}
	return updated[0].effective(custom), nil
}

// hide returns the widget's next overrides column: the workspace entry carries isActive only
// while it differs from what sits beneath it.
func (w Widget) hide(customApplicationUID string, isActive bool) (any, error) {
	overrides := parseOverrides("pageLayoutWidget", w.Overrides, customApplicationUID)
	if overrides == nil {
		overrides = authoredOverrides{}
	}
	entry := maps.Clone(overrides[customApplicationUID])
	if entry == nil {
		entry = map[string]json.RawMessage{}
	}
	beneath := json.RawMessage(fmt.Sprint(w.IsActive))
	if w.ApplicationUniversalIdentifier != customApplicationUID {
		if value, ok := overrides[w.ApplicationUniversalIdentifier]["isActive"]; ok {
			beneath = value
		}
	}
	wanted := json.RawMessage(fmt.Sprint(isActive))
	if bytes.Equal(bytes.TrimSpace(beneath), wanted) {
		delete(entry, "isActive")
	} else {
		entry["isActive"] = wanted
	}
	if len(entry) == 0 {
		delete(overrides, customApplicationUID)
	} else {
		overrides[customApplicationUID] = entry
	}
	if len(overrides) == 0 {
		return nil, nil
	}
	encoded, err := json.Marshal(overrides)
	if err != nil {
		return nil, fmt.Errorf("encode widget overrides: %w", err)
	}
	return string(encoded), nil
}
