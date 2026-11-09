package store

import (
	"context"
	"crypto/rand"
	"encoding/hex"
	"errors"
	"fmt"
	"net/mail"
	"strings"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgconn"
	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/twentyhq/twenty/packages/twenty-server-go/internal/workspace"
)

var (
	ErrInvalidInput = errors.New("invalid input")
	ErrForbidden    = errors.New("forbidden")
)

const (
	providerApp        = "app"
	providerEmailGroup = "email_group"
	typeEmailGroup     = "EMAIL_GROUP"
	typeEmail          = "EMAIL"
	typeApp            = "APP"
	stagePending       = "PENDING_CONFIGURATION"
	stageOngoing       = "MESSAGE_LIST_FETCH_ONGOING"
	groupActionNone    = "NONE"
	groupActionDelete  = "GROUP_EMAILS_DELETION"
	groupActionImport  = "GROUP_EMAILS_IMPORT"

	forwardingPrefix      = "ch_"
	forwardingRandomBytes = 6
	maxHandleLength       = 254
	maxDisplayNameLength  = 255
)

var (
	messageChannelColumns = []string{
		"visibility", "isContactAutoCreationEnabled", "contactAutoCreationPolicy",
		"messageFolderImportPolicy", "isSyncEnabled", "excludeNonProfessionalEmails", "excludeGroupEmails",
	}
	calendarChannelColumns = []string{"visibility", "isContactAutoCreationEnabled", "contactAutoCreationPolicy", "isSyncEnabled"}
)

type Channels struct {
	pool               *pgxpool.Pool
	inboundEmailDomain string
}

func NewChannels(pool *pgxpool.Pool, inboundEmailDomain string) *Channels {
	return &Channels{pool: pool, inboundEmailDomain: inboundEmailDomain}
}

func (c *Channels) Accounts(ctx context.Context, userWorkspaceID string) ([]Account, error) {
	return collect[Account](ctx, c.pool, `SELECT to_jsonb(a) FROM core."connectedAccount" a
		WHERE a."workspaceId" = $1::uuid AND (a."userWorkspaceId" = $2::uuid OR (a.visibility = 'workspace' AND a."archivedAt" IS NULL))
		ORDER BY a."userWorkspaceId" <> $2::uuid, a."createdAt", a.id`, workspace.PinnedWorkspaceID, userWorkspaceID)
}

func (c *Channels) ApplicationAccounts(ctx context.Context, applicationID, userWorkspaceID string) ([]ApplicationAccount, error) {
	accounts, err := collect[Account](ctx, c.pool, `SELECT to_jsonb(a) FROM core."connectedAccount" a
		WHERE a."workspaceId" = $1::uuid AND a."applicationId" = $3::uuid AND a.provider = $4 AND a."archivedAt" IS NULL
			AND (a.visibility = 'workspace' OR a."userWorkspaceId" = $2::uuid)
		ORDER BY a."createdAt", a.id`, workspace.PinnedWorkspaceID, userWorkspaceID, applicationID, providerApp)
	if err != nil {
		return nil, err
	}
	listed := make([]ApplicationAccount, len(accounts))
	for i, account := range accounts {
		listed[i] = ApplicationAccount{Account: account, IsOwnedByCurrentUser: account.UserWorkspaceID == userWorkspaceID}
	}
	return listed, nil
}

func (c *Channels) DeleteAccount(ctx context.Context, id, userWorkspaceID string) (Account, error) {
	account, err := c.administrableAccount(ctx, c.pool, id, userWorkspaceID)
	if err != nil {
		return Account{}, err
	}
	if _, err := c.pool.Exec(ctx, `DELETE FROM core."connectedAccount" WHERE id = $1::uuid AND "workspaceId" = $2::uuid`, id, workspace.PinnedWorkspaceID); err != nil {
		return Account{}, fmt.Errorf("delete connected account: %w", err)
	}
	return account, nil
}

func (c *Channels) DisconnectAccount(ctx context.Context, id, userWorkspaceID string) (Account, error) {
	var disconnected Account
	err := pgx.BeginFunc(ctx, c.pool, func(tx pgx.Tx) error {
		if _, err := c.administrableAccount(ctx, tx, id, userWorkspaceID); err != nil {
			return err
		}
		if _, err := tx.Exec(ctx, `UPDATE core."connectedAccount" SET "accessToken" = NULL, "refreshToken" = NULL, "connectionParameters" = NULL,
			"authFailedAt" = NULL, "authFailedReason" = NULL, "archivedAt" = coalesce("archivedAt", now()), "updatedAt" = now()
			WHERE id = $1::uuid AND "workspaceId" = $2::uuid`, id, workspace.PinnedWorkspaceID); err != nil {
			return fmt.Errorf("disconnect connected account: %w", err)
		}
		for _, table := range []string{"messageChannel", "calendarChannel"} {
			if _, err := tx.Exec(ctx, `UPDATE core.`+pgx.Identifier{table}.Sanitize()+` SET "isSyncEnabled" = false,
				"webhookSubscriptionStatus" = CASE WHEN "webhookSubscriptionStatus" = 'PENDING' THEN 'EXPIRED' ELSE "webhookSubscriptionStatus" END,
				"updatedAt" = now() WHERE "connectedAccountId" = $1::uuid AND "workspaceId" = $2::uuid`, id, workspace.PinnedWorkspaceID); err != nil {
				return fmt.Errorf("disable %s sync: %w", table, err)
			}
		}
		var err error
		disconnected, err = c.account(ctx, tx, id)
		return err
	})
	return disconnected, err
}

func (c *Channels) MessageChannels(ctx context.Context, userWorkspaceID string, connectedAccountID *string) ([]MessageChannel, error) {
	if connectedAccountID != nil {
		if err := c.usableAccount(ctx, *connectedAccountID, userWorkspaceID); err != nil {
			return nil, err
		}
		return collect[MessageChannel](ctx, c.pool, `SELECT to_jsonb(m) FROM core."messageChannel" m
			WHERE m."workspaceId" = $1::uuid AND m."connectedAccountId" = $2::uuid ORDER BY m."createdAt", m.id`, workspace.PinnedWorkspaceID, *connectedAccountID)
	}
	return collect[MessageChannel](ctx, c.pool, `SELECT to_jsonb(m) FROM core."messageChannel" m
		WHERE m."workspaceId" = $1::uuid AND m."connectedAccountId" IN (
			SELECT a.id FROM core."connectedAccount" a WHERE a."workspaceId" = $1::uuid
				AND (a."userWorkspaceId" = $2::uuid OR (a.visibility = 'workspace' AND a."archivedAt" IS NULL)))
		ORDER BY m."createdAt", m.id`, workspace.PinnedWorkspaceID, userWorkspaceID)
}

func (c *Channels) MessageChannelAccount(ctx context.Context, channel MessageChannel, userWorkspaceID string) (*Account, error) {
	accounts, err := collect[Account](ctx, c.pool, `SELECT to_jsonb(a) FROM core."connectedAccount" a
		WHERE a.id = $1::uuid AND a."workspaceId" = $2::uuid AND ($3::boolean OR a."userWorkspaceId" = $4::uuid)`,
		channel.ConnectedAccountID, workspace.PinnedWorkspaceID, channel.Type == typeEmailGroup, nilIfEmpty(userWorkspaceID))
	if err != nil || len(accounts) == 0 {
		return nil, err
	}
	return &accounts[0], nil
}

func (c *Channels) UpdateMessageChannel(ctx context.Context, id, userWorkspaceID string, update map[string]any) (MessageChannel, error) {
	var updated MessageChannel
	err := pgx.BeginFunc(ctx, c.pool, func(tx pgx.Tx) error {
		channel, err := c.administrableMessageChannel(ctx, tx, id, userWorkspaceID)
		if err != nil {
			return err
		}
		if channel.Type == typeApp {
			return fmt.Errorf("%w: message channel %s is owned by an application", ErrForbidden, id)
		}
		if channel.SyncStage == stageOngoing {
			var pendingFolders bool
			if err := tx.QueryRow(ctx, `SELECT EXISTS (SELECT 1 FROM core."messageFolder" WHERE "messageChannelId" = $1::uuid AND "pendingSyncAction" <> 'NONE')`, id).Scan(&pendingFolders); err != nil {
				return fmt.Errorf("select pending folders: %w", err)
			}
			if pendingFolders || channel.PendingGroupEmailsAction != groupActionNone {
				return fmt.Errorf("%w: cannot update message channel while sync is ongoing with pending actions", ErrInvalidInput)
			}
		}
		if exclude, ok := update["excludeGroupEmails"].(bool); ok && channel.Type == typeEmail && channel.SyncStage != stagePending && exclude != channel.ExcludeGroupEmails {
			action := groupActionImport
			if exclude {
				action = groupActionDelete
			}
			if _, err := tx.Exec(ctx, `UPDATE core."messageChannel" SET "pendingGroupEmailsAction" = $2, "updatedAt" = now() WHERE id = $1::uuid`, id, action); err != nil {
				return fmt.Errorf("mark pending group emails action: %w", err)
			}
		}
		if err := updateColumns(ctx, tx, "messageChannel", id, messageChannelColumns, update); err != nil {
			return err
		}
		updated, err = c.messageChannel(ctx, tx, id)
		return err
	})
	return updated, err
}

func (c *Channels) CreateEmailGroupChannel(ctx context.Context, userWorkspaceID, handle string, displayName *string) (EmailGroupChannel, error) {
	address, err := mail.ParseAddress(handle)
	if err != nil || address.Address != handle || len(handle) > maxHandleLength {
		return EmailGroupChannel{}, fmt.Errorf("%w: handle must be an email address", ErrInvalidInput)
	}
	name, err := cleanDisplayName(displayName)
	if err != nil {
		return EmailGroupChannel{}, err
	}
	if c.inboundEmailDomain == "" {
		return EmailGroupChannel{}, errors.New("email handles are not configured: INBOUND_EMAIL_DOMAIN must be set")
	}
	random := make([]byte, forwardingRandomBytes)
	if _, err := rand.Read(random); err != nil {
		return EmailGroupChannel{}, fmt.Errorf("generate forwarding address: %w", err)
	}
	forwardingAddress := forwardingPrefix + hex.EncodeToString(random) + "@" + c.inboundEmailDomain

	var created EmailGroupChannel
	err = pgx.BeginFunc(ctx, c.pool, func(tx pgx.Tx) error {
		var accountID, channelID string
		if err := tx.QueryRow(ctx, `INSERT INTO core."connectedAccount" ("workspaceId", handle, provider, "userWorkspaceId", visibility)
			VALUES ($1::uuid, $2, $3, $4::uuid, 'workspace') RETURNING id::text`, workspace.PinnedWorkspaceID, handle, providerEmailGroup, userWorkspaceID).Scan(&accountID); err != nil {
			return fmt.Errorf("insert connected account: %w", err)
		}
		if err := tx.QueryRow(ctx, `INSERT INTO core."messageChannel" ("workspaceId", handle, "displayName", "connectedAccountId", type, visibility, "syncStage", "syncStatus",
				"isSyncEnabled", "isContactAutoCreationEnabled", "contactAutoCreationPolicy", "excludeGroupEmails", "excludeNonProfessionalEmails", "pendingGroupEmailsAction")
			VALUES ($1::uuid, $2, $3, $4::uuid, $5, 'SHARE_EVERYTHING', 'MESSAGE_LIST_FETCH_PENDING', 'ACTIVE', true, true, 'SENT_AND_RECEIVED', false, false, $6)
			RETURNING id::text`, workspace.PinnedWorkspaceID, forwardingAddress, name, accountID, typeEmailGroup, groupActionNone).Scan(&channelID); err != nil {
			return fmt.Errorf("insert message channel: %w", err)
		}
		channel, err := c.messageChannel(ctx, tx, channelID)
		created = EmailGroupChannel{MessageChannel: channel, ForwardingAddress: forwardingAddress}
		return err
	})
	return created, err
}

func (c *Channels) UpdateEmailGroupChannel(ctx context.Context, id, userWorkspaceID string, update map[string]any) (MessageChannel, error) {
	channel, err := c.emailGroupChannel(ctx, id, userWorkspaceID)
	if err != nil {
		return MessageChannel{}, err
	}
	raw, present := update["displayName"]
	if !present {
		return channel, nil
	}
	var displayName *string
	if text, ok := raw.(string); ok {
		displayName = &text
	}
	name, err := cleanDisplayName(displayName)
	if err != nil {
		return MessageChannel{}, err
	}
	if _, err := c.pool.Exec(ctx, `UPDATE core."messageChannel" SET "displayName" = $2, "updatedAt" = now() WHERE id = $1::uuid`, id, name); err != nil {
		return MessageChannel{}, fmt.Errorf("update email group channel: %w", err)
	}
	return c.messageChannel(ctx, c.pool, id)
}

func (c *Channels) DeleteEmailGroupChannel(ctx context.Context, id, userWorkspaceID string) (MessageChannel, error) {
	channel, err := c.emailGroupChannel(ctx, id, userWorkspaceID)
	if err != nil {
		return MessageChannel{}, err
	}
	if _, err := c.pool.Exec(ctx, `DELETE FROM core."connectedAccount" WHERE id = $1::uuid AND "workspaceId" = $2::uuid`, channel.ConnectedAccountID, workspace.PinnedWorkspaceID); err != nil {
		return MessageChannel{}, fmt.Errorf("delete connected account: %w", err)
	}
	return channel, nil
}

func (c *Channels) CalendarChannels(ctx context.Context, userWorkspaceID string, connectedAccountID *string) ([]CalendarChannel, error) {
	if connectedAccountID != nil {
		if err := c.usableAccount(ctx, *connectedAccountID, userWorkspaceID); err != nil {
			return nil, err
		}
		return collect[CalendarChannel](ctx, c.pool, `SELECT to_jsonb(k) FROM core."calendarChannel" k
			WHERE k."workspaceId" = $1::uuid AND k."connectedAccountId" = $2::uuid ORDER BY k."createdAt", k.id`, workspace.PinnedWorkspaceID, *connectedAccountID)
	}
	return collect[CalendarChannel](ctx, c.pool, `SELECT to_jsonb(k) FROM core."calendarChannel" k
		WHERE k."workspaceId" = $1::uuid AND k."connectedAccountId" IN (
			SELECT a.id FROM core."connectedAccount" a WHERE a."workspaceId" = $1::uuid AND a."userWorkspaceId" = $2::uuid)
		ORDER BY k."createdAt", k.id`, workspace.PinnedWorkspaceID, userWorkspaceID)
}

func (c *Channels) UpdateCalendarChannel(ctx context.Context, id, userWorkspaceID string, update map[string]any) (CalendarChannel, error) {
	var updated CalendarChannel
	err := pgx.BeginFunc(ctx, c.pool, func(tx pgx.Tx) error {
		channel, err := calendarChannel(ctx, tx, id)
		if err != nil {
			return err
		}
		account, err := c.account(ctx, tx, channel.ConnectedAccountID)
		if err != nil {
			return err
		}
		if account.UserWorkspaceID != userWorkspaceID {
			return fmt.Errorf("%w: calendar channel %s does not belong to the caller", ErrForbidden, id)
		}
		if err := updateColumns(ctx, tx, "calendarChannel", id, calendarChannelColumns, update); err != nil {
			return err
		}
		updated, err = calendarChannel(ctx, tx, id)
		return err
	})
	return updated, err
}

type queryExecer interface {
	Query(ctx context.Context, sql string, args ...any) (pgx.Rows, error)
	Exec(ctx context.Context, sql string, args ...any) (pgconn.CommandTag, error)
}

func collect[TRecord any](ctx context.Context, db queryExecer, sql string, args ...any) ([]TRecord, error) {
	rows, err := db.Query(ctx, sql, args...)
	if err != nil {
		return nil, fmt.Errorf("query: %w", err)
	}
	records, err := pgx.CollectRows(rows, pgx.RowTo[TRecord])
	if err != nil {
		return nil, fmt.Errorf("scan: %w", err)
	}
	return records, nil
}

func (c *Channels) account(ctx context.Context, db queryExecer, id string) (Account, error) {
	accounts, err := collect[Account](ctx, db, `SELECT to_jsonb(a) FROM core."connectedAccount" a WHERE a.id = $1::uuid AND a."workspaceId" = $2::uuid`, id, workspace.PinnedWorkspaceID)
	if err != nil {
		return Account{}, err
	}
	if len(accounts) == 0 {
		return Account{}, fmt.Errorf("connected account %s: %w", id, ErrNotFound)
	}
	return accounts[0], nil
}

func (c *Channels) usableAccount(ctx context.Context, id, userWorkspaceID string) error {
	account, err := c.account(ctx, c.pool, id)
	if err != nil {
		return err
	}
	if account.Visibility != "workspace" && account.UserWorkspaceID != userWorkspaceID {
		return fmt.Errorf("%w: connected account %s is not usable by the caller", ErrForbidden, id)
	}
	return nil
}

func (c *Channels) administrableAccount(ctx context.Context, db queryExecer, id, userWorkspaceID string) (Account, error) {
	account, err := c.account(ctx, db, id)
	if err != nil {
		return Account{}, err
	}
	if account.Visibility != "workspace" && account.UserWorkspaceID != userWorkspaceID {
		return Account{}, fmt.Errorf("%w: connected account %s cannot be administered by the caller", ErrForbidden, id)
	}
	return account, nil
}

func (c *Channels) messageChannel(ctx context.Context, db queryExecer, id string) (MessageChannel, error) {
	channels, err := collect[MessageChannel](ctx, db, `SELECT to_jsonb(m) FROM core."messageChannel" m WHERE m.id = $1::uuid AND m."workspaceId" = $2::uuid`, id, workspace.PinnedWorkspaceID)
	if err != nil {
		return MessageChannel{}, err
	}
	if len(channels) == 0 {
		return MessageChannel{}, fmt.Errorf("message channel %s: %w", id, ErrNotFound)
	}
	return channels[0], nil
}

func calendarChannel(ctx context.Context, db queryExecer, id string) (CalendarChannel, error) {
	channels, err := collect[CalendarChannel](ctx, db, `SELECT to_jsonb(k) FROM core."calendarChannel" k WHERE k.id = $1::uuid AND k."workspaceId" = $2::uuid`, id, workspace.PinnedWorkspaceID)
	if err != nil {
		return CalendarChannel{}, err
	}
	if len(channels) == 0 {
		return CalendarChannel{}, fmt.Errorf("calendar channel %s: %w", id, ErrNotFound)
	}
	return channels[0], nil
}

func (c *Channels) administrableMessageChannel(ctx context.Context, db queryExecer, id, userWorkspaceID string) (MessageChannel, error) {
	channel, err := c.messageChannel(ctx, db, id)
	if err != nil {
		return MessageChannel{}, err
	}
	if _, err := c.administrableAccount(ctx, db, channel.ConnectedAccountID, userWorkspaceID); err != nil {
		return MessageChannel{}, err
	}
	return channel, nil
}

func (c *Channels) emailGroupChannel(ctx context.Context, id, userWorkspaceID string) (MessageChannel, error) {
	channel, err := c.administrableMessageChannel(ctx, c.pool, id, userWorkspaceID)
	if err != nil {
		return MessageChannel{}, err
	}
	if channel.Type != typeEmailGroup {
		return MessageChannel{}, fmt.Errorf("%w: message channel %s is not an email group", ErrInvalidInput, id)
	}
	return channel, nil
}

func updateColumns(ctx context.Context, db queryExecer, table, id string, allowed []string, update map[string]any) error {
	assignments, args := []string{}, []any{id}
	for _, column := range allowed {
		if value, ok := update[column]; ok && value != nil {
			args = append(args, value)
			assignments = append(assignments, fmt.Sprintf(`%s = $%d`, pgx.Identifier{column}.Sanitize(), len(args)))
		}
	}
	if len(assignments) == 0 {
		return nil
	}
	if _, err := db.Exec(ctx, `UPDATE core.`+pgx.Identifier{table}.Sanitize()+` SET `+strings.Join(assignments, ", ")+`, "updatedAt" = now() WHERE id = $1::uuid`, args...); err != nil {
		return fmt.Errorf("update %s: %w", table, err)
	}
	return nil
}

func cleanDisplayName(displayName *string) (*string, error) {
	if displayName == nil {
		return nil, nil
	}
	trimmed := strings.TrimSpace(*displayName)
	if len(trimmed) > maxDisplayNameLength {
		return nil, fmt.Errorf("%w: displayName is longer than %d characters", ErrInvalidInput, maxDisplayNameLength)
	}
	if trimmed == "" {
		return nil, nil
	}
	return &trimmed, nil
}

func nilIfEmpty(value string) *string {
	if value == "" {
		return nil
	}
	return &value
}
