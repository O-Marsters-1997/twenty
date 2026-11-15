package store

import (
	"context"
	"fmt"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/twentyhq/twenty/packages/twenty-server-go/internal/metadata"
	"github.com/twentyhq/twenty/packages/twenty-server-go/internal/workspace"
)

var selectTimelineActivityTypes = `SELECT jsonb_build_object('id', t.id, 'universalIdentifier', t."universalIdentifier", 'name', t.name,
		'label', t.label, 'action', t.action, 'icon', t.icon, 'objectUniversalIdentifier', t."objectUniversalIdentifier",
		'frontComponentUniversalIdentifier', t."frontComponentUniversalIdentifier",
		'targetRelationFieldUniversalIdentifier', t."targetRelationFieldUniversalIdentifier",
		'triggerFieldUniversalIdentifiers', t."triggerFieldUniversalIdentifiers",
		'happensAtFieldUniversalIdentifier', t."happensAtFieldUniversalIdentifier",
		'replacesTimelineActivityTypeUniversalIdentifier', t."replacesTimelineActivityTypeUniversalIdentifier",
		'isActive', t."isActive", 'overrides', t.overrides, 'applicationId', t."applicationId",
		'ownerUniversalIdentifier', a."universalIdentifier", 'createdAt', ` + iso(`t."createdAt"`) + `, 'updatedAt', ` + iso(`t."updatedAt"`) + `)
	FROM core."timelineActivityType" t JOIN core.application a ON a.id = t."applicationId"
	WHERE t."workspaceId" = $1::uuid`

const customApplicationUniversalIdentifier = `SELECT a."universalIdentifier"::text FROM core.workspace w
	JOIN core.application a ON a.id = w."workspaceCustomApplicationId" WHERE w.id = $1::uuid`

type TimelineActivityTypeEmitThrough struct {
	RelationFieldUniversalIdentifier  string   `json:"relationFieldUniversalIdentifier"`
	TriggerFieldUniversalIdentifiers  []string `json:"triggerFieldUniversalIdentifiers"`
	HappensAtFieldUniversalIdentifier *string  `json:"happensAtFieldUniversalIdentifier"`
}

type TimelineActivityTypeEmit struct {
	On                        string                           `json:"on"`
	ObjectUniversalIdentifier *string                          `json:"objectUniversalIdentifier"`
	Through                   *TimelineActivityTypeEmitThrough `json:"through"`
}

type TimelineActivityType struct {
	ID                                              string
	UniversalIdentifier                             string
	Name                                            string
	Label                                           string
	Emit                                            *TimelineActivityTypeEmit
	Action                                          *string
	Icon                                            *string
	FrontComponentUniversalIdentifier               *string
	ObjectUniversalIdentifier                       *string
	ReplacesTimelineActivityTypeUniversalIdentifier *string
	IsActive                                        bool
	ApplicationID                                   string
	CreatedAt                                       string
	UpdatedAt                                       string
}

type timelineActivityTypeRow struct {
	ID                                              string         `json:"id"`
	UniversalIdentifier                             string         `json:"universalIdentifier"`
	Name                                            string         `json:"name"`
	Label                                           string         `json:"label"`
	Action                                          *string        `json:"action"`
	Icon                                            *string        `json:"icon"`
	ObjectUniversalIdentifier                       *string        `json:"objectUniversalIdentifier"`
	FrontComponentUniversalIdentifier               *string        `json:"frontComponentUniversalIdentifier"`
	TargetRelationFieldUniversalIdentifier          *string        `json:"targetRelationFieldUniversalIdentifier"`
	TriggerFieldUniversalIdentifiers                []string       `json:"triggerFieldUniversalIdentifiers"`
	HappensAtFieldUniversalIdentifier               *string        `json:"happensAtFieldUniversalIdentifier"`
	ReplacesTimelineActivityTypeUniversalIdentifier *string        `json:"replacesTimelineActivityTypeUniversalIdentifier"`
	IsActive                                        bool           `json:"isActive"`
	Overrides                                       map[string]any `json:"overrides"`
	ApplicationID                                   string         `json:"applicationId"`
	OwnerUniversalIdentifier                        string         `json:"ownerUniversalIdentifier"`
	CreatedAt                                       string         `json:"createdAt"`
	UpdatedAt                                       string         `json:"updatedAt"`
}

func (r timelineActivityTypeRow) timelineActivityType(custom string) TimelineActivityType {
	overrides := authoredFromStored(r.Overrides, custom)
	label, icon, isActive := r.Label, r.Icon, r.IsActive
	if value, ok := overrides.effective("label", custom, r.OwnerUniversalIdentifier); ok {
		label, _ = value.(string)
	}
	if value, ok := overrides.effective("icon", custom, r.OwnerUniversalIdentifier); ok {
		text, isText := value.(string)
		icon = nil
		if isText {
			icon = &text
		}
	}
	if value, ok := overrides.effective("isActive", custom, r.OwnerUniversalIdentifier); ok {
		isActive, _ = value.(bool)
	}
	var emit *TimelineActivityTypeEmit
	if r.Action != nil {
		emit = &TimelineActivityTypeEmit{On: *r.Action, ObjectUniversalIdentifier: r.ObjectUniversalIdentifier}
		if r.TargetRelationFieldUniversalIdentifier != nil {
			emit.Through = &TimelineActivityTypeEmitThrough{
				RelationFieldUniversalIdentifier:  *r.TargetRelationFieldUniversalIdentifier,
				TriggerFieldUniversalIdentifiers:  r.TriggerFieldUniversalIdentifiers,
				HappensAtFieldUniversalIdentifier: r.HappensAtFieldUniversalIdentifier,
			}
		}
	}
	return TimelineActivityType{
		ID: r.ID, UniversalIdentifier: r.UniversalIdentifier, Name: r.Name, Label: label, Emit: emit, Action: r.Action, Icon: icon,
		FrontComponentUniversalIdentifier: r.FrontComponentUniversalIdentifier, ObjectUniversalIdentifier: r.ObjectUniversalIdentifier,
		ReplacesTimelineActivityTypeUniversalIdentifier: r.ReplacesTimelineActivityTypeUniversalIdentifier,
		IsActive: isActive, ApplicationID: r.ApplicationID, CreatedAt: r.CreatedAt, UpdatedAt: r.UpdatedAt,
	}
}

type TimelineActivityTypes struct {
	pool *pgxpool.Pool
}

func NewTimelineActivityTypes(pool *pgxpool.Pool) *TimelineActivityTypes {
	return &TimelineActivityTypes{pool: pool}
}

func (t *TimelineActivityTypes) List(ctx context.Context) ([]TimelineActivityType, error) {
	var custom string
	if err := t.pool.QueryRow(ctx, customApplicationUniversalIdentifier, workspace.PinnedWorkspaceID).Scan(&custom); err != nil {
		return nil, fmt.Errorf("read custom application: %w", err)
	}
	rows, err := queryAll[timelineActivityTypeRow](ctx, t.pool, selectTimelineActivityTypes+` ORDER BY lower(t.name), t.name`, workspace.PinnedWorkspaceID)
	if err != nil {
		return nil, err
	}
	listed := make([]TimelineActivityType, len(rows))
	for i, row := range rows {
		listed[i] = row.timelineActivityType(custom)
	}
	return listed, nil
}

func (t *TimelineActivityTypes) SetActive(ctx context.Context, id string, isActive *bool) (TimelineActivityType, error) {
	return t.change(ctx, id, func(row timelineActivityTypeRow, custom string) (any, bool, error) {
		next := row.IsActive
		if isActive != nil {
			next = *isActive
		}
		stored := authoredFromStored(row.Overrides, custom)
		if row.OwnerUniversalIdentifier == custom {
			return stored.document(), next, nil
		}
		if isActive == nil {
			return stored.document(), row.IsActive, nil
		}
		return stored.withActive(next, row.IsActive, custom, row.OwnerUniversalIdentifier).document(), row.IsActive, nil
	})
}

func (t *TimelineActivityTypes) Reset(ctx context.Context, id string) (TimelineActivityType, error) {
	return t.change(ctx, id, func(row timelineActivityTypeRow, custom string) (any, bool, error) {
		if row.OwnerUniversalIdentifier == custom {
			return nil, false, fmt.Errorf("%w: custom timeline activity type cannot be reset to default", metadata.ErrInvalidInput)
		}
		return authoredFromStored(row.Overrides, custom).without(custom).document(), true, nil
	})
}

func (t *TimelineActivityTypes) change(
	ctx context.Context, id string, apply func(row timelineActivityTypeRow, custom string) (overrides any, isActive bool, err error),
) (TimelineActivityType, error) {
	var changed TimelineActivityType
	err := pgx.BeginFunc(ctx, t.pool, func(tx pgx.Tx) error {
		var custom string
		if err := tx.QueryRow(ctx, customApplicationUniversalIdentifier, workspace.PinnedWorkspaceID).Scan(&custom); err != nil {
			return fmt.Errorf("read custom application: %w", err)
		}
		row, err := queryOne[timelineActivityTypeRow](ctx, tx, "timeline activity type not found",
			selectTimelineActivityTypes+` AND t.id = $2::uuid FOR UPDATE OF t`, workspace.PinnedWorkspaceID, id)
		if err != nil {
			return err
		}
		overrides, isActive, err := apply(row, custom)
		if err != nil {
			return err
		}
		if _, err := tx.Exec(ctx, `UPDATE core."timelineActivityType" SET overrides = $2::jsonb, "isActive" = $3, "updatedAt" = now() WHERE id = $1::uuid`,
			id, overrides, isActive); err != nil {
			return fmt.Errorf("update timeline activity type: %w", err)
		}
		row, err = queryOne[timelineActivityTypeRow](ctx, tx, "timeline activity type not found",
			selectTimelineActivityTypes+` AND t.id = $2::uuid`, workspace.PinnedWorkspaceID, id)
		if err != nil {
			return err
		}
		changed = row.timelineActivityType(custom)
		return nil
	})
	return changed, err
}
