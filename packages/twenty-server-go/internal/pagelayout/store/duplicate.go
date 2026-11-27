package store

import (
	"context"
	"errors"
	"fmt"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"

	"github.com/twentyhq/twenty/packages/twenty-server-go/internal/workspace"
)

type DuplicatedDashboard struct {
	ID, Title            string
	PageLayoutID         string
	Position             float64
	CreatedAt, UpdatedAt time.Time
}

const copySuffix = "(Copy)"

func appendCopySuffix(title string) string {
	if title == "" || strings.HasSuffix(strings.ToLower(title), strings.ToLower(copySuffix)) {
		return title
	}
	return title + " " + copySuffix
}

func (s *Store) DuplicateDashboard(ctx context.Context, workspaceID, dashboardID, workspaceMemberID string) (DuplicatedDashboard, error) {
	if _, err := uuid.Parse(dashboardID); err != nil {
		return DuplicatedDashboard{}, notFound("Dashboard", dashboardID)
	}
	var duplicated DuplicatedDashboard
	err := pgx.BeginFunc(ctx, s.pool, func(tx pgx.Tx) error {
		var (
			title    *string
			layoutID *string
			position float64
		)
		err := tx.QueryRow(ctx, `SELECT title, "pageLayoutId"::text, "position" FROM `+workspace.SchemaName()+`.dashboard
			WHERE id = $1::uuid AND "deletedAt" IS NULL`, dashboardID).Scan(&title, &layoutID, &position)
		if errors.Is(err, pgx.ErrNoRows) {
			return notFound("Dashboard", dashboardID)
		}
		if err != nil {
			return fmt.Errorf("load dashboard: %w", err)
		}
		if layoutID == nil {
			return notFoundError{message: fmt.Sprintf("Page layout for dashboard %q not found", dashboardID)}
		}
		custom, err := customApplication(ctx, tx, workspaceID)
		if err != nil {
			return err
		}
		newLayoutID, err := copyLayout(ctx, tx, workspaceID, *layoutID, custom)
		if err != nil {
			return err
		}
		copiedTitle := ""
		if title != nil {
			copiedTitle = appendCopySuffix(*title)
		}
		var memberID *string
		if workspaceMemberID != "" {
			memberID = &workspaceMemberID
		}
		duplicated = DuplicatedDashboard{PageLayoutID: newLayoutID, Position: position}
		err = tx.QueryRow(ctx, `INSERT INTO `+workspace.SchemaName()+`.dashboard (title, "position", "pageLayoutId", "createdBySource", "createdByWorkspaceMemberId",
				"updatedBySource", "updatedByWorkspaceMemberId")
			VALUES ($1, $2, $3::uuid, 'MANUAL', $4::uuid, 'MANUAL', $4::uuid)
			RETURNING id::text, COALESCE(title, ''), "createdAt", "updatedAt"`, copiedTitle, position, newLayoutID, memberID).
			Scan(&duplicated.ID, &duplicated.Title, &duplicated.CreatedAt, &duplicated.UpdatedAt)
		if err != nil {
			return fmt.Errorf("create duplicated dashboard: %w", err)
		}
		return nil
	})
	return duplicated, err
}

func copyLayout(ctx context.Context, tx pgx.Tx, workspaceID, layoutID string, custom application) (string, error) {
	newLayoutID := uuid.NewString()
	tag, err := tx.Exec(ctx, `INSERT INTO core."pageLayout" (id, name, "workspaceId", type, "objectMetadataId", "universalIdentifier", "applicationId")
		SELECT $3::uuid, name, "workspaceId", type, "objectMetadataId", $3::uuid, $4::uuid FROM core."pageLayout"
		WHERE id = $1::uuid AND "workspaceId" = $2::uuid AND "deletedAt" IS NULL`, layoutID, workspaceID, newLayoutID, custom.id)
	if err != nil {
		return "", fmt.Errorf("copy page layout: %w", err)
	}
	if tag.RowsAffected() == 0 {
		return "", notFound("Page layout", layoutID)
	}
	rows, err := tx.Query(ctx, `SELECT id::text FROM core."pageLayoutTab"
		WHERE "pageLayoutId" = $1::uuid AND "workspaceId" = $2::uuid AND "deletedAt" IS NULL ORDER BY "position", "createdAt", id`, layoutID, workspaceID)
	if err != nil {
		return "", fmt.Errorf("query page layout tabs: %w", err)
	}
	tabIDs, err := pgx.CollectRows(rows, pgx.RowTo[string])
	if err != nil {
		return "", fmt.Errorf("scan page layout tabs: %w", err)
	}
	for _, tabID := range tabIDs {
		newTabID := uuid.NewString()
		if _, err := tx.Exec(ctx, `INSERT INTO core."pageLayoutTab" (id, title, "position", "pageLayoutId", "workspaceId", "universalIdentifier", "applicationId")
			SELECT $3::uuid, title, "position", $4::uuid, "workspaceId", $3::uuid, $5::uuid FROM core."pageLayoutTab" WHERE id = $1::uuid AND "workspaceId" = $2::uuid`,
			tabID, workspaceID, newTabID, newLayoutID, custom.id); err != nil {
			return "", fmt.Errorf("copy page layout tab: %w", err)
		}
		if _, err := tx.Exec(ctx, `INSERT INTO core."pageLayoutWidget" (id, "pageLayoutTabId", "workspaceId", title, type, "objectMetadataId", "gridPosition",
				configuration, "position", "universalIdentifier", "applicationId", "createdAt", "updatedAt")
			SELECT s.new_id, $3::uuid, s."workspaceId", s.title, s.type, s."objectMetadataId",
				CASE WHEN s."position"->>'layoutMode' = 'GRID'
					THEN jsonb_build_object('row', s."position"->'row', 'column', s."position"->'column', 'rowSpan', s."position"->'rowSpan', 'columnSpan', s."position"->'columnSpan')
					ELSE '{"row":0,"column":0,"rowSpan":1,"columnSpan":12}'::jsonb END,
				s.configuration, s."position", s.new_id, $4::uuid,
				clock_timestamp() + s.rn * interval '1 microsecond', clock_timestamp() + s.rn * interval '1 microsecond'
			FROM (SELECT gen_random_uuid() AS new_id, row_number() OVER (ORDER BY w."createdAt", w.id) AS rn, w.* FROM core."pageLayoutWidget" w
				WHERE w."pageLayoutTabId" = $1::uuid AND w."workspaceId" = $2::uuid AND w."deletedAt" IS NULL) s`,
			tabID, workspaceID, newTabID, custom.id); err != nil {
			return "", fmt.Errorf("copy page layout widgets: %w", err)
		}
	}
	return newLayoutID, nil
}
