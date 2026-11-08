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

const opportunityColumns = `"id", "createdAt", "updatedAt", "deletedAt", "name", "amountAmountMicros", "amountCurrencyCode", "closeDate", "stage", "position", "createdBySource", "createdByWorkspaceMemberId", "createdByName", "createdByContext", "updatedBySource", "updatedByWorkspaceMemberId", "updatedByName", "updatedByContext", "searchVector", "companyId", "pointOfContactId", "ownerId"`

const defaultOpportunityStage = db.Workspace2abogkkt2zd45pa9aun09djpfOpportunityStageEnumNEW

type opportunityRow = db.Workspace2abogkkt2zd45pa9aun09djpfOpportunity

type Opportunities struct {
	recordSet[opportunityRow, records.Opportunity]
	queries *db.Queries
}

var _ records.Opportunities = (*Opportunities)(nil)

func NewOpportunities(pool *pgxpool.Pool) *Opportunities {
	return &Opportunities{
		recordSet: newRecordSet(pool, "opportunity", opportunityColumns, scanOpportunity, toOpportunity, func(opportunity records.Opportunity) string { return opportunity.ID }),
		queries:   db.New(pool),
	}
}

func (o *Opportunities) Create(ctx context.Context, actor records.Actor, input records.OpportunityInput) (records.Opportunity, error) {
	position, err := nextPosition(ctx, o.pool, o.table)
	if err != nil {
		return records.Opportunity{}, err
	}
	merged, err := mergeOpportunity(opportunityRow{Stage: defaultOpportunityStage}, input)
	if err != nil {
		return records.Opportunity{}, err
	}
	memberID, err := optionalUUID(actor.WorkspaceMemberID)
	if err != nil {
		return records.Opportunity{}, err
	}
	row, err := o.queries.CreateOpportunity(ctx, db.CreateOpportunityParams{
		Name: merged.Name, AmountAmountMicros: merged.AmountAmountMicros, AmountCurrencyCode: merged.AmountCurrencyCode,
		CloseDate: merged.CloseDate, Stage: merged.Stage, Position: position,
		CreatedBySource: db.Workspace2abogkkt2zd45pa9aun09djpfOpportunityCreatedBySourceEnum(actor.Source), CreatedByWorkspaceMemberId: memberID, CreatedByName: actor.Name,
		UpdatedBySource: db.Workspace2abogkkt2zd45pa9aun09djpfOpportunityUpdatedBySourceEnum(actor.Source), UpdatedByWorkspaceMemberId: memberID, UpdatedByName: actor.Name,
		CompanyId: merged.CompanyId, PointOfContactId: merged.PointOfContactId, OwnerId: merged.OwnerId,
	})
	if err != nil {
		return records.Opportunity{}, fmt.Errorf("create opportunity: %w", err)
	}
	return toOpportunity(row)
}

func (o *Opportunities) Update(ctx context.Context, actor records.Actor, id string, input records.OpportunityInput) (records.Opportunity, error) {
	uuid, err := parseUUID(id)
	if err != nil {
		return records.Opportunity{}, err
	}
	tx, err := o.pool.Begin(ctx)
	if err != nil {
		return records.Opportunity{}, fmt.Errorf("begin update: %w", err)
	}
	defer func() { _ = tx.Rollback(ctx) }()

	current, err := scanOpportunity(tx.QueryRow(ctx, `SELECT `+opportunityColumns+` FROM `+o.table+` WHERE "id" = $1 FOR UPDATE`, uuid))
	if errors.Is(err, pgx.ErrNoRows) {
		return records.Opportunity{}, records.ErrNotFound
	}
	if err != nil {
		return records.Opportunity{}, fmt.Errorf("load opportunity: %w", err)
	}
	merged, err := mergeOpportunity(current, input)
	if err != nil {
		return records.Opportunity{}, err
	}
	memberID, err := optionalUUID(actor.WorkspaceMemberID)
	if err != nil {
		return records.Opportunity{}, err
	}
	row, err := o.queries.WithTx(tx).UpdateOpportunity(ctx, db.UpdateOpportunityParams{
		Name: merged.Name, AmountAmountMicros: merged.AmountAmountMicros, AmountCurrencyCode: merged.AmountCurrencyCode,
		CloseDate: merged.CloseDate, Stage: merged.Stage, Position: current.Position,
		UpdatedBySource: db.Workspace2abogkkt2zd45pa9aun09djpfOpportunityUpdatedBySourceEnum(actor.Source), UpdatedByWorkspaceMemberId: memberID, UpdatedByName: actor.Name, UpdatedByContext: current.UpdatedByContext,
		CompanyId: merged.CompanyId, PointOfContactId: merged.PointOfContactId, OwnerId: merged.OwnerId, ID: uuid,
	})
	if err != nil {
		return records.Opportunity{}, fmt.Errorf("update opportunity: %w", err)
	}
	if err := tx.Commit(ctx); err != nil {
		return records.Opportunity{}, fmt.Errorf("commit update: %w", err)
	}
	return toOpportunity(row)
}

func (o *Opportunities) SoftDelete(ctx context.Context, id string) error {
	return o.affect(ctx, id, o.queries.SoftDeleteOpportunity)
}

func (o *Opportunities) Restore(ctx context.Context, id string) error {
	return o.affect(ctx, id, o.queries.RestoreOpportunity)
}

func (o *Opportunities) Destroy(ctx context.Context, id string) error {
	return o.affect(ctx, id, o.queries.DestroyOpportunity)
}

func scanOpportunity(row pgx.Row) (opportunityRow, error) {
	var i opportunityRow
	err := row.Scan(&i.ID, &i.CreatedAt, &i.UpdatedAt, &i.DeletedAt, &i.Name, &i.AmountAmountMicros, &i.AmountCurrencyCode, &i.CloseDate, &i.Stage, &i.Position,
		&i.CreatedBySource, &i.CreatedByWorkspaceMemberId, &i.CreatedByName, &i.CreatedByContext, &i.UpdatedBySource, &i.UpdatedByWorkspaceMemberId,
		&i.UpdatedByName, &i.UpdatedByContext, &i.SearchVector, &i.CompanyId, &i.PointOfContactId, &i.OwnerId)
	return i, err
}

func mergeOpportunity(base opportunityRow, input records.OpportunityInput) (opportunityRow, error) {
	row := base
	var err error
	if input.Name != nil {
		row.Name = text(*input.Name)
	}
	if input.Amount != nil {
		row.AmountCurrencyCode = text(input.Amount.CurrencyCode)
		if row.AmountAmountMicros, err = numeric(input.Amount.AmountMicros); err != nil {
			return row, err
		}
	}
	if input.CloseDate != nil {
		row.CloseDate = pgtype.Timestamptz{Time: *input.CloseDate, Valid: true}
	}
	if input.Stage != nil {
		row.Stage = db.Workspace2abogkkt2zd45pa9aun09djpfOpportunityStageEnum(*input.Stage)
	}
	for _, relation := range []struct {
		target *pgtype.UUID
		value  *string
	}{{&row.CompanyId, input.CompanyID}, {&row.PointOfContactId, input.PointOfContactID}, {&row.OwnerId, input.OwnerID}} {
		if relation.value == nil {
			continue
		}
		if *relation.target, err = optionalUUID(*relation.value); err != nil {
			return row, err
		}
	}
	return row, nil
}

func toOpportunity(row opportunityRow) (records.Opportunity, error) {
	amountMicros, err := float(row.AmountAmountMicros)
	if err != nil {
		return records.Opportunity{}, err
	}
	opportunity := records.Opportunity{
		ID:               row.ID.String(),
		Name:             row.Name.String,
		Amount:           records.Currency{AmountMicros: amountMicros, CurrencyCode: row.AmountCurrencyCode.String},
		Stage:            string(row.Stage),
		Position:         row.Position,
		CompanyID:        optionalID(row.CompanyId),
		PointOfContactID: optionalID(row.PointOfContactId),
		OwnerID:          optionalID(row.OwnerId),
		CreatedBy:        records.Actor{Source: string(row.CreatedBySource), WorkspaceMemberID: uuidString(row.CreatedByWorkspaceMemberId), Name: row.CreatedByName},
		UpdatedBy:        records.Actor{Source: string(row.UpdatedBySource), WorkspaceMemberID: uuidString(row.UpdatedByWorkspaceMemberId), Name: row.UpdatedByName},
		CreatedAt:        row.CreatedAt.Time,
		UpdatedAt:        row.UpdatedAt.Time,
	}
	if row.CloseDate.Valid {
		opportunity.CloseDate = &row.CloseDate.Time
	}
	if row.DeletedAt.Valid {
		opportunity.DeletedAt = &row.DeletedAt.Time
	}
	return opportunity, nil
}
