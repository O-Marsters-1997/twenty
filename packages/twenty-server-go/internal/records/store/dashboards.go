package store

import (
	"context"
	"errors"
	"fmt"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/twentyhq/twenty/packages/twenty-server-go/internal/records"
	"github.com/twentyhq/twenty/packages/twenty-server-go/internal/records/store/db"
)

const dashboardColumns = `"id", "createdAt", "updatedAt", "deletedAt", "title", "position", "pageLayoutId", "createdBySource", "createdByWorkspaceMemberId", "createdByName", "createdByContext", "updatedBySource", "updatedByWorkspaceMemberId", "updatedByName", "updatedByContext", "searchVector"`

type dashboardRow = db.Workspace2abogkkt2zd45pa9aun09djpfDashboard

type Dashboards struct {
	*recordTable[records.Dashboard]
	queries *db.Queries
}

var _ records.Dashboards = (*Dashboards)(nil)

func NewDashboards(pool *pgxpool.Pool) *Dashboards {
	scan := func(row pgx.Row) (records.Dashboard, error) {
		scanned, err := scanDashboard(row)
		return toDashboard(scanned), err
	}
	return &Dashboards{
		recordTable: newRecordTable(pool, "dashboard", dashboardColumns, scan, func(dashboard records.Dashboard) string { return dashboard.ID }),
		queries:     db.New(pool),
	}
}

func (d *Dashboards) Get(ctx context.Context, id string) (records.Dashboard, error) {
	uuid, err := parseUUID(id)
	if err != nil {
		return records.Dashboard{}, err
	}
	row, err := d.queries.GetDashboard(ctx, uuid)
	if errors.Is(err, pgx.ErrNoRows) {
		return records.Dashboard{}, records.ErrNotFound
	}
	if err != nil {
		return records.Dashboard{}, fmt.Errorf("get dashboard: %w", err)
	}
	return toDashboard(row), nil
}

func (d *Dashboards) Create(ctx context.Context, actor records.Actor, input records.DashboardInput) (records.Dashboard, error) {
	var position float64
	if err := d.pool.QueryRow(ctx, `SELECT COALESCE(MIN("position") - 1, 0) FROM `+d.table).Scan(&position); err != nil {
		return records.Dashboard{}, fmt.Errorf("compute position: %w", err)
	}
	merged, err := mergeDashboard(dashboardRow{}, input)
	if err != nil {
		return records.Dashboard{}, err
	}
	memberID, err := optionalUUID(actor.WorkspaceMemberID)
	if err != nil {
		return records.Dashboard{}, err
	}
	row, err := d.queries.CreateDashboard(ctx, db.CreateDashboardParams{
		Title: merged.Title, Position: position, PageLayoutId: merged.PageLayoutId,
		CreatedBySource:            db.Workspace2abogkkt2zd45pa9aun09djpfDashboardCreatedBySourceEnum(actor.Source),
		CreatedByWorkspaceMemberId: memberID, CreatedByName: actor.Name,
		UpdatedBySource:            db.Workspace2abogkkt2zd45pa9aun09djpfDashboardUpdatedBySourceEnum(actor.Source),
		UpdatedByWorkspaceMemberId: memberID, UpdatedByName: actor.Name,
	})
	if err != nil {
		return records.Dashboard{}, fmt.Errorf("create dashboard: %w", err)
	}
	return toDashboard(row), nil
}

func (d *Dashboards) Update(ctx context.Context, actor records.Actor, id string, input records.DashboardInput) (records.Dashboard, error) {
	uuid, err := parseUUID(id)
	if err != nil {
		return records.Dashboard{}, err
	}
	tx, err := d.pool.Begin(ctx)
	if err != nil {
		return records.Dashboard{}, fmt.Errorf("begin update: %w", err)
	}
	defer func() { _ = tx.Rollback(ctx) }()

	current, err := scanDashboard(tx.QueryRow(ctx, `SELECT `+dashboardColumns+` FROM `+d.table+` WHERE "id" = $1 FOR UPDATE`, uuid))
	if errors.Is(err, pgx.ErrNoRows) {
		return records.Dashboard{}, records.ErrNotFound
	}
	if err != nil {
		return records.Dashboard{}, fmt.Errorf("load dashboard: %w", err)
	}
	merged, err := mergeDashboard(current, input)
	if err != nil {
		return records.Dashboard{}, err
	}
	memberID, err := optionalUUID(actor.WorkspaceMemberID)
	if err != nil {
		return records.Dashboard{}, err
	}
	row, err := d.queries.WithTx(tx).UpdateDashboard(ctx, db.UpdateDashboardParams{
		Title: merged.Title, Position: current.Position, PageLayoutId: merged.PageLayoutId,
		UpdatedBySource:            db.Workspace2abogkkt2zd45pa9aun09djpfDashboardUpdatedBySourceEnum(actor.Source),
		UpdatedByWorkspaceMemberId: memberID, UpdatedByName: actor.Name, UpdatedByContext: current.UpdatedByContext, ID: uuid,
	})
	if err != nil {
		return records.Dashboard{}, fmt.Errorf("update dashboard: %w", err)
	}
	if err := tx.Commit(ctx); err != nil {
		return records.Dashboard{}, fmt.Errorf("commit update: %w", err)
	}
	return toDashboard(row), nil
}

func (d *Dashboards) SoftDelete(ctx context.Context, id string) error {
	return affect(ctx, id, "dashboard", d.queries.SoftDeleteDashboard)
}

func (d *Dashboards) Restore(ctx context.Context, id string) error {
	return affect(ctx, id, "dashboard", d.queries.RestoreDashboard)
}

func (d *Dashboards) Destroy(ctx context.Context, id string) error {
	return affect(ctx, id, "dashboard", d.queries.DestroyDashboard)
}

func scanDashboard(row pgx.Row) (dashboardRow, error) {
	var i dashboardRow
	err := row.Scan(&i.ID, &i.CreatedAt, &i.UpdatedAt, &i.DeletedAt, &i.Title, &i.Position, &i.PageLayoutId, &i.CreatedBySource,
		&i.CreatedByWorkspaceMemberId, &i.CreatedByName, &i.CreatedByContext, &i.UpdatedBySource, &i.UpdatedByWorkspaceMemberId,
		&i.UpdatedByName, &i.UpdatedByContext, &i.SearchVector)
	return i, err
}

func mergeDashboard(base dashboardRow, input records.DashboardInput) (dashboardRow, error) {
	row := base
	if input.Title != nil {
		row.Title = text(*input.Title)
	}
	if input.PageLayoutID != nil {
		var err error
		if row.PageLayoutId, err = optionalUUID(*input.PageLayoutID); err != nil {
			return row, err
		}
	}
	return row, nil
}

func toDashboard(row dashboardRow) records.Dashboard {
	dashboard := records.Dashboard{
		ID:        row.ID.String(),
		Title:     row.Title.String,
		Position:  row.Position,
		CreatedBy: records.Actor{Source: string(row.CreatedBySource), WorkspaceMemberID: uuidString(row.CreatedByWorkspaceMemberId), Name: row.CreatedByName},
		UpdatedBy: records.Actor{Source: string(row.UpdatedBySource), WorkspaceMemberID: uuidString(row.UpdatedByWorkspaceMemberId), Name: row.UpdatedByName},
		CreatedAt: row.CreatedAt.Time,
		UpdatedAt: row.UpdatedAt.Time,
	}
	if row.PageLayoutId.Valid {
		id := row.PageLayoutId.String()
		dashboard.PageLayoutID = &id
	}
	if row.DeletedAt.Valid {
		dashboard.DeletedAt = &row.DeletedAt.Time
	}
	return dashboard
}
