package modelgen

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"slices"
	"strings"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/twentyhq/twenty/packages/twenty-server-go/internal/model"
)

type tableColumn struct {
	name      string
	generated bool
}

type fieldOption struct {
	Value    string `json:"value"`
	Position int    `json:"position"`
}

type settings struct {
	RelationType   string `json:"relationType"`
	JoinColumnName string `json:"joinColumnName"`
	DataType       string `json:"dataType"`
}

type field struct {
	model.Field
	nullable *bool
	settings settings
	target   string
}

type object struct {
	id      string
	columns []tableColumn
	fields  []field
	model.Object
}

var compositeSubFields = map[model.FieldType][]string{
	model.TypeFullName: {"firstName", "lastName"},
	model.TypeEmails:   {"primaryEmail", "additionalEmails"},
	model.TypePhones:   {"primaryPhoneNumber", "primaryPhoneCountryCode", "primaryPhoneCallingCode", "additionalPhones"},
	model.TypeLinks:    {"primaryLinkLabel", "primaryLinkUrl", "secondaryLinks"},
	model.TypeCurrency: {"amountMicros", "currencyCode"},
	model.TypeAddress: {
		"addressStreet1", "addressStreet2", "addressCity", "addressPostcode",
		"addressState", "addressCountry", "addressLat", "addressLng",
	},
	model.TypeActor:    {"source", "workspaceMemberId", "name", "context"},
	model.TypeRichText: {"blocknote", "markdown"},
}

func load(ctx context.Context, pool *pgxpool.Pool, workspaceID, schema string) ([]*object, error) {
	rows, err := pool.Query(ctx, `
		SELECT id::text, "nameSingular", "namePlural"
		FROM core."objectMetadata"
		WHERE "workspaceId" = $1 AND "isActive"
		ORDER BY "nameSingular"`, workspaceID)
	if err != nil {
		return nil, fmt.Errorf("query objects: %w", err)
	}
	objects, err := pgx.CollectRows(rows, func(row pgx.CollectableRow) (*object, error) {
		o := &object{}
		err := row.Scan(&o.id, &o.NameSingular, &o.NamePlural)
		o.Table = o.NameSingular
		return o, err
	})
	if err != nil {
		return nil, fmt.Errorf("read objects: %w", err)
	}
	byID := make(map[string]*object, len(objects))
	for _, o := range objects {
		byID[o.id] = o
	}

	if err := loadColumns(ctx, pool, schema, objects); err != nil {
		return nil, err
	}
	if err := loadFields(ctx, pool, workspaceID, byID); err != nil {
		return nil, err
	}
	for _, o := range objects {
		if err := o.resolveColumns(); err != nil {
			return nil, fmt.Errorf("object %s: %w", o.NameSingular, err)
		}
	}
	return objects, nil
}

func loadColumns(ctx context.Context, pool *pgxpool.Pool, schema string, objects []*object) error {
	rows, err := pool.Query(ctx, `
		SELECT table_name, column_name, is_generated = 'ALWAYS'
		FROM information_schema.columns
		WHERE table_schema = $1
		ORDER BY table_name, ordinal_position`, schema)
	if err != nil {
		return fmt.Errorf("query table columns: %w", err)
	}
	defer rows.Close()
	byTable := map[string][]tableColumn{}
	for rows.Next() {
		var table string
		var column tableColumn
		if err := rows.Scan(&table, &column.name, &column.generated); err != nil {
			return fmt.Errorf("scan table column: %w", err)
		}
		byTable[table] = append(byTable[table], column)
	}
	if err := rows.Err(); err != nil {
		return fmt.Errorf("read table columns: %w", err)
	}
	for _, o := range objects {
		if o.columns = byTable[o.Table]; o.columns == nil {
			return fmt.Errorf("object %s has no table %s.%s", o.NameSingular, schema, o.Table)
		}
	}
	return nil
}

func loadFields(ctx context.Context, pool *pgxpool.Pool, workspaceID string, byID map[string]*object) error {
	rows, err := pool.Query(ctx, `
		SELECT "objectMetadataId"::text, name, type, options, settings, "isNullable", "relationTargetObjectMetadataId"::text
		FROM core."fieldMetadata"
		WHERE "workspaceId" = $1 AND "isActive"
		ORDER BY name, id`, workspaceID)
	if err != nil {
		return fmt.Errorf("query fields: %w", err)
	}
	defer rows.Close()
	for rows.Next() {
		var objectID, fieldType string
		var rawOptions, rawSettings []byte
		var target *string
		f := field{}
		if err := rows.Scan(&objectID, &f.Name, &fieldType, &rawOptions, &rawSettings, &f.nullable, &target); err != nil {
			return fmt.Errorf("scan field: %w", err)
		}
		f.Type = model.FieldType(fieldType)
		if target != nil {
			f.target = *target
		}
		o, ok := byID[objectID]
		if !ok {
			continue
		}
		if len(rawSettings) > 0 {
			if err := json.Unmarshal(rawSettings, &f.settings); err != nil {
				return fmt.Errorf("decode settings of %s.%s: %w", o.NameSingular, f.Name, err)
			}
		}
		if f.Options, err = decodeOptions(rawOptions); err != nil {
			return fmt.Errorf("decode options of %s.%s: %w", o.NameSingular, f.Name, err)
		}
		o.fields = append(o.fields, f)
	}
	return rows.Err()
}

func decodeOptions(raw []byte) ([]string, error) {
	if len(raw) == 0 {
		return nil, nil
	}
	var options []fieldOption
	if err := json.Unmarshal(raw, &options); err != nil {
		return nil, err
	}
	slices.SortStableFunc(options, func(a, b fieldOption) int {
		return a.Position - b.Position
	})
	values := make([]string, len(options))
	for i, option := range options {
		values[i] = option.Value
	}
	return values, nil
}

func (o *object) resolveColumns() error {
	claimed := map[string]bool{}
	exists := map[string]bool{}
	for _, c := range o.columns {
		exists[c.name] = true
	}
	var errs []error
	for i := range o.fields {
		f := &o.fields[i]
		switch f.Type {
		case model.TypeFullName, model.TypeEmails, model.TypePhones, model.TypeLinks,
			model.TypeCurrency, model.TypeAddress, model.TypeActor, model.TypeRichText:
			for _, sub := range compositeSubFields[f.Type] {
				f.Columns = append(f.Columns, model.Column{Name: f.Name + strings.ToUpper(sub[:1]) + sub[1:], SubField: sub})
			}
		case model.TypeRelation, model.TypeMorph:
			switch f.settings.RelationType {
			case "MANY_TO_ONE":
				f.Columns = []model.Column{{Name: f.settings.JoinColumnName}}
			case "ONE_TO_MANY":
			default:
				errs = append(errs, fmt.Errorf("field %s has unknown relation type %q", f.Name, f.settings.RelationType))
			}
		case model.TypeText, model.TypeNumber, model.TypeNumeric, model.TypeBoolean, model.TypeDateTime,
			model.TypeSelect, model.TypeMultiSelect, model.TypeUUID, model.TypePosition, model.TypeRawJSON,
			model.TypeTSVector, model.TypeArray, model.TypeFiles:
			f.Columns = []model.Column{{Name: f.Name}}
		default:
			errs = append(errs, fmt.Errorf("field %s has unsupported type %s", f.Name, f.Type))
		}
		for _, c := range f.Columns {
			if !exists[c.Name] {
				errs = append(errs, fmt.Errorf("field %s maps to missing column %s", f.Name, c.Name))
			}
			claimed[c.Name] = true
		}
	}
	for _, c := range o.columns {
		if !claimed[c.name] {
			errs = append(errs, fmt.Errorf("column %s belongs to no field", c.name))
		}
	}
	o.Fields = make([]model.Field, len(o.fields))
	for i, f := range o.fields {
		o.Fields[i] = f.Field
	}
	return errors.Join(errs...)
}
