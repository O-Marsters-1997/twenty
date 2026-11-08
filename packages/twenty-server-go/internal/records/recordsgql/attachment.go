package recordsgql

import (
	"context"

	"github.com/twentyhq/twenty/packages/twenty-server-go/internal/records"
)

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

func attachmentEdge(attachment records.Attachment) *AttachmentEdge {
	return &AttachmentEdge{Node: toAttachment(attachment), Cursor: records.Cursor(attachment.ID)}
}

func (r *Resolver) attachments() collection[records.Attachment, Attachment] {
	return collection[records.Attachment, Attachment]{object: objectNamed("attachment"), store: r.Attachments, node: toAttachment, id: func(record records.Attachment) string { return record.ID }}
}

func (r *mutationResolver) CreateAttachment(ctx context.Context, data *AttachmentCreateInput) (*Attachment, error) {
	input, err := toAttachmentInput(data)
	if err != nil {
		return nil, err
	}
	actor, err := r.actor(ctx)
	if err != nil {
		return nil, err
	}
	created, err := r.Attachments.Create(ctx, actor, input)
	if err != nil {
		return nil, err
	}
	return toAttachment(created), nil
}

func (r *mutationResolver) CreateAttachments(ctx context.Context, data []*AttachmentCreateInput, _ *bool) ([]*Attachment, error) {
	return createEach(data, func(item *AttachmentCreateInput) (*Attachment, error) { return r.CreateAttachment(ctx, item) })
}

func (r *mutationResolver) UpdateAttachment(ctx context.Context, id string, data AttachmentUpdateInput) (*Attachment, error) {
	input, err := toAttachmentUpdateInput(data)
	if err != nil {
		return nil, err
	}
	actor, err := r.actor(ctx)
	if err != nil {
		return nil, err
	}
	updated, err := r.Attachments.Update(ctx, actor, id, input)
	if err != nil {
		return nil, err
	}
	return toAttachment(updated), nil
}

func (r *mutationResolver) UpdateAttachments(ctx context.Context, filter map[string]any, data AttachmentUpdateInput) ([]*Attachment, error) {
	return r.attachments().each(ctx, filter, func(id string) (*Attachment, error) { return r.UpdateAttachment(ctx, id, data) })
}

func (r *mutationResolver) DeleteAttachment(ctx context.Context, id string) (*Attachment, error) {
	return r.attachments().softDelete(ctx, id)
}

func (r *mutationResolver) DeleteAttachments(ctx context.Context, filter map[string]any) ([]*Attachment, error) {
	return r.attachments().each(ctx, filter, func(id string) (*Attachment, error) { return r.attachments().softDelete(ctx, id) })
}

func (r *mutationResolver) DestroyAttachment(ctx context.Context, id string) (*Attachment, error) {
	return r.attachments().destroy(ctx, id)
}

func (r *mutationResolver) DestroyAttachments(ctx context.Context, filter map[string]any) ([]*Attachment, error) {
	return r.attachments().each(ctx, filter, func(id string) (*Attachment, error) { return r.attachments().destroy(ctx, id) })
}

func (r *mutationResolver) RestoreAttachments(ctx context.Context, filter map[string]any) ([]*Attachment, error) {
	return r.attachments().each(ctx, filter, func(id string) (*Attachment, error) { return r.attachments().restore(ctx, id) })
}

func (r *queryResolver) Attachments(ctx context.Context, filter map[string]any, orderBy []map[string]any, first, last *int, after, before *string, _ *int) (*AttachmentConnection, error) {
	page, aggregates, err := r.attachments().list(ctx, filter, orderBy, first, last, after, before)
	if err != nil {
		return nil, err
	}
	connection := &AttachmentConnection{TotalCount: &page.TotalCount}
	connection.Edges, connection.PageInfo = pageEdges(page, attachmentEdge)
	fillAggregates(connection, aggregates)
	return connection, nil
}

func (r *queryResolver) Attachment(ctx context.Context, filter map[string]any) (*Attachment, error) {
	return r.attachments().first(ctx, filter)
}

func (r *queryResolver) AttachmentsGroupBy(ctx context.Context, groupBy []map[string]any, filter map[string]any, orderBy []map[string]any, _ []map[string]any, _ *string, limit *int, _ *int) ([]*AttachmentGroupByConnection, error) {
	groups, err := r.attachments().groups(ctx, groupBy, filter, orderBy, limit)
	if err != nil {
		return nil, err
	}
	connections := make([]*AttachmentGroupByConnection, len(groups))
	for i, group := range groups {
		connection := &AttachmentGroupByConnection{GroupByDimensionValues: group.Key}
		connection.Edges, connection.PageInfo = pageEdges(group.Records, attachmentEdge)
		fillAggregates(connection, group.Aggregates)
		connections[i] = connection
	}
	return connections, nil
}
