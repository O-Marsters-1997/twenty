package store

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"slices"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/twentyhq/twenty/packages/twenty-server-go/internal/workspace"
)

var (
	ErrNotFound         = errors.New("page layout entity not found")
	ErrPermissionDenied = errors.New("entity performing the request does not have permission")
)

type notFoundError struct{ message string }

func (e notFoundError) Error() string { return e.message }

func (notFoundError) Is(target error) bool { return target == ErrNotFound }

func notFound(kind, id string) error {
	return notFoundError{message: fmt.Sprintf("%s with ID %q not found", kind, id)}
}

type Layout struct {
	ID, Name, Type, ApplicationID, UniversalIdentifier string
	ObjectMetadataID, DefaultTabID                     *string
	IsSystemSideEffect, IsFirstTabPinned               bool
	CreatedAt, UpdatedAt                               time.Time
	Tabs                                               []Tab
}

type Tab struct {
	ID, Title, PageLayoutID, ApplicationID, UniversalIdentifier, LayoutMode string
	Icon                                                                    *string
	Position                                                                float64
	IsActive, IsSystemSideEffect                                            bool
	CreatedAt, UpdatedAt                                                    time.Time
	Widgets                                                                 []Widget
}

type Widget struct {
	ID, PageLayoutTabID, Title, Type, ApplicationID, UniversalIdentifier string
	ObjectMetadataID, ConditionalAvailabilityExpression                  *string
	GridPosition, Position, Configuration, ConditionalDisplay            json.RawMessage
	IsActive, IsSystemSideEffect                                         bool
	CreatedAt, UpdatedAt                                                 time.Time
}

type Store struct{ pool *pgxpool.Pool }

func New(pool *pgxpool.Pool) *Store { return &Store{pool: pool} }

func (s *Store) Layouts(ctx context.Context, workspaceID, layoutType, objectMetadataID string) ([]Layout, error) {
	rows, err := s.pool.Query(ctx,
		`SELECT id::text, name, type::text, "objectMetadataId"::text, "defaultTabToFocusOnMobileAndSidePanelId"::text,
		        "universalIdentifier"::text, "applicationId"::text, "isSystemSideEffect", "isFirstTabPinned", "createdAt", "updatedAt"
		 FROM core."pageLayout"
		 WHERE "workspaceId" = $1::uuid AND "deletedAt" IS NULL
		   AND ($2 = '' OR type::text = $2) AND ($3 = '' OR "objectMetadataId"::text = $3)
		 ORDER BY "createdAt", id`, workspaceID, layoutType, objectMetadataID)
	if err != nil {
		return nil, fmt.Errorf("query page layouts: %w", err)
	}
	layouts, err := pgx.CollectRows(rows, func(row pgx.CollectableRow) (Layout, error) {
		var layout Layout
		err := row.Scan(&layout.ID, &layout.Name, &layout.Type, &layout.ObjectMetadataID, &layout.DefaultTabID,
			&layout.UniversalIdentifier, &layout.ApplicationID, &layout.IsSystemSideEffect, &layout.IsFirstTabPinned,
			&layout.CreatedAt, &layout.UpdatedAt)
		return layout, err
	})
	if err != nil {
		return nil, fmt.Errorf("scan page layouts: %w", err)
	}
	tabs, err := s.tabs(ctx, workspaceID)
	if err != nil {
		return nil, err
	}
	widgets, err := s.widgets(ctx, workspaceID)
	if err != nil {
		return nil, err
	}
	for i := range layouts {
		for _, tab := range tabs {
			if tab.PageLayoutID != layouts[i].ID {
				continue
			}
			for _, widget := range widgets {
				if widget.PageLayoutTabID == tab.ID {
					tab.Widgets = append(tab.Widgets, widget)
				}
			}
			layouts[i].Tabs = append(layouts[i].Tabs, tab)
		}
	}
	return layouts, nil
}

func (s *Store) Layout(ctx context.Context, workspaceID, id string) (Layout, error) {
	if _, err := uuid.Parse(id); err != nil {
		return Layout{}, notFound("Page layout", id)
	}
	layouts, err := s.Layouts(ctx, workspaceID, "", "")
	if err != nil {
		return Layout{}, err
	}
	index := slices.IndexFunc(layouts, func(layout Layout) bool { return layout.ID == id })
	if index < 0 {
		return Layout{}, notFound("Page layout", id)
	}
	return layouts[index], nil
}

func (s *Store) tabs(ctx context.Context, workspaceID string) ([]Tab, error) {
	rows, err := s.pool.Query(ctx,
		`SELECT t.id::text, t.title, t."pageLayoutId"::text, t."applicationId"::text, t."universalIdentifier"::text,
		        t."layoutMode"::text, t.icon, t."position", t."isActive", t."isSystemSideEffect", t."createdAt", t."updatedAt",
		        t.overrides, a."universalIdentifier"::text
		 FROM core."pageLayoutTab" t JOIN core.application a ON a.id = t."applicationId"
		 WHERE t."workspaceId" = $1::uuid AND t."deletedAt" IS NULL
		 ORDER BY t."position", t."createdAt", t.id`, workspaceID)
	if err != nil {
		return nil, fmt.Errorf("query page layout tabs: %w", err)
	}
	tabs, err := pgx.CollectRows(rows, func(row pgx.CollectableRow) (Tab, error) {
		var (
			tab   Tab
			raw   []byte
			owner string
		)
		if err := row.Scan(&tab.ID, &tab.Title, &tab.PageLayoutID, &tab.ApplicationID, &tab.UniversalIdentifier,
			&tab.LayoutMode, &tab.Icon, &tab.Position, &tab.IsActive, &tab.IsSystemSideEffect, &tab.CreatedAt, &tab.UpdatedAt,
			&raw, &owner); err != nil {
			return tab, err
		}
		authored := parseAuthoredOrLegacyOverrides(raw, tabLegacyKeys, "")
		tab.Title = effectiveAs(authored, "title", owner, tab.Title)
		tab.Position = effectiveAs(authored, "position", owner, tab.Position)
		tab.Icon = effectiveAs(authored, "icon", owner, tab.Icon)
		tab.IsActive = effectiveAs(authored, "isActive", owner, tab.IsActive)
		return tab, nil
	})
	if err != nil {
		return nil, fmt.Errorf("scan page layout tabs: %w", err)
	}
	return tabs, nil
}

func (s *Store) widgets(ctx context.Context, workspaceID string) ([]Widget, error) {
	rows, err := s.pool.Query(ctx, widgetSelect+` WHERE w."workspaceId" = $1::uuid AND w."deletedAt" IS NULL
		ORDER BY w."createdAt", w.id`, workspaceID)
	if err != nil {
		return nil, fmt.Errorf("query page layout widgets: %w", err)
	}
	widgets, err := pgx.CollectRows(rows, scanWidget)
	if err != nil {
		return nil, fmt.Errorf("scan page layout widgets: %w", err)
	}
	return widgets, nil
}

const widgetSelect = `SELECT w.id::text, w."pageLayoutTabId"::text, w.title, w.type::text, w."applicationId"::text,
	w."universalIdentifier"::text, w."objectMetadataId"::text, w."conditionalAvailabilityExpression",
	w."gridPosition", w."position", w.configuration, w."conditionalDisplay", w."isActive", w."isSystemSideEffect",
	w."createdAt", w."updatedAt", w.overrides, a."universalIdentifier"::text
	FROM core."pageLayoutWidget" w JOIN core.application a ON a.id = w."applicationId"`

func scanWidget(row pgx.CollectableRow) (Widget, error) {
	var (
		widget Widget
		raw    []byte
		owner  string
	)
	if err := row.Scan(&widget.ID, &widget.PageLayoutTabID, &widget.Title, &widget.Type, &widget.ApplicationID,
		&widget.UniversalIdentifier, &widget.ObjectMetadataID, &widget.ConditionalAvailabilityExpression,
		&widget.GridPosition, &widget.Position, &widget.Configuration, &widget.ConditionalDisplay, &widget.IsActive,
		&widget.IsSystemSideEffect, &widget.CreatedAt, &widget.UpdatedAt, &raw, &owner); err != nil {
		return widget, err
	}
	authored := parseAuthoredOrLegacyOverrides(raw, widgetLegacyKeys, "")
	widget.Title = effectiveAs(authored, "title", owner, widget.Title)
	widget.PageLayoutTabID = effectiveAs(authored, "pageLayoutTabId", owner, widget.PageLayoutTabID)
	widget.Position = effectiveAs(authored, "position", owner, widget.Position)
	widget.ConditionalDisplay = effectiveAs(authored, "conditionalDisplay", owner, widget.ConditionalDisplay)
	widget.ConditionalAvailabilityExpression = effectiveAs(authored, "conditionalAvailabilityExpression", owner, widget.ConditionalAvailabilityExpression)
	widget.IsActive = effectiveAs(authored, "isActive", owner, widget.IsActive)
	return widget, nil
}

func (s *Store) HasLayoutsPermission(ctx context.Context, userWorkspaceID, apiKeyID string) (bool, error) {
	var granted bool
	err := s.pool.QueryRow(ctx,
		`SELECT COALESCE(bool_and(r."canUpdateAllSettings" OR EXISTS (
		     SELECT 1 FROM core."rolePermissionFlag" rpf JOIN core."permissionFlag" pf ON pf.id = rpf."permissionFlagId"
		     WHERE rpf."roleId" = r.id AND pf.key = 'LAYOUTS')), false)
		 FROM core."roleTarget" rt JOIN core.role r ON r.id = rt."roleId"
		 WHERE rt."workspaceId" = $1::uuid
		   AND (rt."userWorkspaceId" = NULLIF($2, '')::uuid OR rt."apiKeyId" = NULLIF($3, '')::uuid)`,
		workspace.PinnedWorkspaceID, userWorkspaceID, apiKeyID).Scan(&granted)
	if err != nil {
		return false, fmt.Errorf("look up layouts permission: %w", err)
	}
	return granted, nil
}

func (s *Store) SetWidgetIsActive(ctx context.Context, workspaceID, id string, isActive bool) (Widget, error) {
	if _, err := uuid.Parse(id); err != nil {
		return Widget{}, notFound("Page layout widget", id)
	}
	err := pgx.BeginFunc(ctx, s.pool, func(tx pgx.Tx) error {
		var (
			raw                                []byte
			columnIsActive, isSystemSideEffect bool
			owner, custom, tabID               string
		)
		err := tx.QueryRow(ctx,
			`SELECT w.overrides, w."isActive", w."isSystemSideEffect", a."universalIdentifier"::text, c."universalIdentifier"::text,
			        w."pageLayoutTabId"::text
			 FROM core."pageLayoutWidget" w
			 JOIN core.application a ON a.id = w."applicationId"
			 JOIN core.workspace ws ON ws.id = w."workspaceId"
			 JOIN core.application c ON c.id = ws."workspaceCustomApplicationId"
			 WHERE w.id = $1::uuid AND w."workspaceId" = $2::uuid AND w."deletedAt" IS NULL FOR UPDATE OF w`,
			id, workspaceID).Scan(&raw, &columnIsActive, &isSystemSideEffect, &owner, &custom, &tabID)
		if errors.Is(err, pgx.ErrNoRows) {
			return notFound("Page layout widget", id)
		}
		if err != nil {
			return fmt.Errorf("load page layout widget: %w", err)
		}
		if owner == custom && !isSystemSideEffect {
			_, err = tx.Exec(ctx, `UPDATE core."pageLayoutWidget" SET "isActive" = $2, "updatedAt" = now() WHERE id = $1::uuid`, id, isActive)
		} else {
			var encoded []byte
			next := parseAuthoredOrLegacyOverrides(raw, widgetLegacyKeys, custom).withIsActive(isActive, owner, custom, columnIsActive)
			if next != nil {
				if encoded, err = json.Marshal(next); err != nil {
					return fmt.Errorf("encode overrides: %w", err)
				}
			}
			_, err = tx.Exec(ctx, `UPDATE core."pageLayoutWidget" SET overrides = $2::jsonb, "updatedAt" = now() WHERE id = $1::uuid`, id, encoded)
		}
		if err != nil {
			return fmt.Errorf("update page layout widget: %w", err)
		}
		_, err = tx.Exec(ctx, `UPDATE `+workspace.SchemaName()+`.dashboard SET "updatedAt" = now()
			WHERE "pageLayoutId" = (SELECT "pageLayoutId" FROM core."pageLayoutTab" WHERE id = $1::uuid)`, tabID)
		if err != nil {
			return fmt.Errorf("touch linked dashboards: %w", err)
		}
		return nil
	})
	if err != nil {
		return Widget{}, err
	}
	rows, err := s.pool.Query(ctx, widgetSelect+` WHERE w.id = $1::uuid`, id)
	if err != nil {
		return Widget{}, fmt.Errorf("query page layout widget: %w", err)
	}
	widget, err := pgx.CollectExactlyOneRow(rows, scanWidget)
	if err != nil {
		return Widget{}, fmt.Errorf("scan page layout widget: %w", err)
	}
	return widget, nil
}
