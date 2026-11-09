package store

import (
	"context"
	"fmt"
	"slices"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/twentyhq/twenty/packages/twenty-server-go/internal/messaging"
	"github.com/twentyhq/twenty/packages/twenty-server-go/internal/workspace"
)

var targetColumnByObject = map[string]string{
	"person": "targetPersonId", "company": "targetCompanyId", "opportunity": "targetOpportunityId",
}

type Timeline struct{ pool *pgxpool.Pool }

func NewTimeline(pool *pgxpool.Pool) *Timeline { return &Timeline{pool: pool} }

// ThreadsForRecord returns one page of the record's threads, newest first. Objects other than person,
// company and opportunity have no thread targets and yield an empty page.
func (t *Timeline) ThreadsForRecord(ctx context.Context, userWorkspaceID, objectNameSingular, recordID string, page, pageSize int) (messaging.TimelineThreadsWithTotal, error) {
	if page < 1 || pageSize < 1 || pageSize > messaging.TimelineThreadsMaxPageSize {
		return messaging.TimelineThreadsWithTotal{}, fmt.Errorf("page %d size %d: %w", page, pageSize, messaging.ErrInvalidTimelinePage)
	}
	column, ok := targetColumnByObject[objectNameSingular]
	if !ok {
		return messaging.TimelineThreadsWithTotal{TimelineThreads: []messaging.TimelineThread{}, RelatedPersonIDs: []string{}}, nil
	}
	personIDs, err := t.relatedPersonIDs(ctx, objectNameSingular, recordID)
	if err != nil {
		return messaging.TimelineThreadsWithTotal{}, err
	}
	total, ids, err := t.pageOfThreadIDs(ctx, column, recordID, (page-1)*pageSize, pageSize)
	if err != nil {
		return messaging.TimelineThreadsWithTotal{}, err
	}
	result := messaging.TimelineThreadsWithTotal{TotalNumberOfThreads: total, TimelineThreads: []messaging.TimelineThread{}, RelatedPersonIDs: personIDs}
	if len(ids) == 0 {
		return result, nil
	}
	summaries, err := t.summaries(ctx, ids)
	if err != nil {
		return messaging.TimelineThreadsWithTotal{}, err
	}
	senders, err := t.senders(ctx, ids)
	if err != nil {
		return messaging.TimelineThreadsWithTotal{}, err
	}
	visibility, err := t.visibility(ctx, ids, userWorkspaceID)
	if err != nil {
		return messaging.TimelineThreadsWithTotal{}, err
	}
	if result.TimelineThreads, err = messaging.FormatThreads(summaries, senders, visibility); err != nil {
		return messaging.TimelineThreadsWithTotal{}, err
	}
	return result, nil
}

func (t *Timeline) relatedPersonIDs(ctx context.Context, objectNameSingular, recordID string) ([]string, error) {
	schema := workspace.SchemaName()
	var query string
	switch objectNameSingular {
	case "person":
		return []string{recordID}, nil
	case "company":
		query = `SELECT id::text FROM ` + schema + `."person" WHERE "companyId" = $1::uuid AND "deletedAt" IS NULL
			UNION SELECT o."pointOfContactId"::text FROM ` + schema + `."opportunity" o
			WHERE o."companyId" = $1::uuid AND o."pointOfContactId" IS NOT NULL AND o."deletedAt" IS NULL`
	default:
		query = `SELECT o."pointOfContactId"::text FROM ` + schema + `."opportunity" o
			WHERE o.id = $1::uuid AND o."pointOfContactId" IS NOT NULL AND o."deletedAt" IS NULL
			UNION SELECT p.id::text FROM ` + schema + `."person" p JOIN ` + schema + `."opportunity" o ON o."companyId" = p."companyId"
			WHERE o.id = $1::uuid AND p."deletedAt" IS NULL AND o."deletedAt" IS NULL`
	}
	rows, err := t.pool.Query(ctx, query, recordID)
	if err != nil {
		return nil, fmt.Errorf("select related people: %w", err)
	}
	ids, err := pgx.CollectRows(rows, pgx.RowTo[string])
	if err != nil {
		return nil, fmt.Errorf("scan related people: %w", err)
	}
	slices.Sort(ids)
	return append([]string{}, ids...), nil
}

func (t *Timeline) pageOfThreadIDs(ctx context.Context, column, recordID string, offset, limit int) (int, []string, error) {
	schema := workspace.SchemaName()
	from := ` FROM ` + schema + `."messageThread" t
		JOIN ` + schema + `."message" m ON m."messageThreadId" = t.id AND m."deletedAt" IS NULL
		JOIN ` + schema + `."messageThreadTarget" tt ON tt."messageThreadId" = t.id AND tt."deletedAt" IS NULL
		WHERE tt."` + column + `" = $1::uuid AND t."deletedAt" IS NULL`
	var total int
	if err := t.pool.QueryRow(ctx, `SELECT count(DISTINCT t.id)`+from, recordID).Scan(&total); err != nil {
		return 0, nil, fmt.Errorf("count threads: %w", err)
	}
	rows, err := t.pool.Query(ctx, `SELECT t.id::text`+from+` GROUP BY t.id ORDER BY max(m."receivedAt") DESC, t.id OFFSET $2 LIMIT $3`, recordID, offset, limit)
	if err != nil {
		return 0, nil, fmt.Errorf("select thread page: %w", err)
	}
	ids, err := pgx.CollectRows(rows, pgx.RowTo[string])
	if err != nil {
		return 0, nil, fmt.Errorf("scan thread page: %w", err)
	}
	return total, ids, nil
}

func (t *Timeline) summaries(ctx context.Context, ids []string) ([]messaging.ThreadSummary, error) {
	rows, err := t.pool.Query(ctx, `SELECT "messageThreadId"::text, coalesce(subject, ''), coalesce(text, ''), "receivedAt", coalesce("isDraft", false)
		FROM `+workspace.SchemaName()+`."message" WHERE "messageThreadId" = ANY($1::uuid[]) AND "deletedAt" IS NULL
		ORDER BY "messageThreadId", "receivedAt" DESC, id`, ids)
	if err != nil {
		return nil, fmt.Errorf("select thread messages: %w", err)
	}
	defer rows.Close()
	byThread := map[string]*messaging.ThreadSummary{}
	for rows.Next() {
		var threadID, subject, text string
		var receivedAt *time.Time
		var isDraft bool
		if err := rows.Scan(&threadID, &subject, &text, &receivedAt, &isDraft); err != nil {
			return nil, fmt.Errorf("scan thread message: %w", err)
		}
		summary, seen := byThread[threadID]
		if !seen {
			received := time.Now()
			if receivedAt != nil {
				received = *receivedAt
			}
			summary = &messaging.ThreadSummary{ID: threadID, LastMessageBody: text, LastMessageReceivedAt: received, LastMessageIsDraft: isDraft}
			byThread[threadID] = summary
		}
		summary.Subject = subject
		summary.MessageCount++
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("iterate thread messages: %w", err)
	}
	summaries := make([]messaging.ThreadSummary, 0, len(ids))
	for _, id := range ids {
		if summary, ok := byThread[id]; ok {
			summaries = append(summaries, *summary)
		}
	}
	return summaries, nil
}

func (t *Timeline) senders(ctx context.Context, ids []string) (map[string][]messaging.ThreadSender, error) {
	schema := workspace.SchemaName()
	rows, err := t.pool.Query(ctx, `SELECT thread, handle, display, "personId", "workspaceMemberId", pf, pl, pa, mf, ml, ma FROM (
		SELECT DISTINCT ON (m."messageThreadId", mp.handle)
			m."messageThreadId"::text AS thread, mp.handle, coalesce(mp."displayName", '') AS display,
			mp."personId"::text AS "personId", mp."workspaceMemberId"::text AS "workspaceMemberId",
			coalesce(p."nameFirstName", '') AS pf, coalesce(p."nameLastName", '') AS pl, coalesce(p."avatarUrl", '') AS pa,
			coalesce(wm."nameFirstName", '') AS mf, coalesce(wm."nameLastName", '') AS ml, coalesce(wm."avatarUrl", '') AS ma,
			m."receivedAt" AS received, mp.id AS participant
		FROM `+schema+`."messageParticipant" mp
		JOIN `+schema+`."message" m ON m.id = mp."messageId" AND m."deletedAt" IS NULL
		LEFT JOIN `+schema+`."person" p ON p.id = mp."personId" AND p."deletedAt" IS NULL
		LEFT JOIN `+schema+`."workspaceMember" wm ON wm.id = mp."workspaceMemberId" AND wm."deletedAt" IS NULL
		WHERE m."messageThreadId" = ANY($1::uuid[]) AND mp.role = 'FROM' AND mp."deletedAt" IS NULL
		ORDER BY m."messageThreadId", mp.handle, m."receivedAt", mp.id
	) distinct_senders ORDER BY thread, received NULLS LAST, participant`, ids)
	if err != nil {
		return nil, fmt.Errorf("select thread senders: %w", err)
	}
	defer rows.Close()
	senders := map[string][]messaging.ThreadSender{}
	for rows.Next() {
		var thread string
		var sender messaging.ThreadSender
		if err := rows.Scan(&thread, &sender.Handle, &sender.DisplayName, &sender.PersonID, &sender.WorkspaceMemberID,
			&sender.PersonFirstName, &sender.PersonLastName, &sender.PersonAvatarURL,
			&sender.MemberFirstName, &sender.MemberLastName, &sender.MemberAvatarURL); err != nil {
			return nil, fmt.Errorf("scan thread sender: %w", err)
		}
		senders[thread] = append(senders[thread], sender)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("iterate thread senders: %w", err)
	}
	return senders, nil
}

func (t *Timeline) visibility(ctx context.Context, ids []string, userWorkspaceID string) (map[string]string, error) {
	schema := workspace.SchemaName()
	rows, err := t.pool.Query(ctx, `SELECT DISTINCT m."messageThreadId"::text,
			CASE WHEN ca."userWorkspaceId" = $3::uuid THEN 'SHARE_EVERYTHING' ELSE mc.visibility::text END
		FROM `+schema+`."message" m
		JOIN `+schema+`."messageChannelMessageAssociation" a ON a."messageId" = m.id AND a."deletedAt" IS NULL
		JOIN core."messageChannel" mc ON mc.id = a."messageChannelId" AND mc."workspaceId" = $2::uuid
		LEFT JOIN core."connectedAccount" ca ON ca.id = mc."connectedAccountId"
		WHERE m."messageThreadId" = ANY($1::uuid[]) AND m."deletedAt" IS NULL`, ids, workspace.PinnedWorkspaceID, nullIfEmpty(userWorkspaceID))
	if err != nil {
		return nil, fmt.Errorf("select thread visibility: %w", err)
	}
	defer rows.Close()
	rank := []string{messaging.VisibilityMetadata, messaging.VisibilitySubject, messaging.VisibilityShareEverything}
	visibility := map[string]string{}
	for rows.Next() {
		var thread, channel string
		if err := rows.Scan(&thread, &channel); err != nil {
			return nil, fmt.Errorf("scan thread visibility: %w", err)
		}
		if current, seen := visibility[thread]; !seen || slices.Index(rank, channel) > slices.Index(rank, current) {
			visibility[thread] = channel
		}
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("iterate thread visibility: %w", err)
	}
	return visibility, nil
}

func nullIfEmpty(value string) *string {
	if value == "" {
		return nil
	}
	return &value
}
