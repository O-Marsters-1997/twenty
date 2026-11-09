package store

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"strings"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/twentyhq/twenty/packages/twenty-server-go/internal/messaging"
	"github.com/twentyhq/twenty/packages/twenty-server-go/internal/workspace"
)

var (
	ErrCampaignNotSendable   = errors.New("campaign cannot be sent: it may be missing a sender, subject or recipient list, or was already sent")
	ErrCampaignNotCancelable = errors.New("only a scheduled or sending campaign can be canceled")
)

const (
	campaignDraft     = "DRAFT"
	campaignScheduled = "SCHEDULED"
	campaignCanceled  = "CANCELED"
)

type Campaigns struct {
	pool   *pgxpool.Pool
	schema string
}

func NewCampaigns(pool *pgxpool.Pool) *Campaigns {
	return &Campaigns{pool: pool, schema: pgx.Identifier{workspace.SchemaName()}.Sanitize()}
}

type CampaignSend struct {
	ListID, TopicID, Status string
}

func (c *Campaigns) PrepareSend(ctx context.Context, campaignID string) (CampaignSend, error) {
	var send CampaignSend
	var subject, template string
	var hasAccount bool
	err := c.pool.QueryRow(ctx, `SELECT coalesce(mc."listId"::text, ''), coalesce(mc."unsubscribeTopicId"::text, ''), mc.status::text,
			coalesce(mc.subject, ''), coalesce(mc."bodyTemplate", ''),
			EXISTS (SELECT 1 FROM core."connectedAccount" a WHERE lower(a.handle) = lower(mc."fromAddressPrimaryEmail") AND a."archivedAt" IS NULL)
		FROM `+c.schema+`."messageCampaign" mc WHERE mc.id = $1 AND mc."deletedAt" IS NULL`, campaignID).
		Scan(&send.ListID, &send.TopicID, &send.Status, &subject, &template, &hasAccount)
	if errors.Is(err, pgx.ErrNoRows) {
		return CampaignSend{}, ErrNotFound
	}
	if err != nil {
		return CampaignSend{}, fmt.Errorf("select campaign: %w", err)
	}
	sendable := (send.Status == campaignDraft || send.Status == campaignScheduled) &&
		subject != "" && send.ListID != "" && hasAccount && json.Valid([]byte(template))
	if !sendable {
		return CampaignSend{}, ErrCampaignNotSendable
	}
	return send, nil
}

func (c *Campaigns) ClaimSending(ctx context.Context, campaignID, from string) (bool, error) {
	tag, err := c.pool.Exec(ctx, `UPDATE `+c.schema+`."messageCampaign" SET status = 'SENDING', "scheduledAt" = NULL, "updatedAt" = now()
		WHERE id = $1 AND status = $2::`+c.schema+`."messageCampaign_status_enum"`, campaignID, from)
	if err != nil {
		return false, fmt.Errorf("claim campaign: %w", err)
	}
	return tag.RowsAffected() == 1, nil
}

func (c *Campaigns) ReleaseSending(ctx context.Context, campaignID, to string) error {
	if _, err := c.pool.Exec(ctx, `UPDATE `+c.schema+`."messageCampaign" SET status = $2::`+c.schema+`."messageCampaign_status_enum", "updatedAt" = now()
		WHERE id = $1 AND status = 'SENDING'`, campaignID, to); err != nil {
		return fmt.Errorf("release campaign: %w", err)
	}
	return nil
}

func (c *Campaigns) Cancel(ctx context.Context, campaignID string) (skipped int, err error) {
	tx, err := c.pool.Begin(ctx)
	if err != nil {
		return 0, fmt.Errorf("begin cancel: %w", err)
	}
	defer func() {
		if rollbackErr := tx.Rollback(ctx); rollbackErr != nil && !errors.Is(rollbackErr, pgx.ErrTxClosed) {
			err = errors.Join(err, rollbackErr)
		}
	}()
	tag, err := tx.Exec(ctx, `UPDATE `+c.schema+`."messageCampaign" SET status = 'DRAFT', "scheduledAt" = NULL, "updatedAt" = now()
		WHERE id = $1 AND status = 'SCHEDULED'`, campaignID)
	if err != nil {
		return 0, fmt.Errorf("unschedule campaign: %w", err)
	}
	if tag.RowsAffected() == 1 {
		return 0, tx.Commit(ctx)
	}
	tag, err = tx.Exec(ctx, `UPDATE `+c.schema+`."messageCampaign" SET status = $2::`+c.schema+`."messageCampaign_status_enum", "updatedAt" = now()
		WHERE id = $1 AND status = 'SENDING'`, campaignID, campaignCanceled)
	if err != nil {
		return 0, fmt.Errorf("cancel campaign: %w", err)
	}
	if tag.RowsAffected() != 1 {
		return 0, ErrCampaignNotCancelable
	}
	tag, err = tx.Exec(ctx, `UPDATE `+c.schema+`."campaignDelivery" SET state = 'SKIPPED', "skipReason" = 'CAMPAIGN_CANCELED', "updatedAt" = now()
		WHERE "campaignId" = $1 AND state = 'QUEUED'`, campaignID)
	if err != nil {
		return 0, fmt.Errorf("skip queued deliveries: %w", err)
	}
	return int(tag.RowsAffected()), tx.Commit(ctx)
}

func (c *Campaigns) Audience(ctx context.Context, listID, topicID string) ([]messaging.Recipient, messaging.Audience, error) {
	rows, err := c.pool.Query(ctx, `SELECT p.id::text, coalesce(p."emailsPrimaryEmail", ''), coalesce(p."nameFirstName", ''), coalesce(p."nameLastName", '')
		FROM `+c.schema+`."messageListMember" m JOIN `+c.schema+`.person p ON p.id = m."personId" AND p."deletedAt" IS NULL
		WHERE m."listId" = $1 AND m."deletedAt" IS NULL ORDER BY m."createdAt", m.id`, listID)
	if err != nil {
		return nil, messaging.Audience{}, fmt.Errorf("select list members: %w", err)
	}
	members, err := pgx.CollectRows(rows, func(row pgx.CollectableRow) (messaging.ListMember, error) {
		var member messaging.ListMember
		err := row.Scan(&member.PersonID, &member.Email, &member.FirstName, &member.LastName)
		return member, err
	})
	if err != nil {
		return nil, messaging.Audience{}, fmt.Errorf("scan list members: %w", err)
	}
	emails := make([]string, len(members))
	for i, member := range members {
		emails[i] = strings.ToLower(strings.TrimSpace(member.Email))
	}
	rows, err = c.pool.Query(ctx, `SELECT "emailAddress", reason, coalesce("unsubscribeTopicId"::text, '')
		FROM `+c.schema+`."messageSuppression"
		WHERE "deletedAt" IS NULL AND lower("emailAddress") = ANY($1) AND ("unsubscribeTopicId" IS NULL OR "unsubscribeTopicId"::text = $2)`, emails, topicID)
	if err != nil {
		return nil, messaging.Audience{}, fmt.Errorf("select suppressions: %w", err)
	}
	suppressions, err := pgx.CollectRows(rows, func(row pgx.CollectableRow) (messaging.Suppression, error) {
		var suppression messaging.Suppression
		err := row.Scan(&suppression.Email, &suppression.Reason, &suppression.TopicID)
		return suppression, err
	})
	if err != nil {
		return nil, messaging.Audience{}, fmt.Errorf("scan suppressions: %w", err)
	}
	recipients, audience := messaging.ResolveAudience(members, suppressions)
	return recipients, audience, nil
}

func (c *Campaigns) OwnedAccountForAddress(ctx context.Context, userWorkspaceID, address string) (string, error) {
	var id string
	err := c.pool.QueryRow(ctx, `SELECT id::text FROM core."connectedAccount"
		WHERE "userWorkspaceId" = $1 AND lower(handle) = lower($2) AND "archivedAt" IS NULL LIMIT 1`, userWorkspaceID, address).Scan(&id)
	if errors.Is(err, pgx.ErrNoRows) {
		return "", ErrAccountNotOwned
	}
	if err != nil {
		return "", fmt.Errorf("select connected account: %w", err)
	}
	return id, nil
}

func (c *Campaigns) Campaign(ctx context.Context, id string) (messaging.Campaign, error) {
	campaign := messaging.Campaign{ID: id}
	err := c.pool.QueryRow(ctx, `SELECT coalesce(mc.subject, ''), coalesce(mc."bodyTemplate", ''), a.id::text
		FROM `+c.schema+`."messageCampaign" mc
		JOIN core."connectedAccount" a ON lower(a.handle) = lower(mc."fromAddressPrimaryEmail") AND a."archivedAt" IS NULL
		WHERE mc.id = $1 AND mc."deletedAt" IS NULL LIMIT 1`, id).Scan(&campaign.Subject, &campaign.Template, &campaign.ConnectedAccountID)
	if errors.Is(err, pgx.ErrNoRows) {
		return messaging.Campaign{}, ErrNotFound
	}
	if err != nil {
		return messaging.Campaign{}, fmt.Errorf("select campaign: %w", err)
	}
	return campaign, nil
}

func (c *Campaigns) Recipients(ctx context.Context, campaignID string) ([]messaging.Recipient, error) {
	var listID, topicID string
	err := c.pool.QueryRow(ctx, `SELECT coalesce("listId"::text, ''), coalesce("unsubscribeTopicId"::text, '')
		FROM `+c.schema+`."messageCampaign" WHERE id = $1`, campaignID).Scan(&listID, &topicID)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, ErrNotFound
	}
	if err != nil {
		return nil, fmt.Errorf("select campaign list: %w", err)
	}
	recipients, _, err := c.Audience(ctx, listID, topicID)
	return recipients, err
}

func (c *Campaigns) SuppressedAddresses(ctx context.Context) ([]string, error) {
	rows, err := c.pool.Query(ctx, `SELECT lower("emailAddress") FROM `+c.schema+`."messageSuppression"
			WHERE "deletedAt" IS NULL AND "unsubscribeTopicId" IS NULL AND reason <> 'TRACKING'
		UNION SELECT lower(handle) FROM `+c.schema+`.blocklist WHERE "deletedAt" IS NULL AND handle IS NOT NULL`)
	if err != nil {
		return nil, fmt.Errorf("select suppressed addresses: %w", err)
	}
	addresses, err := pgx.CollectRows(rows, pgx.RowTo[string])
	if err != nil {
		return nil, fmt.Errorf("scan suppressed addresses: %w", err)
	}
	return addresses, nil
}

func (c *Campaigns) CreateDeliveries(ctx context.Context, campaignID string, recipients []messaging.Recipient) ([]string, error) {
	personIDs, emails := make([]string, len(recipients)), make([]string, len(recipients))
	for i, recipient := range recipients {
		personIDs[i], emails[i] = recipient.PersonID, recipient.Email
	}
	if _, err := c.pool.Exec(ctx, `INSERT INTO `+c.schema+`."campaignDelivery" ("campaignId", "personId", "recipientEmail")
		SELECT $1, r.person, r.email FROM unnest($2::uuid[], $3::text[]) AS r(person, email)
		WHERE EXISTS (SELECT 1 FROM `+c.schema+`."messageCampaign" WHERE id = $1 AND status = 'SENDING')
		ON CONFLICT ("campaignId", "personId") DO NOTHING`, campaignID, personIDs, emails); err != nil {
		return nil, fmt.Errorf("insert deliveries: %w", err)
	}
	rows, err := c.pool.Query(ctx, `SELECT id::text FROM `+c.schema+`."campaignDelivery"
		WHERE "campaignId" = $1 AND state = 'QUEUED' AND "deletedAt" IS NULL ORDER BY "createdAt", id`, campaignID)
	if err != nil {
		return nil, fmt.Errorf("select queued deliveries: %w", err)
	}
	ids, err := pgx.CollectRows(rows, pgx.RowTo[string])
	if err != nil {
		return nil, fmt.Errorf("scan queued deliveries: %w", err)
	}
	return ids, nil
}

func (c *Campaigns) Delivery(ctx context.Context, id string) (messaging.Delivery, error) {
	delivery := messaging.Delivery{ID: id}
	var firstName, lastName string
	err := c.pool.QueryRow(ctx, `SELECT d."campaignId"::text, d."recipientEmail", d.state, coalesce(p."nameFirstName", ''), coalesce(p."nameLastName", '')
		FROM `+c.schema+`."campaignDelivery" d LEFT JOIN `+c.schema+`.person p ON p.id = d."personId"
		WHERE d.id = $1 AND d."deletedAt" IS NULL`, id).Scan(&delivery.CampaignID, &delivery.Email, &delivery.Status, &firstName, &lastName)
	if errors.Is(err, pgx.ErrNoRows) {
		return messaging.Delivery{}, messaging.ErrDeliveryNotFound
	}
	if err != nil {
		return messaging.Delivery{}, fmt.Errorf("select delivery: %w", err)
	}
	delivery.Variables = map[string]any{"name.firstName": firstName, "name.lastName": lastName}
	return delivery, nil
}

func (c *Campaigns) Settle(ctx context.Context, deliveryID string, settlement messaging.DeliverySettlement) error {
	if _, err := c.pool.Exec(ctx, `UPDATE `+c.schema+`."campaignDelivery"
		SET state = $2, "skipReason" = nullif($3, ''), "failureReason" = nullif($4, ''), "providerMessageId" = nullif($5, ''),
			"sentAt" = CASE WHEN $2 = 'SENT' THEN now() ELSE "sentAt" END, "claimToken" = NULL, "claimExpiresAt" = NULL, "updatedAt" = now()
		WHERE id = $1 AND state IN ('QUEUED', 'SENDING')`,
		deliveryID, string(settlement.Status), settlement.SkipReason, settlement.FailureReason, settlement.ProviderMsgID); err != nil {
		return fmt.Errorf("update delivery: %w", err)
	}
	return nil
}

var outcomeColumns = map[messaging.ProviderOutcome]string{
	"DELIVERED": "deliveredAt", "BOUNCED": "bouncedAt", "COMPLAINED": "complainedAt", "REJECTED": "rejectedAt",
}

func (c *Campaigns) RecordOutcome(ctx context.Context, providerMessageID string, outcome messaging.ProviderOutcome) (string, error) {
	column, ok := outcomeColumns[outcome]
	if !ok {
		return "", fmt.Errorf("outcome %q: %w", outcome, ErrInvalidInput)
	}
	var campaignID string
	err := c.pool.QueryRow(ctx, `UPDATE `+c.schema+`."campaignDelivery" SET `+pgx.Identifier{column}.Sanitize()+` = now(), "updatedAt" = now()
		WHERE "providerMessageId" = $1 RETURNING "campaignId"::text`, providerMessageID).Scan(&campaignID)
	if errors.Is(err, pgx.ErrNoRows) {
		return "", nil
	}
	if err != nil {
		return "", fmt.Errorf("record outcome: %w", err)
	}
	return campaignID, nil
}

func (c *Campaigns) Counts(ctx context.Context, campaignID string) (messaging.CampaignCounts, error) {
	var counts messaging.CampaignCounts
	err := c.pool.QueryRow(ctx, `SELECT count(*), count(*) FILTER (WHERE state IN ('QUEUED', 'SENDING')),
			count(*) FILTER (WHERE state = 'FAILED'), count(*) FILTER (WHERE state = 'SKIPPED')
		FROM `+c.schema+`."campaignDelivery" WHERE "campaignId" = $1 AND "deletedAt" IS NULL`, campaignID).
		Scan(&counts.Total, &counts.InProgress, &counts.Failed, &counts.Skipped)
	if err != nil {
		return messaging.CampaignCounts{}, fmt.Errorf("count deliveries: %w", err)
	}
	return counts, nil
}

func (c *Campaigns) Finish(ctx context.Context, campaignID string, status messaging.CampaignStatus) error {
	if _, err := c.pool.Exec(ctx, `UPDATE `+c.schema+`."messageCampaign" SET status = $2::`+c.schema+`."messageCampaign_status_enum", "sentAt" = now(), "updatedAt" = now()
		WHERE id = $1 AND status = 'SENDING'`, campaignID, string(status)); err != nil {
		return fmt.Errorf("finish campaign: %w", err)
	}
	return nil
}
