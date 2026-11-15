package store

import (
	"context"
	"crypto/rand"
	"encoding/hex"
	"fmt"
	"net/url"
	"strings"

	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/twentyhq/twenty/packages/twenty-server-go/internal/metadata"
	"github.com/twentyhq/twenty/packages/twenty-server-go/internal/workspace"
)

var selectWebhooks = `SELECT jsonb_build_object('id', id, 'targetUrl', "targetUrl", 'operations', operations, 'description', description,
		'secret', secret, 'applicationId', "applicationId", 'createdAt', ` + iso(`"createdAt"`) + `,
		'updatedAt', ` + iso(`"updatedAt"`) + `, 'deletedAt', NULL::text)
	FROM core.webhook WHERE "workspaceId" = $1::uuid AND "deletedAt" IS NULL`

type Webhooks struct {
	pool *pgxpool.Pool
}

func NewWebhooks(pool *pgxpool.Pool) *Webhooks {
	return &Webhooks{pool: pool}
}

func (w *Webhooks) List(ctx context.Context) ([]Webhook, error) {
	return queryAll[Webhook](ctx, w.pool, selectWebhooks+` ORDER BY "createdAt", id`, workspace.PinnedWorkspaceID)
}

func (w *Webhooks) Get(ctx context.Context, id string) (Webhook, error) {
	return queryOne[Webhook](ctx, w.pool, "webhook not found", selectWebhooks+` AND id = $2::uuid`, workspace.PinnedWorkspaceID, id)
}

func (w *Webhooks) Create(ctx context.Context, rawInput Input) (Webhook, error) {
	input := plain(rawInput)
	targetURL, err := whatwgTargetURL(input["targetUrl"])
	if err != nil {
		return Webhook{}, err
	}
	secret, _ := input["secret"].(string)
	if secret == "" {
		secret, err = newSecret()
		if err != nil {
			return Webhook{}, err
		}
	}
	id, _ := input["id"].(string)
	var created string
	err = w.pool.QueryRow(ctx, `INSERT INTO core.webhook (id, "targetUrl", operations, description, secret, "workspaceId", "universalIdentifier", "applicationId")
		VALUES (COALESCE(NULLIF($1, '')::uuid, gen_random_uuid()), $2, $3::text[], $4, $5, $6::uuid, COALESCE(NULLIF($1, '')::uuid, gen_random_uuid()),
			(SELECT "workspaceCustomApplicationId" FROM core.workspace WHERE id = $6::uuid))
		RETURNING id::text`,
		id, targetURL, stringList(input["operations"]), collapseWhitespace(input["description"]), secret, workspace.PinnedWorkspaceID).Scan(&created)
	if err != nil {
		return Webhook{}, fmt.Errorf("create webhook: %w", err)
	}
	return w.Get(ctx, created)
}

func (w *Webhooks) Update(ctx context.Context, id string, rawUpdates Input) (Webhook, error) {
	updates := plain(rawUpdates)
	existing, err := w.Get(ctx, id)
	if err != nil {
		return Webhook{}, err
	}
	targetURL := existing.TargetURL
	if value, present := updates["targetUrl"]; present && value != nil {
		if targetURL, err = whatwgTargetURL(value); err != nil {
			return Webhook{}, err
		}
	}
	operations := existing.Operations
	if value, present := updates["operations"]; present && value != nil {
		operations = stringList(value)
	}
	var description any = existing.Description
	if value, present := updates["description"]; present {
		description = collapseWhitespace(value)
	}
	secret := existing.Secret
	if value, present := updates["secret"].(string); present {
		secret = value
	}
	_, err = w.pool.Exec(ctx, `UPDATE core.webhook SET "targetUrl" = $2, operations = $3::text[], description = $4, secret = $5, "updatedAt" = now()
		WHERE id = $1::uuid AND "workspaceId" = $6::uuid`,
		id, targetURL, operations, description, secret, workspace.PinnedWorkspaceID)
	if err != nil {
		return Webhook{}, fmt.Errorf("update webhook: %w", err)
	}
	return w.Get(ctx, id)
}

func (w *Webhooks) Delete(ctx context.Context, id string) (Webhook, error) {
	existing, err := w.Get(ctx, id)
	if err != nil {
		return Webhook{}, err
	}
	if _, err := w.pool.Exec(ctx, `DELETE FROM core.webhook WHERE id = $1::uuid AND "workspaceId" = $2::uuid`, id, workspace.PinnedWorkspaceID); err != nil {
		return Webhook{}, fmt.Errorf("delete webhook: %w", err)
	}
	return existing, nil
}

func whatwgTargetURL(value any) (string, error) {
	raw, _ := value.(string)
	parsed, err := url.Parse(raw)
	if err != nil || (parsed.Scheme != "http" && parsed.Scheme != "https") || parsed.Host == "" {
		return "", fmt.Errorf("%w: invalid target URL, provide a valid HTTP or HTTPS URL", metadata.ErrInvalidInput)
	}
	if parsed.Path == "" {
		parsed.Path = "/"
	}
	return parsed.String(), nil
}

func collapseWhitespace(value any) any {
	text, ok := value.(string)
	if !ok {
		return nil
	}
	return strings.Join(strings.Fields(text), " ")
}

func stringList(value any) []string {
	items, _ := value.([]any)
	list := make([]string, len(items))
	for i, item := range items {
		list[i], _ = item.(string)
	}
	return list
}

func newSecret() (string, error) {
	raw := make([]byte, 32)
	if _, err := rand.Read(raw); err != nil {
		return "", fmt.Errorf("generate webhook secret: %w", err)
	}
	return hex.EncodeToString(raw), nil
}
