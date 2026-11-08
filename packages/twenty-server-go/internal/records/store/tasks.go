package store

import (
	"context"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/twentyhq/twenty/packages/twenty-server-go/internal/records"
)

type taskRow struct {
	baseRow
	Title           *string    `json:"title"`
	BodyV2Blocknote *string    `json:"bodyV2Blocknote"`
	BodyV2Markdown  *string    `json:"bodyV2Markdown"`
	DueAt           *time.Time `json:"dueAt"`
	Status          *string    `json:"status"`
	AssigneeID      *string    `json:"assigneeId"`
}

type Tasks struct {
	*table[taskRow, records.Task]
}

var _ records.Tasks = (*Tasks)(nil)

func NewTasks(pool *pgxpool.Pool) *Tasks {
	return &Tasks{newTable(pool, "task", toTask, func(task records.Task) string { return task.ID })}
}

func (t *Tasks) Create(ctx context.Context, actor records.Actor, input records.TaskInput) (records.Task, error) {
	values, err := taskValues(input)
	if err != nil {
		return records.Task{}, err
	}
	return t.create(ctx, actor, values)
}

func (t *Tasks) Update(ctx context.Context, actor records.Actor, id string, input records.TaskInput) (records.Task, error) {
	values, err := taskValues(input)
	if err != nil {
		return records.Task{}, err
	}
	return t.update(ctx, actor, id, values)
}

func taskValues(input records.TaskInput) (map[string]any, error) {
	values := map[string]any{}
	if input.Title != nil {
		values["title"] = *input.Title
	}
	setRichText(values, "bodyV2", input.Body)
	if input.DueAt != nil {
		values["dueAt"] = *input.DueAt
	}
	if input.Status != nil {
		values["status"] = *input.Status
	}
	err := setUUIDs(values, map[string]*string{"assigneeId": input.AssigneeID})
	return values, err
}

func toTask(row taskRow) records.Task {
	return records.Task{
		ID: row.ID, Title: deref(row.Title), Body: records.RichText{Blocknote: deref(row.BodyV2Blocknote), Markdown: deref(row.BodyV2Markdown)},
		DueAt: row.DueAt, Status: row.Status, AssigneeID: row.AssigneeID,
		Position: row.Position, CreatedBy: row.createdBy(), UpdatedBy: row.updatedBy(),
		CreatedAt: row.CreatedAt, UpdatedAt: row.UpdatedAt, DeletedAt: row.DeletedAt,
	}
}
