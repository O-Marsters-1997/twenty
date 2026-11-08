package store

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"slices"
	"strings"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgtype"
	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/twentyhq/twenty/packages/twenty-server-go/internal/model"
	"github.com/twentyhq/twenty/packages/twenty-server-go/internal/records"
	"github.com/twentyhq/twenty/packages/twenty-server-go/internal/records/store/db"
	"github.com/twentyhq/twenty/packages/twenty-server-go/internal/workspace"
)

const defaultPageSize = 60

const personColumns = `"id", "createdAt", "updatedAt", "deletedAt", "nameFirstName", "nameLastName", "emailsPrimaryEmail", "emailsAdditionalEmails", "linkedinLinkPrimaryLinkLabel", "linkedinLinkPrimaryLinkUrl", "linkedinLinkSecondaryLinks", "jobTitle", "phonesPrimaryPhoneNumber", "phonesPrimaryPhoneCountryCode", "phonesPrimaryPhoneCallingCode", "phonesAdditionalPhones", "avatarUrl", "avatarFile", "position", "createdBySource", "createdByWorkspaceMemberId", "createdByName", "createdByContext", "updatedBySource", "updatedByWorkspaceMemberId", "updatedByName", "updatedByContext", "searchVector", "companyId"`

type personRow = db.Workspace2abogkkt2zd45pa9aun09djpfPerson

type People struct {
	pool    *pgxpool.Pool
	queries *db.Queries
	object  model.Object
	table   string
}

var _ records.People = (*People)(nil)

func NewPeople(pool *pgxpool.Pool) *People {
	index := slices.IndexFunc(model.Objects, func(object model.Object) bool { return object.NameSingular == "person" })
	if index < 0 {
		panic("object model has no person object")
	}
	return &People{pool: pool, queries: db.New(pool), object: model.Objects[index], table: workspace.SchemaName() + `."person"`}
}

func (p *People) Get(ctx context.Context, id string) (records.Person, error) {
	uuid, err := parseUUID(id)
	if err != nil {
		return records.Person{}, err
	}
	row, err := p.queries.GetPerson(ctx, uuid)
	if errors.Is(err, pgx.ErrNoRows) {
		return records.Person{}, records.ErrNotFound
	}
	if err != nil {
		return records.Person{}, fmt.Errorf("get person: %w", err)
	}
	return toPerson(row)
}

func (p *People) Create(ctx context.Context, actor records.Actor, input records.PersonInput) (records.Person, error) {
	var position float64
	if err := p.pool.QueryRow(ctx, `SELECT COALESCE(MIN("position") - 1, 0) FROM `+p.table).Scan(&position); err != nil {
		return records.Person{}, fmt.Errorf("compute position: %w", err)
	}
	params := db.CreatePersonParams{Position: position}
	merged, err := mergeInput(personRow{}, input)
	if err != nil {
		return records.Person{}, err
	}
	params.NameFirstName, params.NameLastName = merged.NameFirstName, merged.NameLastName
	params.EmailsPrimaryEmail, params.EmailsAdditionalEmails = merged.EmailsPrimaryEmail, merged.EmailsAdditionalEmails
	params.LinkedinLinkPrimaryLinkLabel, params.LinkedinLinkPrimaryLinkUrl = merged.LinkedinLinkPrimaryLinkLabel, merged.LinkedinLinkPrimaryLinkUrl
	params.LinkedinLinkSecondaryLinks = merged.LinkedinLinkSecondaryLinks
	params.JobTitle = merged.JobTitle
	params.PhonesPrimaryPhoneNumber, params.PhonesPrimaryPhoneCountryCode = merged.PhonesPrimaryPhoneNumber, merged.PhonesPrimaryPhoneCountryCode
	params.PhonesPrimaryPhoneCallingCode, params.PhonesAdditionalPhones = merged.PhonesPrimaryPhoneCallingCode, merged.PhonesAdditionalPhones
	params.CompanyId = merged.CompanyId
	memberID, err := optionalUUID(actor.WorkspaceMemberID)
	if err != nil {
		return records.Person{}, err
	}
	params.CreatedBySource = db.Workspace2abogkkt2zd45pa9aun09djpfPersonCreatedBySourceEnum(actor.Source)
	params.CreatedByWorkspaceMemberId, params.CreatedByName = memberID, actor.Name
	params.UpdatedBySource = db.Workspace2abogkkt2zd45pa9aun09djpfPersonUpdatedBySourceEnum(actor.Source)
	params.UpdatedByWorkspaceMemberId, params.UpdatedByName = memberID, actor.Name

	row, err := p.queries.CreatePerson(ctx, params)
	if err != nil {
		return records.Person{}, fmt.Errorf("create person: %w", err)
	}
	return toPerson(row)
}

func (p *People) Update(ctx context.Context, actor records.Actor, id string, input records.PersonInput) (records.Person, error) {
	uuid, err := parseUUID(id)
	if err != nil {
		return records.Person{}, err
	}
	tx, err := p.pool.Begin(ctx)
	if err != nil {
		return records.Person{}, fmt.Errorf("begin update: %w", err)
	}
	defer func() { _ = tx.Rollback(ctx) }()
	queries := p.queries.WithTx(tx)

	current, err := scanPerson(tx.QueryRow(ctx, `SELECT `+personColumns+` FROM `+p.table+` WHERE "id" = $1 FOR UPDATE`, uuid))
	if errors.Is(err, pgx.ErrNoRows) {
		return records.Person{}, records.ErrNotFound
	}
	if err != nil {
		return records.Person{}, fmt.Errorf("load person: %w", err)
	}
	merged, err := mergeInput(current, input)
	if err != nil {
		return records.Person{}, err
	}
	memberID, err := optionalUUID(actor.WorkspaceMemberID)
	if err != nil {
		return records.Person{}, err
	}
	row, err := queries.UpdatePerson(ctx, db.UpdatePersonParams{
		NameFirstName: merged.NameFirstName, NameLastName: merged.NameLastName,
		EmailsPrimaryEmail: merged.EmailsPrimaryEmail, EmailsAdditionalEmails: merged.EmailsAdditionalEmails,
		LinkedinLinkPrimaryLinkLabel: merged.LinkedinLinkPrimaryLinkLabel, LinkedinLinkPrimaryLinkUrl: merged.LinkedinLinkPrimaryLinkUrl,
		LinkedinLinkSecondaryLinks: merged.LinkedinLinkSecondaryLinks, JobTitle: merged.JobTitle,
		PhonesPrimaryPhoneNumber: merged.PhonesPrimaryPhoneNumber, PhonesPrimaryPhoneCountryCode: merged.PhonesPrimaryPhoneCountryCode,
		PhonesPrimaryPhoneCallingCode: merged.PhonesPrimaryPhoneCallingCode, PhonesAdditionalPhones: merged.PhonesAdditionalPhones,
		AvatarUrl: current.AvatarUrl, AvatarFile: current.AvatarFile, Position: current.Position,
		UpdatedBySource:            db.Workspace2abogkkt2zd45pa9aun09djpfPersonUpdatedBySourceEnum(actor.Source),
		UpdatedByWorkspaceMemberId: memberID, UpdatedByName: actor.Name, UpdatedByContext: current.UpdatedByContext,
		CompanyId: merged.CompanyId, ID: uuid,
	})
	if err != nil {
		return records.Person{}, fmt.Errorf("update person: %w", err)
	}
	if err := tx.Commit(ctx); err != nil {
		return records.Person{}, fmt.Errorf("commit update: %w", err)
	}
	return toPerson(row)
}

func (p *People) SoftDelete(ctx context.Context, id string) error {
	return p.affect(ctx, id, p.queries.SoftDeletePerson)
}

func (p *People) Restore(ctx context.Context, id string) error {
	return p.affect(ctx, id, p.queries.RestorePerson)
}

func (p *People) Destroy(ctx context.Context, id string) error {
	return p.affect(ctx, id, p.queries.DestroyPerson)
}

func (p *People) affect(ctx context.Context, id string, run func(context.Context, pgtype.UUID) (int64, error)) error {
	uuid, err := parseUUID(id)
	if err != nil {
		return err
	}
	affected, err := run(ctx, uuid)
	if err != nil {
		return fmt.Errorf("write person: %w", err)
	}
	if affected == 0 {
		return records.ErrNotFound
	}
	return nil
}

func (p *People) Find(ctx context.Context, filter records.Filter, orderBy []records.OrderBy, page records.PageRequest) (records.Page[records.Person], error) {
	where := &compiler{object: p.object}
	condition, err := where.filter(filter)
	if err != nil {
		return records.Page[records.Person]{}, err
	}
	if !where.mentionsDeletedAt {
		condition = joinAnd(condition, `"deletedAt" IS NULL`)
	}
	columns, err := where.order(orderBy)
	if err != nil {
		return records.Page[records.Person]{}, err
	}

	var total int
	if err := p.pool.QueryRow(ctx, `SELECT count(*) FROM `+p.table+` WHERE `+orElse(condition, "TRUE"), where.args...).Scan(&total); err != nil {
		return records.Page[records.Person]{}, fmt.Errorf("count people: %w", err)
	}

	backward := page.Last > 0 || page.Before != ""
	limit, cursor := page.First, page.After
	if backward {
		limit, cursor = page.Last, page.Before
	}
	if limit <= 0 {
		limit = defaultPageSize
	}
	ordered := columns
	if backward {
		ordered = make([]orderColumn, len(columns))
		for i, column := range columns {
			ordered[i] = column.reversed()
		}
	}
	if cursor != "" {
		values, err := p.cursorValues(ctx, cursor, columns)
		if err != nil {
			return records.Page[records.Person]{}, err
		}
		condition = joinAnd(condition, where.after(ordered, values))
	}

	orderSQL := make([]string, len(ordered))
	for i, column := range ordered {
		orderSQL[i] = column.sql()
	}
	rows, err := p.pool.Query(ctx, `SELECT `+personColumns+` FROM `+p.table+` WHERE `+orElse(condition, "TRUE")+` ORDER BY `+strings.Join(orderSQL, ", ")+` LIMIT `+fmt.Sprint(limit+1), where.args...)
	if err != nil {
		return records.Page[records.Person]{}, fmt.Errorf("query people: %w", err)
	}
	dbRows, err := pgx.CollectRows(rows, func(row pgx.CollectableRow) (personRow, error) { return scanPerson(row) })
	if err != nil {
		return records.Page[records.Person]{}, fmt.Errorf("read people: %w", err)
	}

	more := len(dbRows) > limit
	if more {
		dbRows = dbRows[:limit]
	}
	if backward {
		slices.Reverse(dbRows)
	}
	result := records.Page[records.Person]{TotalCount: total, HasNext: more, HasPrevious: page.After != ""}
	if backward {
		result.HasNext, result.HasPrevious = page.Before != "", more
	}
	for _, row := range dbRows {
		person, err := toPerson(row)
		if err != nil {
			return records.Page[records.Person]{}, err
		}
		result.Records = append(result.Records, person)
	}
	if n := len(result.Records); n > 0 {
		result.StartCursor, result.EndCursor = records.Cursor(result.Records[0].ID), records.Cursor(result.Records[n-1].ID)
	}
	return result, nil
}

func (p *People) cursorValues(ctx context.Context, cursor string, columns []orderColumn) ([]any, error) {
	id, err := records.CursorID(cursor)
	if err != nil {
		return nil, err
	}
	exprs := make([]string, len(columns))
	for i, column := range columns {
		exprs[i] = column.expr
	}
	var raw []byte
	err = p.pool.QueryRow(ctx, `SELECT jsonb_build_array(`+strings.Join(exprs, ", ")+`) FROM `+p.table+` WHERE "id" = $1`, id).Scan(&raw)
	if err != nil {
		return nil, fmt.Errorf("resolve cursor: %w", err)
	}
	var values []any
	if err := json.Unmarshal(raw, &values); err != nil {
		return nil, fmt.Errorf("decode cursor row: %w", err)
	}
	return values, nil
}

func joinAnd(left, right string) string {
	if left == "" {
		return right
	}
	return "(" + left + ") AND " + right
}

func orElse(value, fallback string) string {
	if value == "" {
		return fallback
	}
	return value
}

func parseUUID(id string) (pgtype.UUID, error) {
	var uuid pgtype.UUID
	if err := uuid.Scan(id); err != nil {
		return uuid, records.ErrNotFound
	}
	return uuid, nil
}

func optionalUUID(id string) (pgtype.UUID, error) {
	if id == "" {
		return pgtype.UUID{}, nil
	}
	return parseUUID(id)
}

func scanPerson(row pgx.Row) (personRow, error) {
	var i personRow
	err := row.Scan(&i.ID, &i.CreatedAt, &i.UpdatedAt, &i.DeletedAt, &i.NameFirstName, &i.NameLastName, &i.EmailsPrimaryEmail, &i.EmailsAdditionalEmails,
		&i.LinkedinLinkPrimaryLinkLabel, &i.LinkedinLinkPrimaryLinkUrl, &i.LinkedinLinkSecondaryLinks, &i.JobTitle, &i.PhonesPrimaryPhoneNumber,
		&i.PhonesPrimaryPhoneCountryCode, &i.PhonesPrimaryPhoneCallingCode, &i.PhonesAdditionalPhones, &i.AvatarUrl, &i.AvatarFile, &i.Position,
		&i.CreatedBySource, &i.CreatedByWorkspaceMemberId, &i.CreatedByName, &i.CreatedByContext, &i.UpdatedBySource, &i.UpdatedByWorkspaceMemberId,
		&i.UpdatedByName, &i.UpdatedByContext, &i.SearchVector, &i.CompanyId)
	return i, err
}

type phoneJSON struct {
	Number      string `json:"number"`
	CountryCode string `json:"countryCode"`
	CallingCode string `json:"callingCode"`
}

type linkJSON struct {
	Label string `json:"label"`
	URL   string `json:"url"`
}

func text(value string) pgtype.Text { return pgtype.Text{String: value, Valid: true} }

func mergeInput(base personRow, input records.PersonInput) (personRow, error) {
	row := base
	if input.Name != nil {
		row.NameFirstName, row.NameLastName = text(input.Name.FirstName), text(input.Name.LastName)
	}
	if input.JobTitle != nil {
		row.JobTitle = text(*input.JobTitle)
	}
	var err error
	if input.Emails != nil {
		row.EmailsPrimaryEmail = text(input.Emails.PrimaryEmail)
		if row.EmailsAdditionalEmails, err = marshalList(input.Emails.AdditionalEmails); err != nil {
			return row, err
		}
	}
	if input.Linkedin != nil {
		row.LinkedinLinkPrimaryLinkLabel, row.LinkedinLinkPrimaryLinkUrl = text(input.Linkedin.PrimaryLink.Label), text(input.Linkedin.PrimaryLink.URL)
		links := make([]linkJSON, len(input.Linkedin.SecondaryLinks))
		for i, link := range input.Linkedin.SecondaryLinks {
			links[i] = linkJSON(link)
		}
		if row.LinkedinLinkSecondaryLinks, err = marshalList(links); err != nil {
			return row, err
		}
	}
	if input.Phones != nil {
		row.PhonesPrimaryPhoneNumber = text(input.Phones.Primary.Number)
		row.PhonesPrimaryPhoneCountryCode = text(input.Phones.Primary.CountryCode)
		row.PhonesPrimaryPhoneCallingCode = text(input.Phones.Primary.CallingCode)
		phones := make([]phoneJSON, len(input.Phones.Additional))
		for i, phone := range input.Phones.Additional {
			phones[i] = phoneJSON(phone)
		}
		if row.PhonesAdditionalPhones, err = marshalList(phones); err != nil {
			return row, err
		}
	}
	if input.CompanyID != nil {
		if row.CompanyId, err = optionalUUID(*input.CompanyID); err != nil {
			return row, err
		}
	}
	return row, nil
}

func marshalList[TItem any](items []TItem) ([]byte, error) {
	if items == nil {
		items = []TItem{}
	}
	raw, err := json.Marshal(items)
	if err != nil {
		return nil, fmt.Errorf("encode list: %w", err)
	}
	return raw, nil
}

func unmarshalList[TItem any](raw []byte) ([]TItem, error) {
	if len(raw) == 0 {
		return nil, nil
	}
	var items []TItem
	if err := json.Unmarshal(raw, &items); err != nil {
		return nil, fmt.Errorf("decode list: %w", err)
	}
	return items, nil
}

func toPerson(row personRow) (records.Person, error) {
	emails, err := unmarshalList[string](row.EmailsAdditionalEmails)
	if err != nil {
		return records.Person{}, err
	}
	secondaryLinks, err := unmarshalList[linkJSON](row.LinkedinLinkSecondaryLinks)
	if err != nil {
		return records.Person{}, err
	}
	additionalPhones, err := unmarshalList[phoneJSON](row.PhonesAdditionalPhones)
	if err != nil {
		return records.Person{}, err
	}
	person := records.Person{
		ID:        row.ID.String(),
		Name:      records.FullName{FirstName: row.NameFirstName.String, LastName: row.NameLastName.String},
		Emails:    records.Emails{PrimaryEmail: row.EmailsPrimaryEmail.String, AdditionalEmails: emails},
		Linkedin:  records.Links{PrimaryLink: records.Link{Label: row.LinkedinLinkPrimaryLinkLabel.String, URL: row.LinkedinLinkPrimaryLinkUrl.String}},
		JobTitle:  row.JobTitle.String,
		Phones:    records.Phones{Primary: records.Phone{Number: row.PhonesPrimaryPhoneNumber.String, CountryCode: row.PhonesPrimaryPhoneCountryCode.String, CallingCode: row.PhonesPrimaryPhoneCallingCode.String}},
		AvatarURL: row.AvatarUrl.String,
		Position:  row.Position,
		CreatedBy: records.Actor{Source: string(row.CreatedBySource), WorkspaceMemberID: uuidString(row.CreatedByWorkspaceMemberId), Name: row.CreatedByName},
		UpdatedBy: records.Actor{Source: string(row.UpdatedBySource), WorkspaceMemberID: uuidString(row.UpdatedByWorkspaceMemberId), Name: row.UpdatedByName},
		CreatedAt: row.CreatedAt.Time,
		UpdatedAt: row.UpdatedAt.Time,
	}
	for _, link := range secondaryLinks {
		person.Linkedin.SecondaryLinks = append(person.Linkedin.SecondaryLinks, records.Link(link))
	}
	for _, phone := range additionalPhones {
		person.Phones.Additional = append(person.Phones.Additional, records.Phone(phone))
	}
	if row.CompanyId.Valid {
		id := row.CompanyId.String()
		person.CompanyID = &id
	}
	if row.DeletedAt.Valid {
		person.DeletedAt = &row.DeletedAt.Time
	}
	return person, nil
}

func uuidString(id pgtype.UUID) string {
	if !id.Valid {
		return ""
	}
	return id.String()
}
