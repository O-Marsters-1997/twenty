package store

import (
	"context"
	"errors"
	"fmt"
	"strconv"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgtype"
	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/twentyhq/twenty/packages/twenty-server-go/internal/records"
	"github.com/twentyhq/twenty/packages/twenty-server-go/internal/records/store/db"
)

const companyColumns = `"id", "createdAt", "updatedAt", "deletedAt", "name", "domainNamePrimaryLinkLabel", "domainNamePrimaryLinkUrl", "domainNameSecondaryLinks", "addressAddressStreet1", "addressAddressStreet2", "addressAddressCity", "addressAddressPostcode", "addressAddressState", "addressAddressCountry", "addressAddressLat", "addressAddressLng", "linkedinLinkPrimaryLinkLabel", "linkedinLinkPrimaryLinkUrl", "linkedinLinkSecondaryLinks", "annualRevenueAmountMicros", "annualRevenueCurrencyCode", "position", "createdBySource", "createdByWorkspaceMemberId", "createdByName", "createdByContext", "updatedBySource", "updatedByWorkspaceMemberId", "updatedByName", "updatedByContext", "searchVector", "accountOwnerId"`

type companyRow = db.Workspace2abogkkt2zd45pa9aun09djpfCompany

type Companies struct {
	recordSet[companyRow, records.Company]
	queries *db.Queries
}

var _ records.Companies = (*Companies)(nil)

func NewCompanies(pool *pgxpool.Pool) *Companies {
	return &Companies{
		recordSet: newRecordSet(pool, "company", companyColumns, scanCompany, toCompany, func(company records.Company) string { return company.ID }),
		queries:   db.New(pool),
	}
}

func (c *Companies) Create(ctx context.Context, actor records.Actor, input records.CompanyInput) (records.Company, error) {
	position, err := nextPosition(ctx, c.pool, c.table)
	if err != nil {
		return records.Company{}, err
	}
	merged, err := mergeCompany(companyRow{}, input)
	if err != nil {
		return records.Company{}, err
	}
	memberID, err := optionalUUID(actor.WorkspaceMemberID)
	if err != nil {
		return records.Company{}, err
	}
	row, err := c.queries.CreateCompany(ctx, db.CreateCompanyParams{
		Name:                       merged.Name,
		DomainNamePrimaryLinkLabel: merged.DomainNamePrimaryLinkLabel, DomainNamePrimaryLinkUrl: merged.DomainNamePrimaryLinkUrl, DomainNameSecondaryLinks: merged.DomainNameSecondaryLinks,
		AddressAddressStreet1: merged.AddressAddressStreet1, AddressAddressStreet2: merged.AddressAddressStreet2, AddressAddressCity: merged.AddressAddressCity,
		AddressAddressPostcode: merged.AddressAddressPostcode, AddressAddressState: merged.AddressAddressState, AddressAddressCountry: merged.AddressAddressCountry,
		AddressAddressLat: merged.AddressAddressLat, AddressAddressLng: merged.AddressAddressLng,
		LinkedinLinkPrimaryLinkLabel: merged.LinkedinLinkPrimaryLinkLabel, LinkedinLinkPrimaryLinkUrl: merged.LinkedinLinkPrimaryLinkUrl, LinkedinLinkSecondaryLinks: merged.LinkedinLinkSecondaryLinks,
		AnnualRevenueAmountMicros: merged.AnnualRevenueAmountMicros, AnnualRevenueCurrencyCode: merged.AnnualRevenueCurrencyCode,
		Position:        position,
		CreatedBySource: db.Workspace2abogkkt2zd45pa9aun09djpfCompanyCreatedBySourceEnum(actor.Source), CreatedByWorkspaceMemberId: memberID, CreatedByName: actor.Name,
		UpdatedBySource: db.Workspace2abogkkt2zd45pa9aun09djpfCompanyUpdatedBySourceEnum(actor.Source), UpdatedByWorkspaceMemberId: memberID, UpdatedByName: actor.Name,
		AccountOwnerId: merged.AccountOwnerId,
	})
	if err != nil {
		return records.Company{}, fmt.Errorf("create company: %w", err)
	}
	return toCompany(row)
}

func (c *Companies) Update(ctx context.Context, actor records.Actor, id string, input records.CompanyInput) (records.Company, error) {
	uuid, err := parseUUID(id)
	if err != nil {
		return records.Company{}, err
	}
	tx, err := c.pool.Begin(ctx)
	if err != nil {
		return records.Company{}, fmt.Errorf("begin update: %w", err)
	}
	defer func() { _ = tx.Rollback(ctx) }()

	current, err := scanCompany(tx.QueryRow(ctx, `SELECT `+companyColumns+` FROM `+c.table+` WHERE "id" = $1 FOR UPDATE`, uuid))
	if errors.Is(err, pgx.ErrNoRows) {
		return records.Company{}, records.ErrNotFound
	}
	if err != nil {
		return records.Company{}, fmt.Errorf("load company: %w", err)
	}
	merged, err := mergeCompany(current, input)
	if err != nil {
		return records.Company{}, err
	}
	memberID, err := optionalUUID(actor.WorkspaceMemberID)
	if err != nil {
		return records.Company{}, err
	}
	row, err := c.queries.WithTx(tx).UpdateCompany(ctx, db.UpdateCompanyParams{
		Name:                       merged.Name,
		DomainNamePrimaryLinkLabel: merged.DomainNamePrimaryLinkLabel, DomainNamePrimaryLinkUrl: merged.DomainNamePrimaryLinkUrl, DomainNameSecondaryLinks: merged.DomainNameSecondaryLinks,
		AddressAddressStreet1: merged.AddressAddressStreet1, AddressAddressStreet2: merged.AddressAddressStreet2, AddressAddressCity: merged.AddressAddressCity,
		AddressAddressPostcode: merged.AddressAddressPostcode, AddressAddressState: merged.AddressAddressState, AddressAddressCountry: merged.AddressAddressCountry,
		AddressAddressLat: merged.AddressAddressLat, AddressAddressLng: merged.AddressAddressLng,
		LinkedinLinkPrimaryLinkLabel: merged.LinkedinLinkPrimaryLinkLabel, LinkedinLinkPrimaryLinkUrl: merged.LinkedinLinkPrimaryLinkUrl, LinkedinLinkSecondaryLinks: merged.LinkedinLinkSecondaryLinks,
		AnnualRevenueAmountMicros: merged.AnnualRevenueAmountMicros, AnnualRevenueCurrencyCode: merged.AnnualRevenueCurrencyCode,
		Position:        current.Position,
		UpdatedBySource: db.Workspace2abogkkt2zd45pa9aun09djpfCompanyUpdatedBySourceEnum(actor.Source), UpdatedByWorkspaceMemberId: memberID, UpdatedByName: actor.Name, UpdatedByContext: current.UpdatedByContext,
		AccountOwnerId: merged.AccountOwnerId, ID: uuid,
	})
	if err != nil {
		return records.Company{}, fmt.Errorf("update company: %w", err)
	}
	if err := tx.Commit(ctx); err != nil {
		return records.Company{}, fmt.Errorf("commit update: %w", err)
	}
	return toCompany(row)
}

func (c *Companies) SoftDelete(ctx context.Context, id string) error {
	return c.affect(ctx, id, c.queries.SoftDeleteCompany)
}

func (c *Companies) Restore(ctx context.Context, id string) error {
	return c.affect(ctx, id, c.queries.RestoreCompany)
}

func (c *Companies) Destroy(ctx context.Context, id string) error {
	return c.affect(ctx, id, c.queries.DestroyCompany)
}

func nextPosition(ctx context.Context, pool *pgxpool.Pool, table string) (float64, error) {
	var position float64
	if err := pool.QueryRow(ctx, `SELECT COALESCE(MIN("position") - 1, 0) FROM `+table).Scan(&position); err != nil {
		return 0, fmt.Errorf("compute position: %w", err)
	}
	return position, nil
}

func scanCompany(row pgx.Row) (companyRow, error) {
	var i companyRow
	err := row.Scan(&i.ID, &i.CreatedAt, &i.UpdatedAt, &i.DeletedAt, &i.Name, &i.DomainNamePrimaryLinkLabel, &i.DomainNamePrimaryLinkUrl, &i.DomainNameSecondaryLinks,
		&i.AddressAddressStreet1, &i.AddressAddressStreet2, &i.AddressAddressCity, &i.AddressAddressPostcode, &i.AddressAddressState, &i.AddressAddressCountry,
		&i.AddressAddressLat, &i.AddressAddressLng, &i.LinkedinLinkPrimaryLinkLabel, &i.LinkedinLinkPrimaryLinkUrl, &i.LinkedinLinkSecondaryLinks,
		&i.AnnualRevenueAmountMicros, &i.AnnualRevenueCurrencyCode, &i.Position, &i.CreatedBySource, &i.CreatedByWorkspaceMemberId, &i.CreatedByName,
		&i.CreatedByContext, &i.UpdatedBySource, &i.UpdatedByWorkspaceMemberId, &i.UpdatedByName, &i.UpdatedByContext, &i.SearchVector, &i.AccountOwnerId)
	return i, err
}

func mergeLinks(input *records.Links) (label, url pgtype.Text, secondary []byte, err error) {
	links := make([]linkJSON, len(input.SecondaryLinks))
	for i, link := range input.SecondaryLinks {
		links[i] = linkJSON(link)
	}
	secondary, err = marshalList(links)
	return text(input.PrimaryLink.Label), text(input.PrimaryLink.URL), secondary, err
}

func mergeCompany(base companyRow, input records.CompanyInput) (companyRow, error) {
	row := base
	var err error
	if input.Name != nil {
		row.Name = text(*input.Name)
	}
	if input.DomainName != nil {
		if row.DomainNamePrimaryLinkLabel, row.DomainNamePrimaryLinkUrl, row.DomainNameSecondaryLinks, err = mergeLinks(input.DomainName); err != nil {
			return row, err
		}
	}
	if input.Linkedin != nil {
		if row.LinkedinLinkPrimaryLinkLabel, row.LinkedinLinkPrimaryLinkUrl, row.LinkedinLinkSecondaryLinks, err = mergeLinks(input.Linkedin); err != nil {
			return row, err
		}
	}
	if address := input.Address; address != nil {
		row.AddressAddressStreet1, row.AddressAddressStreet2, row.AddressAddressCity = text(address.Street1), text(address.Street2), text(address.City)
		row.AddressAddressPostcode, row.AddressAddressState, row.AddressAddressCountry = text(address.Postcode), text(address.State), text(address.Country)
		if row.AddressAddressLat, err = numeric(address.Lat); err != nil {
			return row, err
		}
		if row.AddressAddressLng, err = numeric(address.Lng); err != nil {
			return row, err
		}
	}
	if input.AnnualRevenue != nil {
		row.AnnualRevenueCurrencyCode = text(input.AnnualRevenue.CurrencyCode)
		if row.AnnualRevenueAmountMicros, err = numeric(input.AnnualRevenue.AmountMicros); err != nil {
			return row, err
		}
	}
	if input.AccountOwnerID != nil {
		if row.AccountOwnerId, err = optionalUUID(*input.AccountOwnerID); err != nil {
			return row, err
		}
	}
	return row, nil
}

func numeric(value *float64) (pgtype.Numeric, error) {
	var result pgtype.Numeric
	if value == nil {
		return result, nil
	}
	if err := result.Scan(strconv.FormatFloat(*value, 'f', -1, 64)); err != nil {
		return result, fmt.Errorf("encode number: %w", err)
	}
	return result, nil
}

func float(value pgtype.Numeric) (*float64, error) {
	if !value.Valid {
		return nil, nil
	}
	number, err := value.Float64Value()
	if err != nil {
		return nil, fmt.Errorf("decode number: %w", err)
	}
	return &number.Float64, nil
}

func optionalID(id pgtype.UUID) *string {
	if !id.Valid {
		return nil
	}
	value := id.String()
	return &value
}

func toLinks(label, url pgtype.Text, secondary []byte) (records.Links, error) {
	links := records.Links{PrimaryLink: records.Link{Label: label.String, URL: url.String}}
	items, err := unmarshalList[linkJSON](secondary)
	for _, link := range items {
		links.SecondaryLinks = append(links.SecondaryLinks, records.Link(link))
	}
	return links, err
}

func toCompany(row companyRow) (records.Company, error) {
	var err error
	company := records.Company{
		ID:   row.ID.String(),
		Name: row.Name.String,
		Address: records.Address{
			Street1: row.AddressAddressStreet1.String, Street2: row.AddressAddressStreet2.String, City: row.AddressAddressCity.String,
			Postcode: row.AddressAddressPostcode.String, State: row.AddressAddressState.String, Country: row.AddressAddressCountry.String,
		},
		AnnualRevenue:  records.Currency{CurrencyCode: row.AnnualRevenueCurrencyCode.String},
		Position:       row.Position,
		AccountOwnerID: optionalID(row.AccountOwnerId),
		CreatedBy:      records.Actor{Source: string(row.CreatedBySource), WorkspaceMemberID: uuidString(row.CreatedByWorkspaceMemberId), Name: row.CreatedByName},
		UpdatedBy:      records.Actor{Source: string(row.UpdatedBySource), WorkspaceMemberID: uuidString(row.UpdatedByWorkspaceMemberId), Name: row.UpdatedByName},
		CreatedAt:      row.CreatedAt.Time,
		UpdatedAt:      row.UpdatedAt.Time,
	}
	if company.DomainName, err = toLinks(row.DomainNamePrimaryLinkLabel, row.DomainNamePrimaryLinkUrl, row.DomainNameSecondaryLinks); err != nil {
		return records.Company{}, err
	}
	if company.Linkedin, err = toLinks(row.LinkedinLinkPrimaryLinkLabel, row.LinkedinLinkPrimaryLinkUrl, row.LinkedinLinkSecondaryLinks); err != nil {
		return records.Company{}, err
	}
	if company.Address.Lat, err = float(row.AddressAddressLat); err != nil {
		return records.Company{}, err
	}
	if company.Address.Lng, err = float(row.AddressAddressLng); err != nil {
		return records.Company{}, err
	}
	if company.AnnualRevenue.AmountMicros, err = float(row.AnnualRevenueAmountMicros); err != nil {
		return records.Company{}, err
	}
	if row.DeletedAt.Valid {
		company.DeletedAt = &row.DeletedAt.Time
	}
	return company, nil
}
