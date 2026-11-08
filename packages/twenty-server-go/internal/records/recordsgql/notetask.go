package recordsgql

import "github.com/twentyhq/twenty/packages/twenty-server-go/internal/records"

func toRichText(body records.RichText) *RichText {
	return &RichText{Blocknote: &body.Blocknote, Markdown: &body.Markdown}
}

func richTextInput(body *RichTextCreateInput) *records.RichText {
	if body == nil {
		return nil
	}
	return &records.RichText{Blocknote: deref(body.Blocknote), Markdown: deref(body.Markdown)}
}

func statusInput(status *TaskStatusEnum) *string {
	if status == nil {
		return nil
	}
	return new(string(*status))
}

func toNote(note records.Note) *Note {
	return &Note{
		ID: note.ID, Title: &note.Title, BodyV2: toRichText(note.Body), Position: note.Position,
		CreatedBy: toActor(note.CreatedBy), UpdatedBy: toActor(note.UpdatedBy),
		CreatedAt: note.CreatedAt, UpdatedAt: note.UpdatedAt, DeletedAt: note.DeletedAt,
	}
}

func toNoteTarget(target records.NoteTarget) *NoteTarget {
	return &NoteTarget{
		ID: target.ID, NoteID: target.NoteID, TargetPersonID: target.TargetPersonID, TargetCompanyID: target.TargetCompanyID,
		TargetOpportunityID: target.TargetOpportunityID, Position: target.Position,
		CreatedBy: toActor(target.CreatedBy), UpdatedBy: toActor(target.UpdatedBy),
		CreatedAt: target.CreatedAt, UpdatedAt: target.UpdatedAt, DeletedAt: target.DeletedAt,
	}
}

func toTask(task records.Task) *Task {
	var status *TaskStatusEnum
	if task.Status != nil {
		status = new(TaskStatusEnum(*task.Status))
	}
	return &Task{
		ID: task.ID, Title: &task.Title, BodyV2: toRichText(task.Body), DueAt: task.DueAt, Status: status, AssigneeID: task.AssigneeID,
		Position: task.Position, CreatedBy: toActor(task.CreatedBy), UpdatedBy: toActor(task.UpdatedBy),
		CreatedAt: task.CreatedAt, UpdatedAt: task.UpdatedAt, DeletedAt: task.DeletedAt,
	}
}

func toTaskTarget(target records.TaskTarget) *TaskTarget {
	return &TaskTarget{
		ID: target.ID, TaskID: target.TaskID, TargetPersonID: target.TargetPersonID, TargetCompanyID: target.TargetCompanyID,
		TargetOpportunityID: target.TargetOpportunityID, Position: target.Position,
		CreatedBy: toActor(target.CreatedBy), UpdatedBy: toActor(target.UpdatedBy),
		CreatedAt: target.CreatedAt, UpdatedAt: target.UpdatedAt, DeletedAt: target.DeletedAt,
	}
}
