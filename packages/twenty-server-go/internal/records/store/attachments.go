package store

import (
	"context"
	"errors"
	"fmt"
	"slices"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgtype"
	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/twentyhq/twenty/packages/twenty-server-go/internal/model"
	"github.com/twentyhq/twenty/packages/twenty-server-go/internal/records"
	"github.com/twentyhq/twenty/packages/twenty-server-go/internal/records/store/db"
	"github.com/twentyhq/twenty/packages/twenty-server-go/internal/workspace"
)

const attachmentColumns = `"id", "createdAt", "updatedAt", "deletedAt", "name", "file", "fullPath", "fileCategory", "createdBySource", "createdByWorkspaceMemberId", "createdByName", "createdByContext", "updatedBySource", "updatedByWorkspaceMemberId", "updatedByName", "updatedByContext", "position", "searchVector", "targetAgentChatThreadId", "targetTaskId", "targetNoteId", "targetPersonId", "targetCompanyId", "targetOpportunityId", "targetDashboardId", "targetWorkflowId"`

type attachmentRow = db.Workspace2abogkkt2zd45pa9aun09djpfAttachment

type Attachments struct {
	*rowset[records.Attachment]
	queries *db.Queries
}

var _ records.Attachments = (*Attachments)(nil)

func NewAttachments(pool *pgxpool.Pool) *Attachments {
	index := slices.IndexFunc(model.Objects, func(object model.Object) bool { return object.NameSingular == "attachment" })
	if index < 0 {
		panic("object model has no attachment object")
	}
	return &Attachments{
		rowset: &rowset[records.Attachment]{
			pool: pool, object: model.Objects[index], table: workspace.SchemaName() + `."attachment"`,
			columns: attachmentColumns, label: "attachments",
			scan: func(row pgx.Row) (records.Attachment, error) {
				scanned, err := scanAttachment(row)
				if err != nil {
					return records.Attachment{}, err
				}
				return toAttachment(scanned), nil
			},
			id: func(attachment records.Attachment) string { return attachment.ID },
		},
		queries: db.New(pool),
	}
}

func (a *Attachments) Get(ctx context.Context, id string) (records.Attachment, error) {
	uuid, err := parseUUID(id)
	if err != nil {
		return records.Attachment{}, err
	}
	row, err := a.queries.GetAttachment(ctx, uuid)
	if errors.Is(err, pgx.ErrNoRows) {
		return records.Attachment{}, records.ErrNotFound
	}
	if err != nil {
		return records.Attachment{}, fmt.Errorf("get attachment: %w", err)
	}
	return toAttachment(row), nil
}

func (a *Attachments) Create(ctx context.Context, actor records.Actor, input records.AttachmentInput) (records.Attachment, error) {
	position, err := nextPosition(ctx, a.pool, a.table)
	if err != nil {
		return records.Attachment{}, err
	}
	merged, err := mergeAttachment(attachmentRow{FileCategory: db.Workspace2abogkkt2zd45pa9aun09djpfAttachmentFileCategoryEnumOTHER}, input)
	if err != nil {
		return records.Attachment{}, err
	}
	memberID, err := optionalUUID(actor.WorkspaceMemberID)
	if err != nil {
		return records.Attachment{}, err
	}
	row, err := a.queries.CreateAttachment(ctx, db.CreateAttachmentParams{
		Name: merged.Name, File: merged.File, FullPath: merged.FullPath, FileCategory: merged.FileCategory,
		CreatedBySource:            db.Workspace2abogkkt2zd45pa9aun09djpfAttachmentCreatedBySourceEnum(actor.Source),
		CreatedByWorkspaceMemberId: memberID, CreatedByName: actor.Name,
		UpdatedBySource:            db.Workspace2abogkkt2zd45pa9aun09djpfAttachmentUpdatedBySourceEnum(actor.Source),
		UpdatedByWorkspaceMemberId: memberID, UpdatedByName: actor.Name, Position: position,
		TargetAgentChatThreadId: merged.TargetAgentChatThreadId, TargetTaskId: merged.TargetTaskId, TargetNoteId: merged.TargetNoteId,
		TargetPersonId: merged.TargetPersonId, TargetCompanyId: merged.TargetCompanyId, TargetOpportunityId: merged.TargetOpportunityId,
		TargetDashboardId: merged.TargetDashboardId, TargetWorkflowId: merged.TargetWorkflowId,
	})
	if err != nil {
		return records.Attachment{}, fmt.Errorf("create attachment: %w", err)
	}
	return toAttachment(row), nil
}

func (a *Attachments) Update(ctx context.Context, actor records.Actor, id string, input records.AttachmentInput) (records.Attachment, error) {
	uuid, err := parseUUID(id)
	if err != nil {
		return records.Attachment{}, err
	}
	tx, err := a.pool.Begin(ctx)
	if err != nil {
		return records.Attachment{}, fmt.Errorf("begin update: %w", err)
	}
	defer func() { _ = tx.Rollback(ctx) }()

	current, err := scanAttachment(tx.QueryRow(ctx, `SELECT `+attachmentColumns+` FROM `+a.table+` WHERE "id" = $1 FOR UPDATE`, uuid))
	if errors.Is(err, pgx.ErrNoRows) {
		return records.Attachment{}, records.ErrNotFound
	}
	if err != nil {
		return records.Attachment{}, fmt.Errorf("load attachment: %w", err)
	}
	merged, err := mergeAttachment(current, input)
	if err != nil {
		return records.Attachment{}, err
	}
	memberID, err := optionalUUID(actor.WorkspaceMemberID)
	if err != nil {
		return records.Attachment{}, err
	}
	row, err := a.queries.WithTx(tx).UpdateAttachment(ctx, db.UpdateAttachmentParams{
		Name: merged.Name, File: merged.File, FullPath: merged.FullPath, FileCategory: merged.FileCategory,
		UpdatedBySource:            db.Workspace2abogkkt2zd45pa9aun09djpfAttachmentUpdatedBySourceEnum(actor.Source),
		UpdatedByWorkspaceMemberId: memberID, UpdatedByName: actor.Name, UpdatedByContext: current.UpdatedByContext, Position: current.Position,
		TargetAgentChatThreadId: merged.TargetAgentChatThreadId, TargetTaskId: merged.TargetTaskId, TargetNoteId: merged.TargetNoteId,
		TargetPersonId: merged.TargetPersonId, TargetCompanyId: merged.TargetCompanyId, TargetOpportunityId: merged.TargetOpportunityId,
		TargetDashboardId: merged.TargetDashboardId, TargetWorkflowId: merged.TargetWorkflowId, ID: uuid,
	})
	if err != nil {
		return records.Attachment{}, fmt.Errorf("update attachment: %w", err)
	}
	if err := tx.Commit(ctx); err != nil {
		return records.Attachment{}, fmt.Errorf("commit update: %w", err)
	}
	return toAttachment(row), nil
}

func (a *Attachments) SoftDelete(ctx context.Context, id string) error {
	return affect(ctx, id, "attachment", a.queries.SoftDeleteAttachment)
}

func (a *Attachments) Restore(ctx context.Context, id string) error {
	return affect(ctx, id, "attachment", a.queries.RestoreAttachment)
}

func (a *Attachments) Destroy(ctx context.Context, id string) error {
	return affect(ctx, id, "attachment", a.queries.DestroyAttachment)
}

func scanAttachment(row pgx.Row) (attachmentRow, error) {
	var i attachmentRow
	err := row.Scan(&i.ID, &i.CreatedAt, &i.UpdatedAt, &i.DeletedAt, &i.Name, &i.File, &i.FullPath, &i.FileCategory, &i.CreatedBySource,
		&i.CreatedByWorkspaceMemberId, &i.CreatedByName, &i.CreatedByContext, &i.UpdatedBySource, &i.UpdatedByWorkspaceMemberId, &i.UpdatedByName,
		&i.UpdatedByContext, &i.Position, &i.SearchVector, &i.TargetAgentChatThreadId, &i.TargetTaskId, &i.TargetNoteId, &i.TargetPersonId,
		&i.TargetCompanyId, &i.TargetOpportunityId, &i.TargetDashboardId, &i.TargetWorkflowId)
	return i, err
}

func mergeAttachment(base attachmentRow, input records.AttachmentInput) (attachmentRow, error) {
	row := base
	patchText(&row.Name, input.Name)
	patchText(&row.FullPath, input.FullPath)
	if input.File != nil {
		row.File = input.File
	}
	if input.FileCategory != nil {
		row.FileCategory = db.Workspace2abogkkt2zd45pa9aun09djpfAttachmentFileCategoryEnum(*input.FileCategory)
	}
	links := []struct {
		target *pgtype.UUID
		id     *string
	}{
		{&row.TargetAgentChatThreadId, input.TargetAgentChatThreadID}, {&row.TargetCompanyId, input.TargetCompanyID}, {&row.TargetDashboardId, input.TargetDashboardID},
		{&row.TargetNoteId, input.TargetNoteID}, {&row.TargetOpportunityId, input.TargetOpportunityID}, {&row.TargetPersonId, input.TargetPersonID},
		{&row.TargetTaskId, input.TargetTaskID}, {&row.TargetWorkflowId, input.TargetWorkflowID},
	}
	for _, link := range links {
		if err := patchUUID(link.target, link.id); err != nil {
			return row, err
		}
	}
	return row, nil
}

func toAttachment(row attachmentRow) records.Attachment {
	return records.Attachment{
		ID: row.ID.String(), Name: row.Name.String, File: row.File, FullPath: row.FullPath.String, FileCategory: string(row.FileCategory),
		TargetAgentChatThreadID: uuidPtr(row.TargetAgentChatThreadId), TargetCompanyID: uuidPtr(row.TargetCompanyId), TargetDashboardID: uuidPtr(row.TargetDashboardId),
		TargetNoteID: uuidPtr(row.TargetNoteId), TargetOpportunityID: uuidPtr(row.TargetOpportunityId), TargetPersonID: uuidPtr(row.TargetPersonId),
		TargetTaskID: uuidPtr(row.TargetTaskId), TargetWorkflowID: uuidPtr(row.TargetWorkflowId),
		Position:  row.Position,
		CreatedBy: records.Actor{Source: string(row.CreatedBySource), WorkspaceMemberID: uuidString(row.CreatedByWorkspaceMemberId), Name: row.CreatedByName},
		UpdatedBy: records.Actor{Source: string(row.UpdatedBySource), WorkspaceMemberID: uuidString(row.UpdatedByWorkspaceMemberId), Name: row.UpdatedByName},
		CreatedAt: row.CreatedAt.Time.UTC(), UpdatedAt: row.UpdatedAt.Time.UTC(), DeletedAt: timePtr(row.DeletedAt),
	}
}
