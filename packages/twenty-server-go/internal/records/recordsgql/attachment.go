package recordsgql

import (
	"context"

	"github.com/twentyhq/twenty/packages/twenty-server-go/internal/records"
)

func newAttachmentOps(store records.Attachments) *objectOps[records.Attachment, records.AttachmentInput] {
	return newObjectOps(store, "attachment", func(attachment records.Attachment) string { return attachment.ID })
}

func toAttachmentInput(in *AttachmentCreateInput) (records.AttachmentInput, error) {
	if in == nil {
		return records.AttachmentInput{}, nil
	}
	file, err := rawJSON(in.File)
	if err != nil {
		return records.AttachmentInput{}, err
	}
	input := records.AttachmentInput{
		Name: in.Name, File: file, FullPath: in.FullPath,
		TargetAgentChatThreadID: in.TargetAgentChatThreadID, TargetCompanyID: in.TargetCompanyID, TargetDashboardID: in.TargetDashboardID,
		TargetNoteID: in.TargetNoteID, TargetOpportunityID: in.TargetOpportunityID, TargetPersonID: in.TargetPersonID,
		TargetTaskID: in.TargetTaskID, TargetWorkflowID: in.TargetWorkflowID,
	}
	if in.FileCategory != nil {
		category := string(*in.FileCategory)
		input.FileCategory = &category
	}
	return input, nil
}

func toAttachmentUpdateInput(in AttachmentUpdateInput) (records.AttachmentInput, error) {
	return toAttachmentInput(&AttachmentCreateInput{
		Name: in.Name, File: in.File, FullPath: in.FullPath, FileCategory: in.FileCategory,
		TargetAgentChatThreadID: in.TargetAgentChatThreadID, TargetCompanyID: in.TargetCompanyID, TargetDashboardID: in.TargetDashboardID,
		TargetNoteID: in.TargetNoteID, TargetOpportunityID: in.TargetOpportunityID, TargetPersonID: in.TargetPersonID,
		TargetTaskID: in.TargetTaskID, TargetWorkflowID: in.TargetWorkflowID,
	})
}

func toAttachment(attachment records.Attachment) *Attachment {
	category := AttachmentFileCategory(attachment.FileCategory)
	return &Attachment{
		ID: attachment.ID, Name: &attachment.Name, File: jsonValue(attachment.File), FullPath: &attachment.FullPath, FileCategory: &category,
		TargetAgentChatThreadID: attachment.TargetAgentChatThreadID, TargetCompanyID: attachment.TargetCompanyID, TargetDashboardID: attachment.TargetDashboardID,
		TargetNoteID: attachment.TargetNoteID, TargetOpportunityID: attachment.TargetOpportunityID, TargetPersonID: attachment.TargetPersonID,
		TargetTaskID: attachment.TargetTaskID, TargetWorkflowID: attachment.TargetWorkflowID,
		Position: attachment.Position, CreatedBy: toActor(attachment.CreatedBy), UpdatedBy: toActor(attachment.UpdatedBy),
		CreatedAt: attachment.CreatedAt, UpdatedAt: attachment.UpdatedAt, DeletedAt: attachment.DeletedAt,
	}
}

func newAttachmentEdge(attachment records.Attachment, cursor string) *AttachmentEdge {
	return &AttachmentEdge{Node: toAttachment(attachment), Cursor: cursor}
}

func (r *mutationResolver) CreateAttachment(ctx context.Context, data *AttachmentCreateInput) (*Attachment, error) {
	input, err := toAttachmentInput(data)
	if err != nil {
		return nil, err
	}
	created, err := r.attachments.create(ctx, input)
	return convertOne(created, err, toAttachment)
}

func (r *mutationResolver) CreateAttachments(ctx context.Context, data []*AttachmentCreateInput, _ *bool) ([]*Attachment, error) {
	inputs := make([]records.AttachmentInput, len(data))
	for i, item := range data {
		var err error
		if inputs[i], err = toAttachmentInput(item); err != nil {
			return nil, err
		}
	}
	created, err := r.attachments.createMany(ctx, inputs)
	return convertAll(created, err, toAttachment)
}

func (r *mutationResolver) UpdateAttachment(ctx context.Context, id string, data AttachmentUpdateInput) (*Attachment, error) {
	input, err := toAttachmentUpdateInput(data)
	if err != nil {
		return nil, err
	}
	updated, err := r.attachments.update(ctx, id, input)
	return convertOne(updated, err, toAttachment)
}

func (r *mutationResolver) UpdateAttachments(ctx context.Context, filter map[string]any, data AttachmentUpdateInput) ([]*Attachment, error) {
	input, err := toAttachmentUpdateInput(data)
	if err != nil {
		return nil, err
	}
	updated, err := r.attachments.updateMatching(ctx, filter, input)
	return convertAll(updated, err, toAttachment)
}

func (r *mutationResolver) DeleteAttachment(ctx context.Context, id string) (*Attachment, error) {
	deleted, err := r.attachments.softDelete(ctx, id)
	return convertOne(deleted, err, toAttachment)
}

func (r *mutationResolver) DeleteAttachments(ctx context.Context, filter map[string]any) ([]*Attachment, error) {
	deleted, err := r.attachments.each(ctx, filter, r.attachments.softDelete)
	return convertAll(deleted, err, toAttachment)
}

func (r *mutationResolver) DestroyAttachment(ctx context.Context, id string) (*Attachment, error) {
	destroyed, err := r.attachments.destroy(ctx, id)
	return convertOne(destroyed, err, toAttachment)
}

func (r *mutationResolver) DestroyAttachments(ctx context.Context, filter map[string]any) ([]*Attachment, error) {
	destroyed, err := r.attachments.each(ctx, filter, r.attachments.destroy)
	return convertAll(destroyed, err, toAttachment)
}

func (r *mutationResolver) RestoreAttachments(ctx context.Context, filter map[string]any) ([]*Attachment, error) {
	restored, err := r.attachments.each(ctx, filter, r.attachments.restore)
	return convertAll(restored, err, toAttachment)
}

func (r *queryResolver) Attachments(ctx context.Context, filter map[string]any, orderBy []map[string]any, first, last *int, after, before *string, _ *int) (*AttachmentConnection, error) {
	page, parsed, err := r.attachments.find(ctx, filter, orderBy, first, last, after, before)
	if err != nil {
		return nil, err
	}
	connection := &AttachmentConnection{TotalCount: &page.TotalCount}
	connection.Edges, connection.PageInfo = edgesFor(page, newAttachmentEdge, r.attachments.recordID)
	if err := r.attachments.fillConnectionAggregates(ctx, parsed, connection); err != nil {
		return nil, err
	}
	return connection, nil
}

func (r *queryResolver) Attachment(ctx context.Context, filter map[string]any) (*Attachment, error) {
	found, err := r.attachments.findFirst(ctx, filter)
	if err != nil || found == nil {
		return nil, err
	}
	return toAttachment(*found), nil
}

func (r *queryResolver) AttachmentsGroupBy(ctx context.Context, groupBy []map[string]any, filter map[string]any, orderBy []map[string]any, _ []map[string]any, _ *string, limit *int, _ *int) ([]*AttachmentGroupByConnection, error) {
	groups, err := r.attachments.groupBy(ctx, groupBy, filter, orderBy, limit)
	if err != nil {
		return nil, err
	}
	connections := make([]*AttachmentGroupByConnection, len(groups))
	for i, group := range groups {
		connection := &AttachmentGroupByConnection{GroupByDimensionValues: group.Key}
		connection.Edges, connection.PageInfo = edgesFor(group.Records, newAttachmentEdge, r.attachments.recordID)
		fillAggregates(connection, group.Aggregates)
		connections[i] = connection
	}
	return connections, nil
}
