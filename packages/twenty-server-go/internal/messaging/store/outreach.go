package store

import (
	"context"
	"errors"
	"fmt"
	"slices"
	"strings"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/twentyhq/twenty/packages/twenty-server-go/internal/metadata"
	"github.com/twentyhq/twenty/packages/twenty-server-go/internal/workspace"
)

const (
	maxSuppressionPageSize   = 500
	defaultSuppressionLimit  = 50
	isoMillisecondsLayout    = "2006-01-02T15:04:05.000Z"
	folderActionImport       = "FOLDER_IMPORT"
	folderActionDeletion     = "FOLDER_DELETION"
	folderActionNone         = "NONE"
	messageListCopySuffix    = " (copy)"
	visibilityPublic         = "PUBLIC"
	visibilityPrivate        = "PRIVATE"
	stageMessageListPending  = "MESSAGE_LIST_FETCH_PENDING"
	stageCalendarListPending = "CALENDAR_EVENT_LIST_FETCH_PENDING"
)

type MessageFolder struct {
	ID                string             `json:"id"`
	Name              *string            `json:"name"`
	IsSynced          bool               `json:"isSynced"`
	IsSentFolder      bool               `json:"isSentFolder"`
	ParentFolderID    *string            `json:"parentFolderId"`
	ExternalID        *string            `json:"externalId"`
	PendingSyncAction string             `json:"pendingSyncAction"`
	MessageChannelID  string             `json:"messageChannelId"`
	CreatedAt         metadata.Timestamp `json:"createdAt"`
	UpdatedAt         metadata.Timestamp `json:"updatedAt"`
}

type MessageSuppression struct {
	ID                 string             `json:"id"`
	EmailAddress       string             `json:"emailAddress"`
	Reason             string             `json:"reason"`
	Source             string             `json:"source"`
	UnsubscribeTopicID *string            `json:"unsubscribeTopicId"`
	CreatedAt          metadata.Timestamp `json:"createdAt"`
}

type MessageSuppressionList struct {
	Records    []MessageSuppression
	TotalCount int
}

type UnsubscribeTopic struct {
	ID          string             `json:"id"`
	Name        *string            `json:"name"`
	Description *string            `json:"description"`
	Visibility  string             `json:"visibility"`
	CreatedAt   metadata.Timestamp `json:"createdAt"`
	UpdatedAt   metadata.Timestamp `json:"updatedAt"`
}

type DuplicatedMessageList struct {
	ID          string
	Name        *string
	Description *string
	Position    int
	MemberCount int
	CreatedAt   string
	UpdatedAt   string
}

type SuppressionFilter struct {
	Limit, Offset      int
	Reason             string
	SearchTerm         string
	UnsubscribeTopicID string
}

type Outreach struct{ pool *pgxpool.Pool }

func NewOutreach(pool *pgxpool.Pool) *Outreach { return &Outreach{pool: pool} }

func (o *Outreach) MessageFolders(ctx context.Context, userWorkspaceID string, messageChannelID *string) ([]MessageFolder, error) {
	return collect[MessageFolder](ctx, o.pool, `SELECT to_jsonb(f) FROM core."messageFolder" f
		JOIN core."messageChannel" m ON m.id = f."messageChannelId"
		JOIN core."connectedAccount" a ON a.id = m."connectedAccountId"
		WHERE f."workspaceId" = $1::uuid AND ($2::uuid IS NULL OR f."messageChannelId" = $2::uuid)
			AND (a."userWorkspaceId" = $3::uuid OR (a.visibility = 'workspace' AND a."archivedAt" IS NULL))
		ORDER BY f."createdAt", f.id`, workspace.PinnedWorkspaceID, messageChannelID, userWorkspaceID)
}

func (o *Outreach) UpdateMessageFolders(ctx context.Context, userWorkspaceID string, ids []string, isSynced bool) ([]MessageFolder, error) {
	var updated []MessageFolder
	err := pgx.BeginFunc(ctx, o.pool, func(tx pgx.Tx) error {
		for _, id := range ids {
			var stage, accountOwner, accountVisibility string
			err := tx.QueryRow(ctx, `SELECT m."syncStage", a."userWorkspaceId"::text, a.visibility
				FROM core."messageFolder" f JOIN core."messageChannel" m ON m.id = f."messageChannelId"
				JOIN core."connectedAccount" a ON a.id = m."connectedAccountId"
				WHERE f.id = $1::uuid AND f."workspaceId" = $2::uuid FOR UPDATE OF f`, id, workspace.PinnedWorkspaceID).Scan(&stage, &accountOwner, &accountVisibility)
			if errors.Is(err, pgx.ErrNoRows) {
				return fmt.Errorf("message folder %s: %w", id, ErrNotFound)
			}
			if err != nil {
				return fmt.Errorf("select message folder: %w", err)
			}
			if accountVisibility != "workspace" && accountOwner != userWorkspaceID {
				return fmt.Errorf("%w: message folder %s cannot be administered by the caller", ErrForbidden, id)
			}
			action := folderActionNone
			if stage != stagePending {
				action = folderActionDeletion
				if isSynced {
					action = folderActionImport
				}
			}
			if _, err := tx.Exec(ctx, `UPDATE core."messageFolder" SET "isSynced" = $2, "pendingSyncAction" = $3, "updatedAt" = now() WHERE id = $1::uuid`,
				id, isSynced, action); err != nil {
				return fmt.Errorf("update message folder: %w", err)
			}
		}
		var err error
		updated, err = collect[MessageFolder](ctx, tx, `SELECT to_jsonb(f) FROM core."messageFolder" f WHERE f.id = ANY($1::uuid[]) ORDER BY f."createdAt", f.id`, ids)
		return err
	})
	return updated, err
}

func (o *Outreach) StartChannelSync(ctx context.Context, userWorkspaceID, connectedAccountID string) ([]string, error) {
	var channelIDs []string
	err := pgx.BeginFunc(ctx, o.pool, func(tx pgx.Tx) error {
		var owner, visibility string
		err := tx.QueryRow(ctx, `SELECT "userWorkspaceId"::text, visibility FROM core."connectedAccount" WHERE id = $1::uuid AND "workspaceId" = $2::uuid`,
			connectedAccountID, workspace.PinnedWorkspaceID).Scan(&owner, &visibility)
		if errors.Is(err, pgx.ErrNoRows) {
			return fmt.Errorf("connected account %s: %w", connectedAccountID, ErrNotFound)
		}
		if err != nil {
			return fmt.Errorf("select connected account: %w", err)
		}
		if visibility != "workspace" && owner != userWorkspaceID {
			return fmt.Errorf("%w: connected account %s is not usable by the caller", ErrForbidden, connectedAccountID)
		}
		rows, err := tx.Query(ctx, `UPDATE core."messageChannel" SET "syncStage" = $3, "syncStageStartedAt" = now(), "updatedAt" = now()
			WHERE "connectedAccountId" = $1::uuid AND "workspaceId" = $2::uuid AND "syncStage" = $4 RETURNING id::text`,
			connectedAccountID, workspace.PinnedWorkspaceID, stageMessageListPending, stagePending)
		if err != nil {
			return fmt.Errorf("start message channel sync: %w", err)
		}
		if channelIDs, err = pgx.CollectRows(rows, pgx.RowTo[string]); err != nil {
			return fmt.Errorf("scan message channels: %w", err)
		}
		if _, err := tx.Exec(ctx, `UPDATE core."calendarChannel" SET "syncStage" = $3, "syncStageStartedAt" = now(), "updatedAt" = now()
			WHERE "connectedAccountId" = $1::uuid AND "workspaceId" = $2::uuid AND "syncStage" = $4`,
			connectedAccountID, workspace.PinnedWorkspaceID, stageCalendarListPending, stagePending); err != nil {
			return fmt.Errorf("start calendar channel sync: %w", err)
		}
		return nil
	})
	return channelIDs, err
}

func (o *Outreach) MessageSuppressions(ctx context.Context, filter SuppressionFilter) (MessageSuppressionList, error) {
	if filter.Limit < 0 || filter.Offset < 0 || filter.Limit > maxSuppressionPageSize {
		return MessageSuppressionList{}, fmt.Errorf("%w: limit %d offset %d", ErrInvalidInput, filter.Limit, filter.Offset)
	}
	if filter.Limit == 0 {
		filter.Limit = defaultSuppressionLimit
	}
	where := ` FROM ` + table("messageSuppression") + ` s WHERE s."deletedAt" IS NULL
		AND ($1::text = '' OR s.reason = $1::text) AND ($2::text = '' OR s."emailAddress" ILIKE '%' || $2::text || '%')
		AND ($3::text = '' OR s."unsubscribeTopicId" = NULLIF($3::text, '')::uuid)`
	args := []any{filter.Reason, escapeLike(filter.SearchTerm), filter.UnsubscribeTopicID}
	list := MessageSuppressionList{Records: []MessageSuppression{}}
	if err := o.pool.QueryRow(ctx, `SELECT count(*)`+where, args...).Scan(&list.TotalCount); err != nil {
		return MessageSuppressionList{}, fmt.Errorf("count message suppressions: %w", err)
	}
	records, err := collect[MessageSuppression](ctx, o.pool, `SELECT to_jsonb(s)`+where+` ORDER BY s."createdAt" DESC, s.id OFFSET $4 LIMIT $5`,
		append(args, filter.Offset, filter.Limit)...)
	if err != nil {
		return MessageSuppressionList{}, err
	}
	list.Records = append(list.Records, records...)
	return list, nil
}

func escapeLike(term string) string {
	return strings.NewReplacer(`\`, `\\`, `%`, `\%`, `_`, `\_`).Replace(term)
}

func (o *Outreach) UnsubscribeTopics(ctx context.Context) ([]UnsubscribeTopic, error) {
	return collect[UnsubscribeTopic](ctx, o.pool, `SELECT to_jsonb(t) FROM core."unsubscribeTopic" t WHERE t."workspaceId" = $1::uuid ORDER BY t."createdAt", t.id`,
		workspace.PinnedWorkspaceID)
}

func (o *Outreach) CreateUnsubscribeTopic(ctx context.Context, name string, description *string, visibility string) (UnsubscribeTopic, error) {
	name = strings.TrimSpace(name)
	if name == "" {
		return UnsubscribeTopic{}, fmt.Errorf("%w: name is required", ErrInvalidInput)
	}
	if visibility == "" {
		visibility = visibilityPrivate
	}
	if !slices.Contains([]string{visibilityPublic, visibilityPrivate}, visibility) {
		return UnsubscribeTopic{}, fmt.Errorf("%w: visibility %q", ErrInvalidInput, visibility)
	}
	topics, err := collect[UnsubscribeTopic](ctx, o.pool, `INSERT INTO core."unsubscribeTopic" ("workspaceId", name, description, visibility)
		VALUES ($1::uuid, $2, $3, $4) RETURNING to_jsonb("unsubscribeTopic")`, workspace.PinnedWorkspaceID, name, description, visibility)
	if err != nil {
		return UnsubscribeTopic{}, err
	}
	return topics[0], nil
}

func (o *Outreach) UpdateUnsubscribeTopic(ctx context.Context, id string, update map[string]any) (UnsubscribeTopic, error) {
	if visibility, ok := update["visibility"].(string); ok && !slices.Contains([]string{visibilityPublic, visibilityPrivate}, visibility) {
		return UnsubscribeTopic{}, fmt.Errorf("%w: visibility %q", ErrInvalidInput, visibility)
	}
	if name, ok := update["name"].(string); ok {
		if name = strings.TrimSpace(name); name == "" {
			return UnsubscribeTopic{}, fmt.Errorf("%w: name cannot be empty", ErrInvalidInput)
		}
		update["name"] = name
	}
	var updated UnsubscribeTopic
	err := pgx.BeginFunc(ctx, o.pool, func(tx pgx.Tx) error {
		existing, err := collect[UnsubscribeTopic](ctx, tx, `SELECT to_jsonb(t) FROM core."unsubscribeTopic" t WHERE t.id = $1::uuid AND t."workspaceId" = $2::uuid`, id, workspace.PinnedWorkspaceID)
		if err != nil {
			return err
		}
		if len(existing) == 0 {
			return fmt.Errorf("unsubscribe topic %s: %w", id, ErrNotFound)
		}
		if err := updateColumns(ctx, tx, "unsubscribeTopic", id, []string{"name", "description", "visibility"}, update); err != nil {
			return err
		}
		topics, err := collect[UnsubscribeTopic](ctx, tx, `SELECT to_jsonb(t) FROM core."unsubscribeTopic" t WHERE t.id = $1::uuid`, id)
		if err != nil {
			return err
		}
		updated = topics[0]
		return nil
	})
	return updated, err
}

func (o *Outreach) DeleteUnsubscribeTopic(ctx context.Context, id string) error {
	tag, err := o.pool.Exec(ctx, `DELETE FROM core."unsubscribeTopic" WHERE id = $1::uuid AND "workspaceId" = $2::uuid`, id, workspace.PinnedWorkspaceID)
	if err != nil {
		return fmt.Errorf("delete unsubscribe topic: %w", err)
	}
	if tag.RowsAffected() == 0 {
		return fmt.Errorf("unsubscribe topic %s: %w", id, ErrNotFound)
	}
	return nil
}

func (o *Outreach) DuplicateMessageList(ctx context.Context, id string) (DuplicatedMessageList, error) {
	var copied DuplicatedMessageList
	err := pgx.BeginFunc(ctx, o.pool, func(tx pgx.Tx) error {
		lists, listMembers := table("messageList"), table("messageListMember")
		var name, description *string
		err := tx.QueryRow(ctx, `SELECT name, description FROM `+lists+` WHERE id = $1::uuid AND "deletedAt" IS NULL`, id).Scan(&name, &description)
		if errors.Is(err, pgx.ErrNoRows) {
			return fmt.Errorf("message list %s: %w", id, ErrNotFound)
		}
		if err != nil {
			return fmt.Errorf("select message list: %w", err)
		}
		if name != nil {
			copiedName := *name + messageListCopySuffix
			name = &copiedName
		}
		var createdAt, updatedAt time.Time
		err = tx.QueryRow(ctx, `INSERT INTO `+lists+` (name, description, "position")
			VALUES ($1, $2, (SELECT floor(coalesce(max("position"), 0)) + 1 FROM `+lists+` WHERE "deletedAt" IS NULL))
			RETURNING id::text, "position"::int, "createdAt", "updatedAt"`, name, description).Scan(&copied.ID, &copied.Position, &createdAt, &updatedAt)
		if err != nil {
			return fmt.Errorf("insert message list: %w", err)
		}
		tag, err := tx.Exec(ctx, `INSERT INTO `+listMembers+` ("listId", "personId", "position")
			SELECT $2::uuid, "personId", "position" FROM `+listMembers+` WHERE "listId" = $1::uuid AND "deletedAt" IS NULL`, id, copied.ID)
		if err != nil {
			return fmt.Errorf("copy message list members: %w", err)
		}
		copied.Name, copied.Description = name, description
		copied.MemberCount = int(tag.RowsAffected())
		copied.CreatedAt, copied.UpdatedAt = createdAt.UTC().Format(isoMillisecondsLayout), updatedAt.UTC().Format(isoMillisecondsLayout)
		return nil
	})
	return copied, err
}
