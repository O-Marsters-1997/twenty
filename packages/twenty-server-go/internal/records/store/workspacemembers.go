package store

import (
	"context"
	"errors"
	"fmt"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgtype"
	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/twentyhq/twenty/packages/twenty-server-go/internal/records"
	"github.com/twentyhq/twenty/packages/twenty-server-go/internal/records/store/db"
)

const workspaceMemberColumns = `"id", "createdAt", "updatedAt", "deletedAt", "position", "nameFirstName", "nameLastName", "colorScheme", "uiScale", "openRecordIn", "locale", "avatarUrl", "userEmail", "jobTitle", "calendarStartDay", "userId", "timeZone", "dateFormat", "timeFormat", "numberFormat", "searchVector", "createdBySource", "createdByWorkspaceMemberId", "createdByName", "createdByContext", "updatedBySource", "updatedByWorkspaceMemberId", "updatedByName", "updatedByContext"`

type workspaceMemberRow = db.Workspace2abogkkt2zd45pa9aun09djpfWorkspaceMember

type WorkspaceMembers struct {
	*recordTable[records.WorkspaceMember]
	queries *db.Queries
}

var _ records.WorkspaceMembers = (*WorkspaceMembers)(nil)

func NewWorkspaceMembers(pool *pgxpool.Pool) *WorkspaceMembers {
	scan := func(row pgx.Row) (records.WorkspaceMember, error) {
		scanned, err := scanWorkspaceMember(row)
		return toWorkspaceMember(scanned), err
	}
	return &WorkspaceMembers{
		recordTable: newRecordTable(pool, "workspaceMember", workspaceMemberColumns, scan, func(member records.WorkspaceMember) string { return member.ID }),
		queries:     db.New(pool),
	}
}

func (m *WorkspaceMembers) Get(ctx context.Context, id string) (records.WorkspaceMember, error) {
	uuid, err := parseUUID(id)
	if err != nil {
		return records.WorkspaceMember{}, err
	}
	row, err := m.queries.GetWorkspaceMember(ctx, uuid)
	if errors.Is(err, pgx.ErrNoRows) {
		return records.WorkspaceMember{}, records.ErrNotFound
	}
	if err != nil {
		return records.WorkspaceMember{}, fmt.Errorf("get workspace member: %w", err)
	}
	return toWorkspaceMember(row), nil
}

func (m *WorkspaceMembers) Create(ctx context.Context, actor records.Actor, input records.WorkspaceMemberInput) (records.WorkspaceMember, error) {
	var position float64
	if err := m.pool.QueryRow(ctx, `SELECT COALESCE(MIN("position") - 1, 0) FROM `+m.table).Scan(&position); err != nil {
		return records.WorkspaceMember{}, fmt.Errorf("compute position: %w", err)
	}
	merged, err := mergeWorkspaceMember(workspaceMemberDefaults(), input)
	if err != nil {
		return records.WorkspaceMember{}, err
	}
	memberID, err := optionalUUID(actor.WorkspaceMemberID)
	if err != nil {
		return records.WorkspaceMember{}, err
	}
	row, err := m.queries.CreateWorkspaceMember(ctx, db.CreateWorkspaceMemberParams{
		Position: position, NameFirstName: merged.NameFirstName, NameLastName: merged.NameLastName,
		ColorScheme: merged.ColorScheme, UiScale: merged.UiScale, OpenRecordIn: merged.OpenRecordIn, Locale: merged.Locale,
		AvatarUrl: merged.AvatarUrl, UserEmail: merged.UserEmail, JobTitle: merged.JobTitle, CalendarStartDay: merged.CalendarStartDay,
		UserId: merged.UserId, TimeZone: merged.TimeZone, DateFormat: merged.DateFormat, TimeFormat: merged.TimeFormat, NumberFormat: merged.NumberFormat,
		CreatedBySource:            db.Workspace2abogkkt2zd45pa9aun09djpfWorkspaceMemberCreatedBySourceEnum(actor.Source),
		CreatedByWorkspaceMemberId: memberID, CreatedByName: actor.Name,
		UpdatedBySource:            db.Workspace2abogkkt2zd45pa9aun09djpfWorkspaceMemberUpdatedBySourceEnum(actor.Source),
		UpdatedByWorkspaceMemberId: memberID, UpdatedByName: actor.Name,
	})
	if err != nil {
		return records.WorkspaceMember{}, fmt.Errorf("create workspace member: %w", err)
	}
	return toWorkspaceMember(row), nil
}

func (m *WorkspaceMembers) Update(ctx context.Context, actor records.Actor, id string, input records.WorkspaceMemberInput) (records.WorkspaceMember, error) {
	uuid, err := parseUUID(id)
	if err != nil {
		return records.WorkspaceMember{}, err
	}
	tx, err := m.pool.Begin(ctx)
	if err != nil {
		return records.WorkspaceMember{}, fmt.Errorf("begin update: %w", err)
	}
	defer func() { _ = tx.Rollback(ctx) }()

	current, err := scanWorkspaceMember(tx.QueryRow(ctx, `SELECT `+workspaceMemberColumns+` FROM `+m.table+` WHERE "id" = $1 FOR UPDATE`, uuid))
	if errors.Is(err, pgx.ErrNoRows) {
		return records.WorkspaceMember{}, records.ErrNotFound
	}
	if err != nil {
		return records.WorkspaceMember{}, fmt.Errorf("load workspace member: %w", err)
	}
	merged, err := mergeWorkspaceMember(current, input)
	if err != nil {
		return records.WorkspaceMember{}, err
	}
	memberID, err := optionalUUID(actor.WorkspaceMemberID)
	if err != nil {
		return records.WorkspaceMember{}, err
	}
	row, err := m.queries.WithTx(tx).UpdateWorkspaceMember(ctx, db.UpdateWorkspaceMemberParams{
		Position: current.Position, NameFirstName: merged.NameFirstName, NameLastName: merged.NameLastName,
		ColorScheme: merged.ColorScheme, UiScale: merged.UiScale, OpenRecordIn: merged.OpenRecordIn, Locale: merged.Locale,
		AvatarUrl: merged.AvatarUrl, UserEmail: merged.UserEmail, JobTitle: merged.JobTitle, CalendarStartDay: merged.CalendarStartDay,
		UserId: merged.UserId, TimeZone: merged.TimeZone, DateFormat: merged.DateFormat, TimeFormat: merged.TimeFormat, NumberFormat: merged.NumberFormat,
		UpdatedBySource:            db.Workspace2abogkkt2zd45pa9aun09djpfWorkspaceMemberUpdatedBySourceEnum(actor.Source),
		UpdatedByWorkspaceMemberId: memberID, UpdatedByName: actor.Name, UpdatedByContext: current.UpdatedByContext, ID: uuid,
	})
	if err != nil {
		return records.WorkspaceMember{}, fmt.Errorf("update workspace member: %w", err)
	}
	if err := tx.Commit(ctx); err != nil {
		return records.WorkspaceMember{}, fmt.Errorf("commit update: %w", err)
	}
	return toWorkspaceMember(row), nil
}

func (m *WorkspaceMembers) SoftDelete(ctx context.Context, id string) error {
	return affect(ctx, id, "workspace member", m.queries.SoftDeleteWorkspaceMember)
}

func (m *WorkspaceMembers) Restore(ctx context.Context, id string) error {
	return affect(ctx, id, "workspace member", m.queries.RestoreWorkspaceMember)
}

func (m *WorkspaceMembers) Destroy(ctx context.Context, id string) error {
	return affect(ctx, id, "workspace member", m.queries.DestroyWorkspaceMember)
}

func scanWorkspaceMember(row pgx.Row) (workspaceMemberRow, error) {
	var i workspaceMemberRow
	err := row.Scan(&i.ID, &i.CreatedAt, &i.UpdatedAt, &i.DeletedAt, &i.Position, &i.NameFirstName, &i.NameLastName, &i.ColorScheme, &i.UiScale,
		&i.OpenRecordIn, &i.Locale, &i.AvatarUrl, &i.UserEmail, &i.JobTitle, &i.CalendarStartDay, &i.UserId, &i.TimeZone, &i.DateFormat,
		&i.TimeFormat, &i.NumberFormat, &i.SearchVector, &i.CreatedBySource, &i.CreatedByWorkspaceMemberId, &i.CreatedByName, &i.CreatedByContext,
		&i.UpdatedBySource, &i.UpdatedByWorkspaceMemberId, &i.UpdatedByName, &i.UpdatedByContext)
	return i, err
}

func workspaceMemberDefaults() workspaceMemberRow {
	return workspaceMemberRow{
		ColorScheme: "System", UiScale: "Default", OpenRecordIn: "SIDE_PANEL", Locale: "en", CalendarStartDay: 7, TimeZone: "system",
		DateFormat:   db.Workspace2abogkkt2zd45pa9aun09djpfWorkspaceMemberDateFormatEnumSYSTEM,
		TimeFormat:   db.Workspace2abogkkt2zd45pa9aun09djpfWorkspaceMemberTimeFormatEnumSYSTEM,
		NumberFormat: db.Workspace2abogkkt2zd45pa9aun09djpfWorkspaceMemberNumberFormatEnumSYSTEM,
	}
}

func mergeWorkspaceMember(base workspaceMemberRow, input records.WorkspaceMemberInput) (workspaceMemberRow, error) {
	row := base
	if input.Name != nil {
		row.NameFirstName, row.NameLastName = text(input.Name.FirstName), text(input.Name.LastName)
	}
	set := func(target *string, value *string) {
		if value != nil {
			*target = *value
		}
	}
	setText := func(target *pgtype.Text, value *string) {
		if value != nil {
			*target = text(*value)
		}
	}
	set(&row.ColorScheme, input.ColorScheme)
	set(&row.UiScale, input.UIScale)
	set(&row.OpenRecordIn, input.OpenRecordIn)
	set(&row.Locale, input.Locale)
	set(&row.TimeZone, input.TimeZone)
	setText(&row.AvatarUrl, input.AvatarURL)
	setText(&row.UserEmail, input.UserEmail)
	setText(&row.JobTitle, input.JobTitle)
	if input.CalendarStartDay != nil {
		row.CalendarStartDay = *input.CalendarStartDay
	}
	if input.UserID != nil {
		var err error
		if row.UserId, err = parseUUID(*input.UserID); err != nil {
			return row, err
		}
	}
	if input.DateFormat != nil {
		row.DateFormat = db.Workspace2abogkkt2zd45pa9aun09djpfWorkspaceMemberDateFormatEnum(*input.DateFormat)
	}
	if input.TimeFormat != nil {
		row.TimeFormat = db.Workspace2abogkkt2zd45pa9aun09djpfWorkspaceMemberTimeFormatEnum(*input.TimeFormat)
	}
	if input.NumberFormat != nil {
		row.NumberFormat = db.Workspace2abogkkt2zd45pa9aun09djpfWorkspaceMemberNumberFormatEnum(*input.NumberFormat)
	}
	return row, nil
}

func toWorkspaceMember(row workspaceMemberRow) records.WorkspaceMember {
	member := records.WorkspaceMember{
		ID:               row.ID.String(),
		Name:             records.FullName{FirstName: row.NameFirstName.String, LastName: row.NameLastName.String},
		ColorScheme:      row.ColorScheme,
		UIScale:          row.UiScale,
		OpenRecordIn:     row.OpenRecordIn,
		Locale:           row.Locale,
		AvatarURL:        row.AvatarUrl.String,
		UserEmail:        row.UserEmail.String,
		JobTitle:         row.JobTitle.String,
		CalendarStartDay: row.CalendarStartDay,
		UserID:           uuidString(row.UserId),
		TimeZone:         row.TimeZone,
		DateFormat:       string(row.DateFormat),
		TimeFormat:       string(row.TimeFormat),
		NumberFormat:     string(row.NumberFormat),
		Position:         row.Position,
		CreatedBy:        records.Actor{Source: string(row.CreatedBySource), WorkspaceMemberID: uuidString(row.CreatedByWorkspaceMemberId), Name: row.CreatedByName},
		UpdatedBy:        records.Actor{Source: string(row.UpdatedBySource), WorkspaceMemberID: uuidString(row.UpdatedByWorkspaceMemberId), Name: row.UpdatedByName},
		CreatedAt:        row.CreatedAt.Time,
		UpdatedAt:        row.UpdatedAt.Time,
	}
	if row.DeletedAt.Valid {
		member.DeletedAt = &row.DeletedAt.Time
	}
	return member
}
