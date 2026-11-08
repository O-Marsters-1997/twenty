package store

import (
	"context"

	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/twentyhq/twenty/packages/twenty-server-go/internal/records"
)

type TaskTargets struct {
	*table[targetRow, records.TaskTarget]
}

var _ records.TaskTargets = (*TaskTargets)(nil)

func NewTaskTargets(pool *pgxpool.Pool) *TaskTargets {
	return &TaskTargets{newTable(pool, "taskTarget", toTaskTarget, func(target records.TaskTarget) string { return target.ID })}
}

func (t *TaskTargets) Create(ctx context.Context, actor records.Actor, input records.TaskTargetInput) (records.TaskTarget, error) {
	values, err := taskTargetValues(input)
	if err != nil {
		return records.TaskTarget{}, err
	}
	return t.create(ctx, actor, values)
}

func (t *TaskTargets) Update(ctx context.Context, actor records.Actor, id string, input records.TaskTargetInput) (records.TaskTarget, error) {
	values, err := taskTargetValues(input)
	if err != nil {
		return records.TaskTarget{}, err
	}
	return t.update(ctx, actor, id, values)
}

func taskTargetValues(input records.TaskTargetInput) (map[string]any, error) {
	values := map[string]any{}
	err := setUUIDs(values, map[string]*string{
		"taskId": input.TaskID, "targetPersonId": input.TargetPersonID,
		"targetCompanyId": input.TargetCompanyID, "targetOpportunityId": input.TargetOpportunityID,
	})
	return values, err
}

func toTaskTarget(row targetRow) records.TaskTarget {
	return records.TaskTarget{
		ID: row.ID, TaskID: row.TaskID, TargetPersonID: row.TargetPersonID, TargetCompanyID: row.TargetCompanyID, TargetOpportunityID: row.TargetOpportunityID,
		Position: row.Position, CreatedBy: row.createdBy(), UpdatedBy: row.updatedBy(),
		CreatedAt: row.CreatedAt, UpdatedAt: row.UpdatedAt, DeletedAt: row.DeletedAt,
	}
}
