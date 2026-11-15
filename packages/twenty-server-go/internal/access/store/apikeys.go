package store

import (
	"context"
	"errors"
	"fmt"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/twentyhq/twenty/packages/twenty-server-go/internal/metadata"
	"github.com/twentyhq/twenty/packages/twenty-server-go/internal/workspace"
)

const roleDocument = `jsonb_build_object('id', r.id, 'label', r.label, 'description', r.description, 'icon', r.icon,
	'canUpdateAllSettings', r."canUpdateAllSettings", 'canAccessAllTools', r."canAccessAllTools", 'isEditable', r."isEditable",
	'canReadAllObjectRecords', r."canReadAllObjectRecords", 'canUpdateAllObjectRecords', r."canUpdateAllObjectRecords",
	'canSoftDeleteAllObjectRecords', r."canSoftDeleteAllObjectRecords", 'canDestroyAllObjectRecords', r."canDestroyAllObjectRecords",
	'canBeAssignedToUsers', r."canBeAssignedToUsers", 'canBeAssignedToAgents', r."canBeAssignedToAgents",
	'canBeAssignedToApiKeys', r."canBeAssignedToApiKeys")`

var selectAPIKeys = `SELECT jsonb_build_object('id', k.id, 'name', k.name, 'expiresAt', ` + iso(`k."expiresAt"`) + `,
		'revokedAt', ` + iso(`k."revokedAt"`) + `, 'createdAt', ` + iso(`k."createdAt"`) + `)
	FROM core."apiKey" k WHERE k."workspaceId" = $1::uuid`

type APIKeys struct {
	pool *pgxpool.Pool
}

func NewAPIKeys(pool *pgxpool.Pool) *APIKeys {
	return &APIKeys{pool: pool}
}

func (a *APIKeys) List(ctx context.Context) ([]APIKey, error) {
	return queryAll[APIKey](ctx, a.pool, selectAPIKeys+` AND k."revokedAt" IS NULL ORDER BY k."createdAt", k.id`, workspace.PinnedWorkspaceID)
}

func (a *APIKeys) Get(ctx context.Context, id string) (APIKey, error) {
	return queryOne[APIKey](ctx, a.pool, "API key not found", selectAPIKeys+` AND k.id = $2::uuid`, workspace.PinnedWorkspaceID, id)
}

func (a *APIKeys) AssignableRoles(ctx context.Context) ([]Role, error) {
	return queryAll[Role](ctx, a.pool, `SELECT `+roleDocument+` FROM core.role r
		WHERE r."workspaceId" = $1::uuid AND r."canBeAssignedToApiKeys" ORDER BY r.label`, workspace.PinnedWorkspaceID)
}

func (a *APIKeys) RoleOf(ctx context.Context, apiKeyID string) (Role, error) {
	return queryOne[Role](ctx, a.pool, "API key has no role assigned", `SELECT `+roleDocument+` FROM core."roleTarget" rt JOIN core.role r ON r.id = rt."roleId"
		WHERE rt."apiKeyId" = $1::uuid AND rt."workspaceId" = $2::uuid`, apiKeyID, workspace.PinnedWorkspaceID)
}

func (a *APIKeys) Create(ctx context.Context, rawInput Input) (APIKey, error) {
	input := plain(rawInput)
	name, _ := input["name"].(string)
	expiresAt, err := parseTimestamp(input["expiresAt"])
	if err != nil || name == "" {
		return APIKey{}, fmt.Errorf("%w: name and a valid expiresAt are required", metadata.ErrInvalidInput)
	}
	revokedAt, err := optionalTimestamp(input["revokedAt"])
	if err != nil {
		return APIKey{}, err
	}
	roleID, _ := input["roleId"].(string)
	var created string
	err = pgx.BeginFunc(ctx, a.pool, func(tx pgx.Tx) error {
		if err := tx.QueryRow(ctx, `INSERT INTO core."apiKey" (name, "expiresAt", "revokedAt", "workspaceId") VALUES ($1, $2, $3, $4::uuid) RETURNING id::text`,
			name, expiresAt, revokedAt, workspace.PinnedWorkspaceID).Scan(&created); err != nil {
			return fmt.Errorf("insert api key: %w", err)
		}
		return setAPIKeyRole(ctx, tx, created, roleID)
	})
	if err != nil {
		return APIKey{}, err
	}
	return a.Get(ctx, created)
}

func (a *APIKeys) Update(ctx context.Context, id string, rawUpdates Input) (APIKey, error) {
	updates := plain(rawUpdates)
	existing, err := a.Get(ctx, id)
	if err != nil {
		return APIKey{}, err
	}
	name := existing.Name
	if value, present := updates["name"].(string); present {
		name = value
	}
	expiresAt, err := parseTimestamp(existing.ExpiresAt)
	if err != nil {
		return APIKey{}, err
	}
	if value, present := updates["expiresAt"]; present && value != nil {
		if expiresAt, err = parseTimestamp(value); err != nil {
			return APIKey{}, err
		}
	}
	var revokedAt *time.Time
	if existing.RevokedAt != nil {
		current, err := parseTimestamp(*existing.RevokedAt)
		if err != nil {
			return APIKey{}, err
		}
		revokedAt = &current
	}
	if value, present := updates["revokedAt"]; present {
		switch {
		case value == nil && revokedAt != nil:
			return APIKey{}, fmt.Errorf("%w: this API key has been revoked and cannot be reactivated", ErrForbidden)
		case value != nil:
			if revokedAt, err = optionalTimestamp(value); err != nil {
				return APIKey{}, err
			}
		}
	}
	if _, err := a.pool.Exec(ctx, `UPDATE core."apiKey" SET name = $2, "expiresAt" = $3, "revokedAt" = $4, "updatedAt" = now()
		WHERE id = $1::uuid AND "workspaceId" = $5::uuid`, id, name, expiresAt, revokedAt, workspace.PinnedWorkspaceID); err != nil {
		return APIKey{}, fmt.Errorf("update api key: %w", err)
	}
	return a.Get(ctx, id)
}

func (a *APIKeys) Revoke(ctx context.Context, id string) (APIKey, error) {
	return a.Update(ctx, id, Input{"revokedAt": time.Now().UTC().Format(time.RFC3339Nano)})
}

func (a *APIKeys) AssignRole(ctx context.Context, apiKeyID, roleID string) error {
	return pgx.BeginFunc(ctx, a.pool, func(tx pgx.Tx) error {
		return setAPIKeyRole(ctx, tx, apiKeyID, roleID)
	})
}

func (a *APIKeys) Validate(ctx context.Context, id string) (APIKey, error) {
	existing, err := a.Get(ctx, id)
	if err != nil {
		return APIKey{}, err
	}
	if existing.RevokedAt != nil {
		return APIKey{}, fmt.Errorf("%w: this API key has been revoked and can no longer be used", ErrForbidden)
	}
	expiresAt, err := parseTimestamp(existing.ExpiresAt)
	if err != nil {
		return APIKey{}, err
	}
	if !expiresAt.After(time.Now()) {
		return APIKey{}, fmt.Errorf("%w: this API key has expired", metadata.ErrInvalidInput)
	}
	return existing, nil
}

func setAPIKeyRole(ctx context.Context, tx pgx.Tx, apiKeyID, roleID string) error {
	var found bool
	if err := tx.QueryRow(ctx, `SELECT EXISTS (SELECT 1 FROM core."apiKey" WHERE id = $1::uuid AND "workspaceId" = $2::uuid)`,
		apiKeyID, workspace.PinnedWorkspaceID).Scan(&found); err != nil {
		return fmt.Errorf("find api key: %w", err)
	}
	if !found {
		return fmt.Errorf("%w: API key with id %s not found in workspace", metadata.ErrNotFound, apiKeyID)
	}
	var label string
	var assignable bool
	err := tx.QueryRow(ctx, `SELECT label, "canBeAssignedToApiKeys" FROM core.role WHERE id = $1::uuid AND "workspaceId" = $2::uuid`,
		roleID, workspace.PinnedWorkspaceID).Scan(&label, &assignable)
	switch {
	case errors.Is(err, pgx.ErrNoRows):
		return fmt.Errorf("%w: role with id %s not found in workspace", metadata.ErrNotFound, roleID)
	case err != nil:
		return fmt.Errorf("find role: %w", err)
	case !assignable:
		return fmt.Errorf("%w: role %q cannot be assigned to API keys", metadata.ErrInvalidInput, label)
	}
	tag, err := tx.Exec(ctx, `UPDATE core."roleTarget" SET "roleId" = $2::uuid, "updatedAt" = now() WHERE "apiKeyId" = $1::uuid`, apiKeyID, roleID)
	if err != nil || tag.RowsAffected() > 0 {
		return err
	}
	_, err = tx.Exec(ctx, `INSERT INTO core."roleTarget" ("roleId", "apiKeyId", "universalIdentifier", "workspaceId", "applicationId")
		VALUES ($1::uuid, $2::uuid, gen_random_uuid(), $3::uuid, (SELECT "workspaceCustomApplicationId" FROM core.workspace WHERE id = $3::uuid))`,
		roleID, apiKeyID, workspace.PinnedWorkspaceID)
	return err
}

func optionalTimestamp(value any) (*time.Time, error) {
	if value == nil {
		return nil, nil
	}
	parsed, err := parseTimestamp(value)
	if err != nil {
		return nil, err
	}
	return &parsed, nil
}

func parseTimestamp(value any) (time.Time, error) {
	text, _ := value.(string)
	parsed, err := time.Parse(time.RFC3339Nano, text)
	if err != nil {
		return time.Time{}, fmt.Errorf("%w: invalid timestamp %q", metadata.ErrInvalidInput, text)
	}
	return parsed, nil
}
