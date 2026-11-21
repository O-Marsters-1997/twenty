package navigation

import (
	"context"
	"encoding/json"
	"fmt"
	"slices"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/twentyhq/twenty/packages/twenty-server-go/internal/auth"
	"github.com/twentyhq/twenty/packages/twenty-server-go/internal/metadata"
	"github.com/twentyhq/twenty/packages/twenty-server-go/internal/workspace"
)

const (
	itemSelect       = `SELECT to_jsonb(t) FROM core."navigationMenuItem" t`
	standalonePage   = "STANDALONE_PAGE"
	notFoundItemText = "Navigation menu item not found"
)

type Items struct {
	pool                 *pgxpool.Pool
	allowRemoteFavicons  bool
}

func NewItems(pool *pgxpool.Pool, allowRemoteFavicons bool) *Items {
	return &Items{pool: pool, allowRemoteFavicons: allowRemoteFavicons}
}

func (s *Items) List(ctx context.Context, userWorkspaceID string) ([]Item, error) {
	rows, err := s.pool.Query(ctx, itemSelect+` WHERE t."workspaceId" = $1::uuid
		AND (t."userWorkspaceId" IS NULL OR t."userWorkspaceId" = NULLIF($2, '')::uuid)
		ORDER BY t."position", t."createdAt", t.id`, workspace.PinnedWorkspaceID, userWorkspaceID)
	if err != nil {
		return nil, fmt.Errorf("query navigation menu items: %w", err)
	}
	return collectItems(rows)
}

func (s *Items) CreateMany(ctx context.Context, principal auth.Principal, inputs []CreateInput) ([]Item, error) {
	created := make([]Item, len(inputs))
	for _, input := range inputs {
		if err := s.authorize(ctx, principal, "create", input.UserWorkspaceID, false); err != nil {
			return nil, err
		}
	}
	err := pgx.BeginFunc(ctx, s.pool, func(tx pgx.Tx) error {
		items, err := loadItems(ctx, tx)
		if err != nil {
			return err
		}
		order := make([]int, len(inputs))
		for i := range order {
			order[i] = i
		}
		slices.SortStableFunc(order, func(a, b int) int { return folderRank(inputs[a]) - folderRank(inputs[b]) })
		for _, index := range order {
			item, err := s.build(ctx, tx, principal, inputs[index], items)
			if err != nil {
				return err
			}
			items[item.ID] = item
			created[index] = item
		}
		for i, item := range created {
			if created[i], err = insertItem(ctx, tx, item); err != nil {
				return err
			}
		}
		return nil
	})
	if err != nil {
		return nil, err
	}
	return created, nil
}

func (s *Items) UpdateMany(ctx context.Context, principal auth.Principal, inputs []map[string]any) ([]Item, error) {
	updated := make([]Item, 0, len(inputs))
	err := pgx.BeginFunc(ctx, s.pool, func(tx pgx.Tx) error {
		items, err := loadItems(ctx, tx)
		if err != nil {
			return err
		}
		for _, input := range inputs {
			id, _ := input["id"].(string)
			existing, found := items[id]
			if !found {
				return fmt.Errorf("%w: %s", metadata.ErrNotFound, notFoundItemText)
			}
			if err := s.authorize(ctx, principal, "update", existing.UserWorkspaceID, true); err != nil {
				return err
			}
			changes, _ := input["update"].(map[string]any)
			item, err := merge(existing, changes)
			if err != nil {
				return err
			}
			if err := checkFields(item); err != nil {
				return err
			}
			if _, moved := changes["folderId"]; moved {
				items[id] = item
				if err := checkPlacement(items, item); err != nil {
					return err
				}
			}
			if err := checkPageLayout(ctx, tx, item); err != nil {
				return err
			}
			items[id] = item
			updated = append(updated, item)
		}
		for i, item := range updated {
			if updated[i], err = saveItem(ctx, tx, item); err != nil {
				return err
			}
		}
		return nil
	})
	if err != nil {
		return nil, err
	}
	return updated, nil
}

func (s *Items) DeleteMany(ctx context.Context, principal auth.Principal, ids []string) ([]Item, error) {
	deleted := make([]Item, 0, len(ids))
	err := pgx.BeginFunc(ctx, s.pool, func(tx pgx.Tx) error {
		items, err := loadItems(ctx, tx)
		if err != nil {
			return err
		}
		seen := map[string]bool{}
		for _, id := range ids {
			if seen[id] {
				continue
			}
			seen[id] = true
			item, found := items[id]
			if !found {
				return fmt.Errorf("%w: %s", metadata.ErrNotFound, notFoundItemText)
			}
			if err := s.authorize(ctx, principal, "delete", item.UserWorkspaceID, true); err != nil {
				return err
			}
			deleted = append(deleted, item)
		}
		for _, item := range deleted {
			if _, err := tx.Exec(ctx, `DELETE FROM core."navigationMenuItem" WHERE id = $1::uuid`, item.ID); err != nil {
				return fmt.Errorf("delete navigation menu item: %w", err)
			}
		}
		return nil
	})
	if err != nil {
		return nil, err
	}
	return deleted, nil
}

func (s *Items) build(ctx context.Context, tx pgx.Tx, principal auth.Principal, input CreateInput, items map[string]Item) (Item, error) {
	item := Item{
		ID:                     uuid.NewString(),
		Type:                   input.Type,
		UserWorkspaceID:        input.UserWorkspaceID,
		TargetRecordID:         input.TargetRecordID,
		TargetObjectMetadataID: input.TargetObjectMetadataID,
		ViewID:                 input.ViewID,
		FolderID:               input.FolderID,
		PageLayoutID:           input.PageLayoutID,
		Name:                   input.Name,
		Link:                   input.Link,
		Icon:                   input.Icon,
		Color:                  input.Color,
	}
	if input.ID != nil {
		item.ID = *input.ID
	}
	if _, taken := items[item.ID]; taken {
		return Item{}, invalid("Navigation menu item %s already exists", item.ID)
	}
	if item.UserWorkspaceID != nil && principal.UserWorkspaceID != "" {
		item.UserWorkspaceID = &principal.UserWorkspaceID
	}
	item.Position = nextPosition(items, item)
	if input.Position != nil {
		item.Position = *input.Position
	}
	if err := checkFields(item); err != nil {
		return Item{}, err
	}
	if err := checkReferences(ctx, tx, item); err != nil {
		return Item{}, err
	}
	items[item.ID] = item
	if err := checkPlacement(items, item); err != nil {
		return Item{}, err
	}
	if err := checkPageLayout(ctx, tx, item); err != nil {
		return Item{}, err
	}
	return item, nil
}

func nextPosition(items map[string]Item, item Item) float64 {
	highest := 0.0
	for _, sibling := range items {
		if equalPointers(sibling.UserWorkspaceID, item.UserWorkspaceID) && equalPointers(sibling.FolderID, item.FolderID) {
			highest = max(highest, sibling.Position)
		}
	}
	return highest + 1
}

func equalPointers(a, b *string) bool {
	return a == b || (a != nil && b != nil && *a == *b)
}

func folderRank(input CreateInput) int {
	if input.Type == TypeFolder {
		return 0
	}
	return 1
}

func merge(item Item, changes map[string]any) (Item, error) {
	for key, value := range changes {
		switch key {
		case "position":
			position, err := number(value)
			if err != nil {
				return Item{}, err
			}
			item.Position = position
		case "folderId":
			item.FolderID = textOrNil(value)
		case "name":
			item.Name = textOrNil(value)
		case "link":
			item.Link = textOrNil(value)
		case "icon":
			item.Icon = textOrNil(value)
		case "color":
			item.Color = textOrNil(value)
		case "pageLayoutId":
			item.PageLayoutID = textOrNil(value)
		default:
			return Item{}, invalid("unknown field %q", key)
		}
	}
	return item, nil
}

func number(value any) (float64, error) {
	switch typed := value.(type) {
	case float64:
		return typed, nil
	case json.Number:
		return typed.Float64()
	}
	return 0, invalid("position must be a number")
}

func textOrNil(value any) *string {
	text, ok := value.(string)
	if !ok {
		return nil
	}
	return &text
}

func (s *Items) authorize(ctx context.Context, principal auth.Principal, verb string, owner *string, mustOwn bool) error {
	if owner == nil {
		granted, err := s.hasLayoutsPermission(ctx, principal)
		if err != nil {
			return err
		}
		if !granted {
			return fmt.Errorf("%w: You do not have permission to %s workspace-level navigation menu items. Please contact your workspace administrator for access.", ErrPermissionDenied, verb)
		}
		return nil
	}
	if principal.UserWorkspaceID == "" {
		return invalid("User-level navigation menu items can only be %sd by authenticated users", verb)
	}
	if mustOwn && *owner != principal.UserWorkspaceID {
		return invalid("You can only %s your own navigation menu items", verb)
	}
	return nil
}

func (s *Items) hasLayoutsPermission(ctx context.Context, principal auth.Principal) (bool, error) {
	var granted bool
	err := s.pool.QueryRow(ctx,
		`SELECT COALESCE(bool_and(r."canUpdateAllSettings" OR EXISTS (
		     SELECT 1 FROM core."rolePermissionFlag" rpf JOIN core."permissionFlag" pf ON pf.id = rpf."permissionFlagId"
		     WHERE rpf."roleId" = r.id AND pf.key = 'LAYOUTS')), false)
		 FROM core."roleTarget" rt JOIN core.role r ON r.id = rt."roleId"
		 WHERE rt."workspaceId" = $1::uuid
		   AND (rt."userWorkspaceId" = NULLIF($2, '')::uuid OR rt."apiKeyId" = NULLIF($3, '')::uuid)`,
		workspace.PinnedWorkspaceID, principal.UserWorkspaceID, principal.APIKeyID,
	).Scan(&granted)
	if err != nil {
		return false, fmt.Errorf("look up layouts permission: %w", err)
	}
	return granted, nil
}

func checkReferences(ctx context.Context, tx pgx.Tx, item Item) error {
	for _, reference := range []struct {
		id    *string
		query string
		label string
	}{
		{item.TargetObjectMetadataID, `SELECT EXISTS (SELECT 1 FROM core."objectMetadata" WHERE id = $1::uuid)`, "Target object metadata not found"},
		{item.ViewID, `SELECT EXISTS (SELECT 1 FROM core.view WHERE id = $1::uuid AND "deletedAt" IS NULL)`, "Target view not found"},
	} {
		if reference.id == nil {
			continue
		}
		var found bool
		if err := tx.QueryRow(ctx, reference.query, *reference.id).Scan(&found); err != nil {
			return fmt.Errorf("look up navigation menu item reference: %w", err)
		}
		if !found {
			return invalid("%s", reference.label)
		}
	}
	return nil
}

func checkPageLayout(ctx context.Context, tx pgx.Tx, item Item) error {
	if item.Type != TypePageLayout || item.PageLayoutID == nil {
		return nil
	}
	var layoutType string
	err := tx.QueryRow(ctx, `SELECT type::text FROM core."pageLayout" WHERE id = $1::uuid AND "deletedAt" IS NULL`, *item.PageLayoutID).Scan(&layoutType)
	switch {
	case err == pgx.ErrNoRows:
		return nil
	case err != nil:
		return fmt.Errorf("look up page layout: %w", err)
	case layoutType != standalonePage:
		return invalid("PAGE_LAYOUT navigation menu item must reference a STANDALONE_PAGE page layout")
	}
	return nil
}

func insertItem(ctx context.Context, tx pgx.Tx, item Item) (Item, error) {
	return scanItem(tx.QueryRow(ctx, `INSERT INTO core."navigationMenuItem" AS t
		(id, "universalIdentifier", "workspaceId", "applicationId", type, "userWorkspaceId", "targetRecordId",
		 "targetObjectMetadataId", "viewId", "folderId", "pageLayoutId", name, link, icon, color, "position")
		VALUES ($1::uuid, $1::uuid, $2::uuid, (SELECT "workspaceCustomApplicationId" FROM core.workspace WHERE id = $2::uuid),
		 $3::core."navigationMenuItem_type_enum", $4::uuid, $5::uuid, $6::uuid, $7::uuid, $8::uuid, $9::uuid, $10, $11, $12, $13, $14)
		RETURNING to_jsonb(t)`,
		item.ID, workspace.PinnedWorkspaceID, item.Type, item.UserWorkspaceID, item.TargetRecordID, item.TargetObjectMetadataID,
		item.ViewID, item.FolderID, item.PageLayoutID, item.Name, item.Link, item.Icon, item.Color, item.Position))
}

func saveItem(ctx context.Context, tx pgx.Tx, item Item) (Item, error) {
	return scanItem(tx.QueryRow(ctx, `UPDATE core."navigationMenuItem" AS t
		SET "position" = $2, "folderId" = $3::uuid, name = $4, link = $5, icon = $6, color = $7, "pageLayoutId" = $8::uuid, "updatedAt" = now()
		WHERE t.id = $1::uuid RETURNING to_jsonb(t)`,
		item.ID, item.Position, item.FolderID, item.Name, item.Link, item.Icon, item.Color, item.PageLayoutID))
}

func scanItem(row pgx.Row) (Item, error) {
	var document []byte
	if err := row.Scan(&document); err != nil {
		return Item{}, fmt.Errorf("write navigation menu item: %w", err)
	}
	var item Item
	if err := json.Unmarshal(document, &item); err != nil {
		return Item{}, fmt.Errorf("decode navigation menu item: %w", err)
	}
	return item, nil
}

func loadItems(ctx context.Context, db interface {
	Query(ctx context.Context, sql string, args ...any) (pgx.Rows, error)
}) (map[string]Item, error) {
	rows, err := db.Query(ctx, itemSelect+` WHERE t."workspaceId" = $1::uuid`, workspace.PinnedWorkspaceID)
	if err != nil {
		return nil, fmt.Errorf("query navigation menu items: %w", err)
	}
	found, err := collectItems(rows)
	if err != nil {
		return nil, err
	}
	items := make(map[string]Item, len(found))
	for _, item := range found {
		items[item.ID] = item
	}
	return items, nil
}

func collectItems(rows pgx.Rows) ([]Item, error) {
	documents, err := pgx.CollectRows(rows, pgx.RowTo[[]byte])
	if err != nil {
		return nil, fmt.Errorf("read navigation menu items: %w", err)
	}
	items := make([]Item, len(documents))
	for i, document := range documents {
		if err := json.Unmarshal(document, &items[i]); err != nil {
			return nil, fmt.Errorf("decode navigation menu item: %w", err)
		}
	}
	return items, nil
}
