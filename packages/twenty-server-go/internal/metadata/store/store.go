package store

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"slices"
	"strings"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/twentyhq/twenty/packages/twenty-server-go/internal/metadata"
	"github.com/twentyhq/twenty/packages/twenty-server-go/internal/model"
	"github.com/twentyhq/twenty/packages/twenty-server-go/internal/records"
	"github.com/twentyhq/twenty/packages/twenty-server-go/internal/workspace"
)

const (
	defaultPageSize = 10
	maxPageSize     = 1000
	relationType    = "RELATION"
	morphType       = "MORPH_RELATION"
)

var ErrInvalidPaging = errors.New("invalid paging")

type Store struct {
	pool *pgxpool.Pool
}

var _ metadata.Reader = (*Store)(nil)

func New(pool *pgxpool.Pool) *Store {
	return &Store{pool: pool}
}

// Objects returns every object with its fields, active or not.
func (s *Store) Objects(ctx context.Context) ([]metadata.ObjectMetadata, error) {
	var details []ObjectDetail
	for after := ""; ; {
		first := maxPageSize
		page, err := s.Page(ctx, PageRequest{First: &first, After: after})
		if err != nil {
			return nil, err
		}
		details = append(details, page.Objects...)
		if !page.HasNext {
			break
		}
		after = records.Cursor(page.Objects[len(page.Objects)-1].ID)
	}
	objects := make([]metadata.ObjectMetadata, 0, len(details))
	for _, detail := range details {
		object, err := toObjectMetadata(detail)
		if err != nil {
			return nil, err
		}
		objects = append(objects, object)
	}
	return objects, nil
}

// Page returns one id-descending page of objects, each with fields, indexes and search fields.
func (s *Store) Page(ctx context.Context, request PageRequest) (Page, error) {
	limit, backward, afterID, beforeID, err := parsePaging(request)
	if err != nil {
		return Page{}, err
	}
	where, order, args := `o."workspaceId" = $1`, "DESC", []any{workspace.PinnedWorkspaceID}
	if backward {
		order = "ASC"
	}
	if afterID != "" {
		args = append(args, afterID)
		where += fmt.Sprintf(` AND o.id < $%d::uuid`, len(args))
	}
	if beforeID != "" {
		args = append(args, beforeID)
		where += fmt.Sprintf(` AND o.id > $%d::uuid`, len(args))
	}
	args = append(args, limit+1)
	rows, err := s.pool.Query(ctx, objectSelect+` WHERE `+where+` ORDER BY o.id `+order+fmt.Sprintf(` LIMIT $%d`, len(args)), args...)
	if err != nil {
		return Page{}, fmt.Errorf("query objects: %w", err)
	}
	objects, err := pgx.CollectRows(rows, scanObject)
	if err != nil {
		return Page{}, fmt.Errorf("read objects: %w", err)
	}
	page := Page{}
	if len(objects) > limit {
		objects = objects[:limit]
		if backward {
			page.HasPrevious = true
		} else {
			page.HasNext = true
		}
	}
	if backward {
		slices.Reverse(objects)
		page.HasNext = beforeID != ""
	} else {
		page.HasPrevious = afterID != ""
	}
	page.Objects = objects
	if err := s.attach(ctx, page.Objects); err != nil {
		return Page{}, err
	}
	return page, nil
}

func parsePaging(request PageRequest) (limit int, backward bool, afterID, beforeID string, err error) {
	switch {
	case request.First != nil && request.Last != nil:
		return 0, false, "", "", fmt.Errorf("%w: cannot use both first and last", ErrInvalidPaging)
	case request.First != nil && request.Before != "":
		return 0, false, "", "", fmt.Errorf("%w: cannot use first with before", ErrInvalidPaging)
	case request.Last != nil && request.After != "":
		return 0, false, "", "", fmt.Errorf("%w: cannot use last with after", ErrInvalidPaging)
	case request.After != "" && request.Before != "":
		return 0, false, "", "", fmt.Errorf("%w: cannot use both after and before", ErrInvalidPaging)
	}
	limit = defaultPageSize
	switch {
	case request.First != nil:
		limit = *request.First
	case request.Last != nil:
		limit = *request.Last
	}
	if limit < 0 {
		return 0, false, "", "", fmt.Errorf("%w: page size cannot be negative", ErrInvalidPaging)
	}
	if limit > maxPageSize {
		return 0, false, "", "", fmt.Errorf("%w: requested page size of %d exceeds the maximum size of %d", ErrInvalidPaging, limit, maxPageSize)
	}
	for _, cursor := range []struct {
		raw string
		dst *string
	}{{request.After, &afterID}, {request.Before, &beforeID}} {
		if cursor.raw == "" {
			continue
		}
		id, idErr := records.CursorID(cursor.raw)
		if idErr != nil {
			return 0, false, "", "", fmt.Errorf("%w: invalid cursor: %s", ErrInvalidPaging, cursor.raw)
		}
		*cursor.dst = id
	}
	return limit, request.Last != nil || request.Before != "", afterID, beforeID, nil
}

const objectSelect = `SELECT o.id::text, o."universalIdentifier"::text, o."nameSingular", o."namePlural", o."labelSingular", o."labelPlural",
  o.color, o.description, o.icon, o.shortcut, o."isRemote", o."isActive", o."isSystem", o."isUIEditable", o."isUICreatable",
  o.writability::text, o."openRecordIn"::text, o."sharingReach"::text, o.readability::text, o."createdAt", o."updatedAt",
  o."labelIdentifierFieldMetadataId"::text, o."imageIdentifierFieldMetadataId"::text, o."applicationId"::text,
  o."isLabelSyncedWithName", o."isSearchable", o."duplicateCriteria", o."applicationId" = w."workspaceCustomApplicationId"
FROM core."objectMetadata" o JOIN core.workspace w ON w.id = o."workspaceId"`

func formatTime(value time.Time) string {
	return value.UTC().Format("2006-01-02T15:04:05.000Z")
}

func decodeJSON(raw []byte) (any, error) {
	if raw == nil {
		return nil, nil
	}
	var value any
	if err := json.Unmarshal(raw, &value); err != nil {
		return nil, fmt.Errorf("decode jsonb: %w", err)
	}
	return value, nil
}

func scanObject(row pgx.CollectableRow) (ObjectDetail, error) {
	var (
		o                 ObjectDetail
		created, updated  time.Time
		duplicateCriteria []byte
	)
	err := row.Scan(&o.ID, &o.UniversalIdentifier, &o.NameSingular, &o.NamePlural, &o.LabelSingular, &o.LabelPlural,
		&o.Color, &o.Description, &o.Icon, &o.Shortcut, &o.IsRemote, &o.IsActive, &o.IsSystem, &o.IsUIEditable, &o.IsUICreatable,
		&o.Writability, &o.OpenRecordIn, &o.SharingReach, &o.Readability, &created, &updated,
		&o.LabelIdentifierFieldMetadataID, &o.ImageIdentifierFieldMetadataID, &o.ApplicationID,
		&o.IsLabelSyncedWithName, &o.IsSearchable, &duplicateCriteria, &o.IsCustom)
	if err != nil {
		return o, fmt.Errorf("scan object: %w", err)
	}
	o.CreatedAt, o.UpdatedAt = formatTime(created), formatTime(updated)
	if duplicateCriteria != nil {
		if err := json.Unmarshal(duplicateCriteria, &o.DuplicateCriteria); err != nil {
			return o, fmt.Errorf("decode duplicate criteria: %w", err)
		}
	}
	return o, nil
}

func (s *Store) attach(ctx context.Context, objects []ObjectDetail) error {
	if len(objects) == 0 {
		return nil
	}
	ids := make([]string, len(objects))
	for i, object := range objects {
		ids[i] = object.ID
	}
	fields, err := s.fields(ctx, ids)
	if err != nil {
		return err
	}
	indexes, err := s.indexes(ctx, ids)
	if err != nil {
		return err
	}
	searches, err := s.searchFields(ctx, ids)
	if err != nil {
		return err
	}
	unique, searchable := map[string]bool{}, map[string]bool{}
	for _, indexList := range indexes {
		for _, index := range indexList {
			if index.systemSideEffect && index.IsUnique && len(index.IndexFieldMetadataList) == 1 && index.IndexFieldMetadataList[0].SubFieldName == nil {
				unique[index.IndexFieldMetadataList[0].FieldMetadataID] = true
			}
		}
	}
	for _, searchList := range searches {
		for _, search := range searchList {
			searchable[search.FieldMetadataID] = true
		}
	}
	references, err := s.relationReferences(ctx, fields)
	if err != nil {
		return err
	}
	for i := range objects {
		object := &objects[i]
		object.FieldsList = fields[object.ID]
		for j := range object.FieldsList {
			field := &object.FieldsList[j]
			field.IsUnique, field.IsSearchable = unique[field.ID], searchable[field.ID]
		}
		for j := range object.FieldsList {
			resolveRelations(object, &object.FieldsList[j], references)
		}
		for _, index := range indexes[object.ID] {
			object.IndexMetadataList = append(object.IndexMetadataList, index.IndexDetail)
		}
		object.SearchFieldMetadataList = searches[object.ID]
	}
	return nil
}

func (s *Store) fields(ctx context.Context, objectIDs []string) (map[string][]FieldDetail, error) {
	rows, err := s.pool.Query(ctx, `SELECT id::text, "universalIdentifier"::text, type, name, label, description, icon, "morphId"::text,
  "isActive", "isSystem", "isUIEditable", writability::text, COALESCE("isNullable", false), "createdAt", "updatedAt",
  "defaultValue", options, settings, "isLabelSyncedWithName", "applicationId"::text, "objectMetadataId"::text
FROM core."fieldMetadata" WHERE "workspaceId" = $1 AND "objectMetadataId" = ANY($2::uuid[]) ORDER BY "createdAt", id`, workspace.PinnedWorkspaceID, objectIDs)
	if err != nil {
		return nil, fmt.Errorf("query fields: %w", err)
	}
	defer rows.Close()
	byObject := map[string][]FieldDetail{}
	for rows.Next() {
		var (
			f                               FieldDetail
			created, updated                time.Time
			defaultValue, options, settings []byte
		)
		err := rows.Scan(&f.ID, &f.UniversalIdentifier, &f.Type, &f.Name, &f.Label, &f.Description, &f.Icon, &f.MorphID,
			&f.IsActive, &f.IsSystem, &f.IsUIEditable, &f.Writability, &f.IsNullable, &created, &updated,
			&defaultValue, &options, &settings, &f.IsLabelSyncedWithName, &f.ApplicationID, &f.ObjectMetadataID)
		if err != nil {
			return nil, fmt.Errorf("scan field: %w", err)
		}
		f.CreatedAt, f.UpdatedAt = formatTime(created), formatTime(updated)
		for _, decode := range []struct {
			raw []byte
			dst *any
		}{{defaultValue, &f.DefaultValue}, {options, &f.Options}, {settings, &f.Settings}} {
			if *decode.dst, err = decodeJSON(decode.raw); err != nil {
				return nil, err
			}
		}
		byObject[f.ObjectMetadataID] = append(byObject[f.ObjectMetadataID], f)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("read fields: %w", err)
	}
	return byObject, nil
}

type indexRow struct {
	IndexDetail
	systemSideEffect bool
}

func (s *Store) indexes(ctx context.Context, objectIDs []string) (map[string][]indexRow, error) {
	rows, err := s.pool.Query(ctx, `SELECT i.id::text, i."objectMetadataId"::text, i."createdAt", i."updatedAt", i.name, i."indexWhereClause",
  i."indexType"::text, i."isUnique", i."isCustom", i."isSystemSideEffect",
  f.id::text, f."fieldMetadataId"::text, f."subFieldName", f."createdAt", f."updatedAt", f."order"
FROM core."indexMetadata" i
LEFT JOIN core."indexFieldMetadata" f ON f."indexMetadataId" = i.id
WHERE i."workspaceId" = $1 AND i."objectMetadataId" = ANY($2::uuid[]) ORDER BY i."createdAt", i.id, f."order"`, workspace.PinnedWorkspaceID, objectIDs)
	if err != nil {
		return nil, fmt.Errorf("query indexes: %w", err)
	}
	defer rows.Close()
	byObject := map[string][]indexRow{}
	for rows.Next() {
		var (
			index                      indexRow
			objectID                   string
			created, updated           time.Time
			isCustom                   bool
			fieldID, fieldMetadataID   *string
			subFieldName               *string
			fieldCreated, fieldUpdated *time.Time
			order                      *int
		)
		err := rows.Scan(&index.ID, &objectID, &created, &updated, &index.Name, &index.IndexWhereClause, &index.IndexType,
			&index.IsUnique, &isCustom, &index.systemSideEffect, &fieldID, &fieldMetadataID, &subFieldName, &fieldCreated, &fieldUpdated, &order)
		if err != nil {
			return nil, fmt.Errorf("scan index: %w", err)
		}
		list := byObject[objectID]
		if len(list) == 0 || list[len(list)-1].ID != index.ID {
			index.CreatedAt, index.UpdatedAt, index.IsCustom = formatTime(created), formatTime(updated), &isCustom
			list = append(list, index)
		}
		if fieldID != nil {
			last := &list[len(list)-1]
			last.IndexFieldMetadataList = append(last.IndexFieldMetadataList, IndexFieldDetail{
				ID: *fieldID, FieldMetadataID: *fieldMetadataID, SubFieldName: subFieldName,
				CreatedAt: formatTime(*fieldCreated), UpdatedAt: formatTime(*fieldUpdated), Order: *order,
			})
		}
		byObject[objectID] = list
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("read indexes: %w", err)
	}
	return byObject, nil
}

func (s *Store) searchFields(ctx context.Context, objectIDs []string) (map[string][]SearchFieldDetail, error) {
	rows, err := s.pool.Query(ctx, `SELECT id::text, "objectMetadataId"::text, "fieldMetadataId"::text, "tsVectorFieldMetadataId"::text, position, "createdAt", "updatedAt"
FROM core."searchFieldMetadata" WHERE "workspaceId" = $1 AND "objectMetadataId" = ANY($2::uuid[]) ORDER BY "createdAt", id`, workspace.PinnedWorkspaceID, objectIDs)
	if err != nil {
		return nil, fmt.Errorf("query search fields: %w", err)
	}
	defer rows.Close()
	byObject := map[string][]SearchFieldDetail{}
	for rows.Next() {
		var (
			search           SearchFieldDetail
			objectID         string
			created, updated time.Time
		)
		if err := rows.Scan(&search.ID, &objectID, &search.FieldMetadataID, &search.TsVectorFieldMetadataID, &search.Position, &created, &updated); err != nil {
			return nil, fmt.Errorf("scan search field: %w", err)
		}
		search.CreatedAt, search.UpdatedAt = formatTime(created), formatTime(updated)
		byObject[objectID] = append(byObject[objectID], search)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("read search fields: %w", err)
	}
	return byObject, nil
}

type relationReference struct {
	targetFieldID  string
	targetObjectID string
}

type relationReferences struct {
	byField map[string]relationReference
	fields  map[string]*FieldDetail
	objects map[string]*ObjectDetail
}

func (s *Store) relationReferences(ctx context.Context, fields map[string][]FieldDetail) (relationReferences, error) {
	references := relationReferences{byField: map[string]relationReference{}, fields: map[string]*FieldDetail{}, objects: map[string]*ObjectDetail{}}
	var fieldIDs []string
	for _, list := range fields {
		for _, field := range list {
			if field.Type == relationType || field.Type == morphType {
				fieldIDs = append(fieldIDs, field.ID)
			}
		}
	}
	if len(fieldIDs) == 0 {
		return references, nil
	}
	rows, err := s.pool.Query(ctx, `SELECT f.id::text, f."relationTargetFieldMetadataId"::text, f."relationTargetObjectMetadataId"::text,
  t.name, t."objectMetadataId"::text, o."nameSingular", o."namePlural"
FROM core."fieldMetadata" f
JOIN core."fieldMetadata" t ON t.id = f."relationTargetFieldMetadataId"
JOIN core."objectMetadata" o ON o.id = f."relationTargetObjectMetadataId"
WHERE f."workspaceId" = $1 AND f.id = ANY($2::uuid[])`, workspace.PinnedWorkspaceID, fieldIDs)
	if err != nil {
		return references, fmt.Errorf("query relation targets: %w", err)
	}
	defer rows.Close()
	for rows.Next() {
		var (
			fieldID, targetFieldID, targetObjectID, targetFieldName, targetFieldObjectID, singular, plural string
		)
		if err := rows.Scan(&fieldID, &targetFieldID, &targetObjectID, &targetFieldName, &targetFieldObjectID, &singular, &plural); err != nil {
			return references, fmt.Errorf("scan relation target: %w", err)
		}
		references.byField[fieldID] = relationReference{targetFieldID, targetObjectID}
		references.fields[targetFieldID] = &FieldDetail{ID: targetFieldID, Name: targetFieldName, ObjectMetadataID: targetFieldObjectID}
		references.objects[targetObjectID] = &ObjectDetail{ID: targetObjectID, NameSingular: singular, NamePlural: plural}
	}
	if err := rows.Err(); err != nil {
		return references, fmt.Errorf("read relation targets: %w", err)
	}
	return references, nil
}

func relationKind(field *FieldDetail) string {
	settings, _ := field.Settings.(map[string]any)
	kind, _ := settings["relationType"].(string)
	return kind
}

func resolveRelations(object *ObjectDetail, field *FieldDetail, references relationReferences) {
	source := &FieldDetail{ID: field.ID, Name: field.Name}
	sourceObject := &ObjectDetail{ID: object.ID, NameSingular: object.NameSingular, NamePlural: object.NamePlural}
	switch field.Type {
	case relationType:
		reference, ok := references.byField[field.ID]
		if !ok {
			return
		}
		field.Relation = &RelationDetail{
			Type: relationKind(field), SourceObjectMetadata: sourceObject, SourceFieldMetadata: source,
			TargetObjectMetadata: references.objects[reference.targetObjectID], TargetFieldMetadata: references.fields[reference.targetFieldID],
		}
	case morphType:
		for i := range object.FieldsList {
			sibling := &object.FieldsList[i]
			if sibling.Type != morphType || sibling.MorphID == nil || field.MorphID == nil || *sibling.MorphID != *field.MorphID {
				continue
			}
			reference, ok := references.byField[sibling.ID]
			if !ok {
				continue
			}
			target := references.objects[reference.targetObjectID]
			suffix := target.NameSingular
			if relationKind(sibling) != "MANY_TO_ONE" {
				suffix = target.NamePlural
			}
			name := replaceLast(sibling.Name, strings.ToUpper(suffix[:1])+suffix[1:], "")
			field.MorphRelations = append(field.MorphRelations, &RelationDetail{
				Type: relationKind(sibling), SourceObjectMetadata: sourceObject, SourceFieldMetadata: &FieldDetail{ID: sibling.ID, Name: name},
				TargetObjectMetadata: target, TargetFieldMetadata: references.fields[reference.targetFieldID],
			})
		}
	}
}

func replaceLast(source, search, replacement string) string {
	index := strings.LastIndex(source, search)
	if index < 0 {
		return source
	}
	return source[:index] + replacement + source[index+len(search):]
}

func toObjectMetadata(detail ObjectDetail) (metadata.ObjectMetadata, error) {
	object := metadata.ObjectMetadata{
		ID: detail.ID, NameSingular: detail.NameSingular, NamePlural: detail.NamePlural,
		LabelSingular: detail.LabelSingular, LabelPlural: detail.LabelPlural, Icon: deref(detail.Icon),
		IsCustom: detail.IsCustom, IsActive: detail.IsActive, IsSystem: detail.IsSystem,
	}
	for _, field := range detail.FieldsList {
		settings, err := encodeJSON(field.Settings)
		if err != nil {
			return object, err
		}
		options, err := encodeJSON(field.Options)
		if err != nil {
			return object, err
		}
		converted := metadata.FieldMetadata{
			ID: field.ID, Name: field.Name, Label: field.Label, Icon: deref(field.Icon), Type: model.FieldType(field.Type),
			IsNullable: field.IsNullable, IsActive: field.IsActive, Settings: settings, Options: options,
		}
		if field.Relation != nil {
			converted.Relation = &metadata.RelationMetadata{
				Type: field.Relation.Type, TargetObjectMetadataID: field.Relation.TargetObjectMetadata.ID, TargetFieldMetadataID: field.Relation.TargetFieldMetadata.ID,
			}
		}
		object.Fields = append(object.Fields, converted)
	}
	return object, nil
}

func encodeJSON(value any) (json.RawMessage, error) {
	if value == nil {
		return nil, nil
	}
	raw, err := json.Marshal(value)
	if err != nil {
		return nil, fmt.Errorf("encode jsonb: %w", err)
	}
	return raw, nil
}

func deref(value *string) string {
	if value == nil {
		return ""
	}
	return *value
}
