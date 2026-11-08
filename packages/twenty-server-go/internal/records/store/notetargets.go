package store

import (
	"context"

	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/twentyhq/twenty/packages/twenty-server-go/internal/records"
)

type targetRow struct {
	baseRow
	NoteID              *string `json:"noteId"`
	TaskID              *string `json:"taskId"`
	TargetPersonID      *string `json:"targetPersonId"`
	TargetCompanyID     *string `json:"targetCompanyId"`
	TargetOpportunityID *string `json:"targetOpportunityId"`
}

type NoteTargets struct {
	*table[targetRow, records.NoteTarget]
}

var _ records.NoteTargets = (*NoteTargets)(nil)

func NewNoteTargets(pool *pgxpool.Pool) *NoteTargets {
	return &NoteTargets{newTable(pool, "noteTarget", toNoteTarget, func(target records.NoteTarget) string { return target.ID })}
}

func (n *NoteTargets) Create(ctx context.Context, actor records.Actor, input records.NoteTargetInput) (records.NoteTarget, error) {
	values, err := noteTargetValues(input)
	if err != nil {
		return records.NoteTarget{}, err
	}
	return n.create(ctx, actor, values)
}

func (n *NoteTargets) Update(ctx context.Context, actor records.Actor, id string, input records.NoteTargetInput) (records.NoteTarget, error) {
	values, err := noteTargetValues(input)
	if err != nil {
		return records.NoteTarget{}, err
	}
	return n.update(ctx, actor, id, values)
}

func noteTargetValues(input records.NoteTargetInput) (map[string]any, error) {
	values := map[string]any{}
	err := setUUIDs(values, map[string]*string{
		"noteId": input.NoteID, "targetPersonId": input.TargetPersonID,
		"targetCompanyId": input.TargetCompanyID, "targetOpportunityId": input.TargetOpportunityID,
	})
	return values, err
}

func setUUIDs(values map[string]any, ids map[string]*string) error {
	for column, id := range ids {
		if id == nil {
			continue
		}
		uuid, err := optionalUUID(*id)
		if err != nil {
			return err
		}
		values[column] = uuid
	}
	return nil
}

func toNoteTarget(row targetRow) records.NoteTarget {
	return records.NoteTarget{
		ID: row.ID, NoteID: row.NoteID, TargetPersonID: row.TargetPersonID, TargetCompanyID: row.TargetCompanyID, TargetOpportunityID: row.TargetOpportunityID,
		Position: row.Position, CreatedBy: row.createdBy(), UpdatedBy: row.updatedBy(),
		CreatedAt: row.CreatedAt, UpdatedAt: row.UpdatedAt, DeletedAt: row.DeletedAt,
	}
}
