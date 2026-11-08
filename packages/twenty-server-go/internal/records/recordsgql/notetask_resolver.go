package recordsgql

import (
	"context"

	"github.com/twentyhq/twenty/packages/twenty-server-go/internal/records"
)

func (r *Resolver) notes() collection[records.Note, Note] {
	return collection[records.Note, Note]{object: objectNamed("note"), store: r.Notes, node: toNote, id: func(record records.Note) string { return record.ID }}
}

func noteEdge(record records.Note) *NoteEdge {
	return &NoteEdge{Node: toNote(record), Cursor: records.Cursor(record.ID)}
}

func (r *mutationResolver) CreateNote(ctx context.Context, data *NoteCreateInput) (*Note, error) {
	if data == nil {
		data = &NoteCreateInput{}
	}
	actor, err := r.actor(ctx)
	if err != nil {
		return nil, err
	}
	created, err := r.Notes.Create(ctx, actor, records.NoteInput{Title: data.Title, Body: richTextInput(data.BodyV2)})
	if err != nil {
		return nil, err
	}
	return toNote(created), nil
}

func (r *mutationResolver) CreateNotes(ctx context.Context, data []*NoteCreateInput, _ *bool) ([]*Note, error) {
	return createEach(data, func(item *NoteCreateInput) (*Note, error) { return r.CreateNote(ctx, item) })
}

func (r *mutationResolver) UpdateNote(ctx context.Context, id string, data NoteUpdateInput) (*Note, error) {
	actor, err := r.actor(ctx)
	if err != nil {
		return nil, err
	}
	updated, err := r.Notes.Update(ctx, actor, id, records.NoteInput{Title: data.Title, Body: richTextInput(data.BodyV2)})
	if err != nil {
		return nil, err
	}
	return toNote(updated), nil
}

func (r *mutationResolver) UpdateNotes(ctx context.Context, filter map[string]any, data NoteUpdateInput) ([]*Note, error) {
	return r.notes().each(ctx, filter, func(id string) (*Note, error) { return r.UpdateNote(ctx, id, data) })
}

func (r *mutationResolver) DeleteNote(ctx context.Context, id string) (*Note, error) {
	return r.notes().softDelete(ctx, id)
}

func (r *mutationResolver) DeleteNotes(ctx context.Context, filter map[string]any) ([]*Note, error) {
	return r.notes().each(ctx, filter, func(id string) (*Note, error) { return r.notes().softDelete(ctx, id) })
}

func (r *mutationResolver) DestroyNote(ctx context.Context, id string) (*Note, error) {
	return r.notes().destroy(ctx, id)
}

func (r *mutationResolver) DestroyNotes(ctx context.Context, filter map[string]any) ([]*Note, error) {
	return r.notes().each(ctx, filter, func(id string) (*Note, error) { return r.notes().destroy(ctx, id) })
}

func (r *mutationResolver) RestoreNotes(ctx context.Context, filter map[string]any) ([]*Note, error) {
	return r.notes().each(ctx, filter, func(id string) (*Note, error) { return r.notes().restore(ctx, id) })
}

func (r *queryResolver) Notes(ctx context.Context, filter map[string]any, orderBy []map[string]any, first, last *int, after, before *string, _ *int) (*NoteConnection, error) {
	page, aggregates, err := r.notes().list(ctx, filter, orderBy, first, last, after, before)
	if err != nil {
		return nil, err
	}
	connection := &NoteConnection{TotalCount: &page.TotalCount}
	connection.Edges, connection.PageInfo = pageEdges(page, noteEdge)
	fillAggregates(connection, aggregates)
	return connection, nil
}

func (r *queryResolver) Note(ctx context.Context, filter map[string]any) (*Note, error) {
	return r.notes().first(ctx, filter)
}

func (r *queryResolver) NotesGroupBy(ctx context.Context, groupBy []map[string]any, filter map[string]any, orderBy []map[string]any, _ []map[string]any, _ *string, limit *int, _ *int) ([]*NoteGroupByConnection, error) {
	groups, err := r.notes().groups(ctx, groupBy, filter, orderBy, limit)
	if err != nil {
		return nil, err
	}
	connections := make([]*NoteGroupByConnection, len(groups))
	for i, group := range groups {
		connection := &NoteGroupByConnection{GroupByDimensionValues: group.Key}
		connection.Edges, connection.PageInfo = pageEdges(group.Records, noteEdge)
		fillAggregates(connection, group.Aggregates)
		connections[i] = connection
	}
	return connections, nil
}

func (r *Resolver) noteTargets() collection[records.NoteTarget, NoteTarget] {
	return collection[records.NoteTarget, NoteTarget]{object: objectNamed("noteTarget"), store: r.NoteTargets, node: toNoteTarget, id: func(record records.NoteTarget) string { return record.ID }}
}

func noteTargetEdge(record records.NoteTarget) *NoteTargetEdge {
	return &NoteTargetEdge{Node: toNoteTarget(record), Cursor: records.Cursor(record.ID)}
}

func (r *mutationResolver) CreateNoteTarget(ctx context.Context, data *NoteTargetCreateInput) (*NoteTarget, error) {
	if data == nil {
		data = &NoteTargetCreateInput{}
	}
	actor, err := r.actor(ctx)
	if err != nil {
		return nil, err
	}
	created, err := r.NoteTargets.Create(ctx, actor, records.NoteTargetInput{NoteID: data.NoteID, TargetPersonID: data.TargetPersonID, TargetCompanyID: data.TargetCompanyID, TargetOpportunityID: data.TargetOpportunityID})
	if err != nil {
		return nil, err
	}
	return toNoteTarget(created), nil
}

func (r *mutationResolver) CreateNoteTargets(ctx context.Context, data []*NoteTargetCreateInput, _ *bool) ([]*NoteTarget, error) {
	return createEach(data, func(item *NoteTargetCreateInput) (*NoteTarget, error) { return r.CreateNoteTarget(ctx, item) })
}

func (r *mutationResolver) UpdateNoteTarget(ctx context.Context, id string, data NoteTargetUpdateInput) (*NoteTarget, error) {
	actor, err := r.actor(ctx)
	if err != nil {
		return nil, err
	}
	updated, err := r.NoteTargets.Update(ctx, actor, id, records.NoteTargetInput{NoteID: data.NoteID, TargetPersonID: data.TargetPersonID, TargetCompanyID: data.TargetCompanyID, TargetOpportunityID: data.TargetOpportunityID})
	if err != nil {
		return nil, err
	}
	return toNoteTarget(updated), nil
}

func (r *mutationResolver) UpdateNoteTargets(ctx context.Context, filter map[string]any, data NoteTargetUpdateInput) ([]*NoteTarget, error) {
	return r.noteTargets().each(ctx, filter, func(id string) (*NoteTarget, error) { return r.UpdateNoteTarget(ctx, id, data) })
}

func (r *mutationResolver) DeleteNoteTarget(ctx context.Context, id string) (*NoteTarget, error) {
	return r.noteTargets().softDelete(ctx, id)
}

func (r *mutationResolver) DeleteNoteTargets(ctx context.Context, filter map[string]any) ([]*NoteTarget, error) {
	return r.noteTargets().each(ctx, filter, func(id string) (*NoteTarget, error) { return r.noteTargets().softDelete(ctx, id) })
}

func (r *mutationResolver) DestroyNoteTarget(ctx context.Context, id string) (*NoteTarget, error) {
	return r.noteTargets().destroy(ctx, id)
}

func (r *mutationResolver) DestroyNoteTargets(ctx context.Context, filter map[string]any) ([]*NoteTarget, error) {
	return r.noteTargets().each(ctx, filter, func(id string) (*NoteTarget, error) { return r.noteTargets().destroy(ctx, id) })
}

func (r *mutationResolver) RestoreNoteTargets(ctx context.Context, filter map[string]any) ([]*NoteTarget, error) {
	return r.noteTargets().each(ctx, filter, func(id string) (*NoteTarget, error) { return r.noteTargets().restore(ctx, id) })
}

func (r *queryResolver) NoteTargets(ctx context.Context, filter map[string]any, orderBy []map[string]any, first, last *int, after, before *string, _ *int) (*NoteTargetConnection, error) {
	page, aggregates, err := r.noteTargets().list(ctx, filter, orderBy, first, last, after, before)
	if err != nil {
		return nil, err
	}
	connection := &NoteTargetConnection{TotalCount: &page.TotalCount}
	connection.Edges, connection.PageInfo = pageEdges(page, noteTargetEdge)
	fillAggregates(connection, aggregates)
	return connection, nil
}

func (r *queryResolver) NoteTarget(ctx context.Context, filter map[string]any) (*NoteTarget, error) {
	return r.noteTargets().first(ctx, filter)
}

func (r *queryResolver) NoteTargetsGroupBy(ctx context.Context, groupBy []map[string]any, filter map[string]any, orderBy []map[string]any, _ []map[string]any, _ *string, limit *int, _ *int) ([]*NoteTargetGroupByConnection, error) {
	groups, err := r.noteTargets().groups(ctx, groupBy, filter, orderBy, limit)
	if err != nil {
		return nil, err
	}
	connections := make([]*NoteTargetGroupByConnection, len(groups))
	for i, group := range groups {
		connection := &NoteTargetGroupByConnection{GroupByDimensionValues: group.Key}
		connection.Edges, connection.PageInfo = pageEdges(group.Records, noteTargetEdge)
		fillAggregates(connection, group.Aggregates)
		connections[i] = connection
	}
	return connections, nil
}

func (r *Resolver) tasks() collection[records.Task, Task] {
	return collection[records.Task, Task]{object: objectNamed("task"), store: r.Tasks, node: toTask, id: func(record records.Task) string { return record.ID }}
}

func taskEdge(record records.Task) *TaskEdge {
	return &TaskEdge{Node: toTask(record), Cursor: records.Cursor(record.ID)}
}

func (r *mutationResolver) CreateTask(ctx context.Context, data *TaskCreateInput) (*Task, error) {
	if data == nil {
		data = &TaskCreateInput{}
	}
	actor, err := r.actor(ctx)
	if err != nil {
		return nil, err
	}
	created, err := r.Tasks.Create(ctx, actor, records.TaskInput{Title: data.Title, Body: richTextInput(data.BodyV2), DueAt: data.DueAt, Status: statusInput(data.Status), AssigneeID: data.AssigneeID})
	if err != nil {
		return nil, err
	}
	return toTask(created), nil
}

func (r *mutationResolver) CreateTasks(ctx context.Context, data []*TaskCreateInput, _ *bool) ([]*Task, error) {
	return createEach(data, func(item *TaskCreateInput) (*Task, error) { return r.CreateTask(ctx, item) })
}

func (r *mutationResolver) UpdateTask(ctx context.Context, id string, data TaskUpdateInput) (*Task, error) {
	actor, err := r.actor(ctx)
	if err != nil {
		return nil, err
	}
	updated, err := r.Tasks.Update(ctx, actor, id, records.TaskInput{Title: data.Title, Body: richTextInput(data.BodyV2), DueAt: data.DueAt, Status: statusInput(data.Status), AssigneeID: data.AssigneeID})
	if err != nil {
		return nil, err
	}
	return toTask(updated), nil
}

func (r *mutationResolver) UpdateTasks(ctx context.Context, filter map[string]any, data TaskUpdateInput) ([]*Task, error) {
	return r.tasks().each(ctx, filter, func(id string) (*Task, error) { return r.UpdateTask(ctx, id, data) })
}

func (r *mutationResolver) DeleteTask(ctx context.Context, id string) (*Task, error) {
	return r.tasks().softDelete(ctx, id)
}

func (r *mutationResolver) DeleteTasks(ctx context.Context, filter map[string]any) ([]*Task, error) {
	return r.tasks().each(ctx, filter, func(id string) (*Task, error) { return r.tasks().softDelete(ctx, id) })
}

func (r *mutationResolver) DestroyTask(ctx context.Context, id string) (*Task, error) {
	return r.tasks().destroy(ctx, id)
}

func (r *mutationResolver) DestroyTasks(ctx context.Context, filter map[string]any) ([]*Task, error) {
	return r.tasks().each(ctx, filter, func(id string) (*Task, error) { return r.tasks().destroy(ctx, id) })
}

func (r *mutationResolver) RestoreTasks(ctx context.Context, filter map[string]any) ([]*Task, error) {
	return r.tasks().each(ctx, filter, func(id string) (*Task, error) { return r.tasks().restore(ctx, id) })
}

func (r *queryResolver) Tasks(ctx context.Context, filter map[string]any, orderBy []map[string]any, first, last *int, after, before *string, _ *int) (*TaskConnection, error) {
	page, aggregates, err := r.tasks().list(ctx, filter, orderBy, first, last, after, before)
	if err != nil {
		return nil, err
	}
	connection := &TaskConnection{TotalCount: &page.TotalCount}
	connection.Edges, connection.PageInfo = pageEdges(page, taskEdge)
	fillAggregates(connection, aggregates)
	return connection, nil
}

func (r *queryResolver) Task(ctx context.Context, filter map[string]any) (*Task, error) {
	return r.tasks().first(ctx, filter)
}

func (r *queryResolver) TasksGroupBy(ctx context.Context, groupBy []map[string]any, filter map[string]any, orderBy []map[string]any, _ []map[string]any, _ *string, limit *int, _ *int) ([]*TaskGroupByConnection, error) {
	groups, err := r.tasks().groups(ctx, groupBy, filter, orderBy, limit)
	if err != nil {
		return nil, err
	}
	connections := make([]*TaskGroupByConnection, len(groups))
	for i, group := range groups {
		connection := &TaskGroupByConnection{GroupByDimensionValues: group.Key}
		connection.Edges, connection.PageInfo = pageEdges(group.Records, taskEdge)
		fillAggregates(connection, group.Aggregates)
		connections[i] = connection
	}
	return connections, nil
}

func (r *Resolver) taskTargets() collection[records.TaskTarget, TaskTarget] {
	return collection[records.TaskTarget, TaskTarget]{object: objectNamed("taskTarget"), store: r.TaskTargets, node: toTaskTarget, id: func(record records.TaskTarget) string { return record.ID }}
}

func taskTargetEdge(record records.TaskTarget) *TaskTargetEdge {
	return &TaskTargetEdge{Node: toTaskTarget(record), Cursor: records.Cursor(record.ID)}
}

func (r *mutationResolver) CreateTaskTarget(ctx context.Context, data *TaskTargetCreateInput) (*TaskTarget, error) {
	if data == nil {
		data = &TaskTargetCreateInput{}
	}
	actor, err := r.actor(ctx)
	if err != nil {
		return nil, err
	}
	created, err := r.TaskTargets.Create(ctx, actor, records.TaskTargetInput{TaskID: data.TaskID, TargetPersonID: data.TargetPersonID, TargetCompanyID: data.TargetCompanyID, TargetOpportunityID: data.TargetOpportunityID})
	if err != nil {
		return nil, err
	}
	return toTaskTarget(created), nil
}

func (r *mutationResolver) CreateTaskTargets(ctx context.Context, data []*TaskTargetCreateInput, _ *bool) ([]*TaskTarget, error) {
	return createEach(data, func(item *TaskTargetCreateInput) (*TaskTarget, error) { return r.CreateTaskTarget(ctx, item) })
}

func (r *mutationResolver) UpdateTaskTarget(ctx context.Context, id string, data TaskTargetUpdateInput) (*TaskTarget, error) {
	actor, err := r.actor(ctx)
	if err != nil {
		return nil, err
	}
	updated, err := r.TaskTargets.Update(ctx, actor, id, records.TaskTargetInput{TaskID: data.TaskID, TargetPersonID: data.TargetPersonID, TargetCompanyID: data.TargetCompanyID, TargetOpportunityID: data.TargetOpportunityID})
	if err != nil {
		return nil, err
	}
	return toTaskTarget(updated), nil
}

func (r *mutationResolver) UpdateTaskTargets(ctx context.Context, filter map[string]any, data TaskTargetUpdateInput) ([]*TaskTarget, error) {
	return r.taskTargets().each(ctx, filter, func(id string) (*TaskTarget, error) { return r.UpdateTaskTarget(ctx, id, data) })
}

func (r *mutationResolver) DeleteTaskTarget(ctx context.Context, id string) (*TaskTarget, error) {
	return r.taskTargets().softDelete(ctx, id)
}

func (r *mutationResolver) DeleteTaskTargets(ctx context.Context, filter map[string]any) ([]*TaskTarget, error) {
	return r.taskTargets().each(ctx, filter, func(id string) (*TaskTarget, error) { return r.taskTargets().softDelete(ctx, id) })
}

func (r *mutationResolver) DestroyTaskTarget(ctx context.Context, id string) (*TaskTarget, error) {
	return r.taskTargets().destroy(ctx, id)
}

func (r *mutationResolver) DestroyTaskTargets(ctx context.Context, filter map[string]any) ([]*TaskTarget, error) {
	return r.taskTargets().each(ctx, filter, func(id string) (*TaskTarget, error) { return r.taskTargets().destroy(ctx, id) })
}

func (r *mutationResolver) RestoreTaskTargets(ctx context.Context, filter map[string]any) ([]*TaskTarget, error) {
	return r.taskTargets().each(ctx, filter, func(id string) (*TaskTarget, error) { return r.taskTargets().restore(ctx, id) })
}

func (r *queryResolver) TaskTargets(ctx context.Context, filter map[string]any, orderBy []map[string]any, first, last *int, after, before *string, _ *int) (*TaskTargetConnection, error) {
	page, aggregates, err := r.taskTargets().list(ctx, filter, orderBy, first, last, after, before)
	if err != nil {
		return nil, err
	}
	connection := &TaskTargetConnection{TotalCount: &page.TotalCount}
	connection.Edges, connection.PageInfo = pageEdges(page, taskTargetEdge)
	fillAggregates(connection, aggregates)
	return connection, nil
}

func (r *queryResolver) TaskTarget(ctx context.Context, filter map[string]any) (*TaskTarget, error) {
	return r.taskTargets().first(ctx, filter)
}

func (r *queryResolver) TaskTargetsGroupBy(ctx context.Context, groupBy []map[string]any, filter map[string]any, orderBy []map[string]any, _ []map[string]any, _ *string, limit *int, _ *int) ([]*TaskTargetGroupByConnection, error) {
	groups, err := r.taskTargets().groups(ctx, groupBy, filter, orderBy, limit)
	if err != nil {
		return nil, err
	}
	connections := make([]*TaskTargetGroupByConnection, len(groups))
	for i, group := range groups {
		connection := &TaskTargetGroupByConnection{GroupByDimensionValues: group.Key}
		connection.Edges, connection.PageInfo = pageEdges(group.Records, taskTargetEdge)
		fillAggregates(connection, group.Aggregates)
		connections[i] = connection
	}
	return connections, nil
}
