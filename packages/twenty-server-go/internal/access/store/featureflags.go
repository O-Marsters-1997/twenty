package store

import (
	"context"
	"fmt"
	"slices"

	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/twentyhq/twenty/packages/twenty-server-go/internal/metadata"
	"github.com/twentyhq/twenty/packages/twenty-server-go/internal/workspace"
)

type FeatureFlag struct {
	Key   string `json:"key"`
	Value bool   `json:"value"`
}

var featureFlagKeys = []string{
	"IS_APPLICATION_WORKFLOWS_ENABLED", "IS_ASYNC_CSV_EXPORT_ENABLED", "IS_CONFIGURABLE_SEARCH_FIELDS_ENABLED", "IS_JSON_FILTER_ENABLED",
	"IS_MESSAGE_CAMPAIGN_ENABLED", "IS_REST_METADATA_API_NEW_FORMAT_DIRECT", "IS_INITIAL_OBJECT_VIEW_ENABLED",
	"IS_DEFERRED_WORKSPACE_MIGRATION_ACTIONS_ENABLED", "IS_RECORD_CREATION_FORM_ENABLED", "IS_LOGS_SETTINGS_SECTION_ENABLED",
	"IS_VALIDATION_RULES_ENABLED", "IS_RECORD_LEVEL_SHARING_ENABLED", "IS_CALENDAR_SYNC_SKIP_UNCHANGED_RECORDS_ENABLED",
	"IS_RECORD_SHARE_VISIBILITY_GATING_ENABLED", "IS_AI_CHAT_INBOX_ENABLED", "IS_APP_PREFERENCES_ENABLED",
}

type FeatureFlags struct {
	pool   *pgxpool.Pool
	public []string
}

func NewFeatureFlags(pool *pgxpool.Pool, public []string) *FeatureFlags {
	return &FeatureFlags{pool: pool, public: public}
}

func (f *FeatureFlags) UpdatePublic(ctx context.Context, key string, value bool) (FeatureFlag, error) {
	if !slices.Contains(featureFlagKeys, key) {
		return FeatureFlag{}, fmt.Errorf("%w: Invalid feature flag key", metadata.ErrInvalidInput)
	}
	if !slices.Contains(f.public, key) {
		return FeatureFlag{}, fmt.Errorf("%w: Invalid feature flag key, flag is not public", metadata.ErrInvalidInput)
	}
	if _, err := f.pool.Exec(ctx, `INSERT INTO core."featureFlag" (key, "workspaceId", value) VALUES ($1, $2::uuid, $3)
		ON CONFLICT (key, "workspaceId") DO UPDATE SET value = EXCLUDED.value, "updatedAt" = now()`, key, workspace.PinnedWorkspaceID, value); err != nil {
		return FeatureFlag{}, fmt.Errorf("upsert feature flag: %w", err)
	}
	return FeatureFlag{Key: key, Value: value}, nil
}
