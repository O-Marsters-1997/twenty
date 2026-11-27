package store

import (
	"context"
	"errors"
	"fmt"
	"slices"
	"time"

	"github.com/jackc/pgx/v5"

	"github.com/twentyhq/twenty/packages/twenty-server-go/internal/messaging"
	"github.com/twentyhq/twenty/packages/twenty-server-go/internal/metadata"
	"github.com/twentyhq/twenty/packages/twenty-server-go/internal/workspace"
)

const maxCalendarPageSize = 100

type Link struct {
	Label string `json:"label"`
	URL   string `json:"url"`
}

type Links struct {
	PrimaryLinkLabel string
	PrimaryLinkURL   string
	SecondaryLinks   []Link
}

type CalendarParticipant struct {
	PersonID          *string
	WorkspaceMemberID *string
	FirstName         string
	LastName          string
	DisplayName       string
	AvatarURL         string
	Handle            string
}

type CalendarEvent struct {
	ID                 string
	Title              string
	IsCanceled         bool
	IsFullDay          bool
	StartsAt           metadata.Timestamp
	EndsAt             metadata.Timestamp
	Description        string
	Location           string
	ConferenceSolution string
	ConferenceLink     Links
	Participants       []CalendarParticipant
	Visibility         string
}

type CalendarEventsWithTotal struct {
	TotalNumberOfCalendarEvents int
	TimelineCalendarEvents      []CalendarEvent
	RelatedPersonIDs            []string
}

func (t *Timeline) CalendarEventsForRecord(ctx context.Context, userWorkspaceID, objectNameSingular, recordID string, page, pageSize int) (CalendarEventsWithTotal, error) {
	if page < 1 || pageSize < 1 || pageSize > maxCalendarPageSize {
		return CalendarEventsWithTotal{}, fmt.Errorf("page %d size %d: %w", page, pageSize, messaging.ErrInvalidTimelinePage)
	}
	result := CalendarEventsWithTotal{TimelineCalendarEvents: []CalendarEvent{}, RelatedPersonIDs: []string{}}
	if _, ok := targetColumnByObject[objectNameSingular]; !ok {
		return result, nil
	}
	personIDs, err := t.relatedPersonIDs(ctx, objectNameSingular, recordID)
	if err != nil {
		return CalendarEventsWithTotal{}, err
	}
	result.RelatedPersonIDs = personIDs
	schema := workspace.SchemaName()
	from := ` FROM ` + schema + `."calendarEvent" e WHERE e."deletedAt" IS NULL AND EXISTS (
		SELECT 1 FROM ` + schema + `."calendarEventParticipant" p WHERE p."calendarEventId" = e.id AND p."deletedAt" IS NULL AND p."personId" = ANY($1::uuid[]))`
	if err := t.pool.QueryRow(ctx, `SELECT count(*)`+from, personIDs).Scan(&result.TotalNumberOfCalendarEvents); err != nil {
		return CalendarEventsWithTotal{}, fmt.Errorf("count calendar events: %w", err)
	}
	rows, err := t.pool.Query(ctx, `SELECT e.id::text, coalesce(e.title, ''), e."isCanceled", e."isFullDay", e."startsAt", e."endsAt",
			coalesce(e.description, ''), coalesce(e.location, ''), coalesce(e."conferenceSolution", ''),
			coalesce(e."conferenceLinkPrimaryLinkLabel", ''), coalesce(e."conferenceLinkPrimaryLinkUrl", ''), e."conferenceLinkSecondaryLinks"`+from+`
		ORDER BY e."startsAt" DESC NULLS LAST, e.id OFFSET $2 LIMIT $3`, personIDs, (page-1)*pageSize, pageSize)
	if err != nil {
		return CalendarEventsWithTotal{}, fmt.Errorf("select calendar event page: %w", err)
	}
	defer rows.Close()
	for rows.Next() {
		var event CalendarEvent
		var startsAt, endsAt *time.Time
		var secondary []Link
		if err := rows.Scan(&event.ID, &event.Title, &event.IsCanceled, &event.IsFullDay, &startsAt, &endsAt, &event.Description, &event.Location,
			&event.ConferenceSolution, &event.ConferenceLink.PrimaryLinkLabel, &event.ConferenceLink.PrimaryLinkURL, &secondary); err != nil {
			return CalendarEventsWithTotal{}, fmt.Errorf("scan calendar event: %w", err)
		}
		if startsAt != nil {
			event.StartsAt = metadata.Timestamp{Time: *startsAt}
		}
		if endsAt != nil {
			event.EndsAt = metadata.Timestamp{Time: *endsAt}
		}
		event.ConferenceLink.SecondaryLinks = secondary
		event.Participants = []CalendarParticipant{}
		result.TimelineCalendarEvents = append(result.TimelineCalendarEvents, event)
	}
	if err := rows.Err(); err != nil {
		return CalendarEventsWithTotal{}, fmt.Errorf("iterate calendar events: %w", err)
	}
	if len(result.TimelineCalendarEvents) == 0 {
		return result, nil
	}
	ids := make([]string, len(result.TimelineCalendarEvents))
	for i, event := range result.TimelineCalendarEvents {
		ids[i] = event.ID
	}
	participants, err := t.calendarParticipants(ctx, ids)
	if err != nil {
		return CalendarEventsWithTotal{}, err
	}
	visibility, err := t.calendarVisibility(ctx, ids, userWorkspaceID)
	if err != nil {
		return CalendarEventsWithTotal{}, err
	}
	for i := range result.TimelineCalendarEvents {
		event := &result.TimelineCalendarEvents[i]
		event.Participants = append(event.Participants, participants[event.ID]...)
		event.Visibility = visibility[event.ID]
		if event.Visibility == "" {
			event.Visibility = messaging.VisibilityMetadata
		}
	}
	return result, nil
}

func (t *Timeline) calendarParticipants(ctx context.Context, ids []string) (map[string][]CalendarParticipant, error) {
	schema := workspace.SchemaName()
	rows, err := t.pool.Query(ctx, `SELECT p."calendarEventId"::text, p."personId"::text, p."workspaceMemberId"::text,
			coalesce(pe."nameFirstName", wm."nameFirstName", ''), coalesce(pe."nameLastName", wm."nameLastName", ''),
			coalesce(p."displayName", ''), coalesce(pe."avatarUrl", wm."avatarUrl", ''), coalesce(p.handle, '')
		FROM `+schema+`."calendarEventParticipant" p
		LEFT JOIN `+schema+`."person" pe ON pe.id = p."personId" AND pe."deletedAt" IS NULL
		LEFT JOIN `+schema+`."workspaceMember" wm ON wm.id = p."workspaceMemberId" AND wm."deletedAt" IS NULL
		WHERE p."calendarEventId" = ANY($1::uuid[]) AND p."deletedAt" IS NULL ORDER BY p."createdAt", p.id`, ids)
	if err != nil {
		return nil, fmt.Errorf("select calendar participants: %w", err)
	}
	defer rows.Close()
	participants := map[string][]CalendarParticipant{}
	for rows.Next() {
		var eventID string
		var participant CalendarParticipant
		if err := rows.Scan(&eventID, &participant.PersonID, &participant.WorkspaceMemberID, &participant.FirstName, &participant.LastName,
			&participant.DisplayName, &participant.AvatarURL, &participant.Handle); err != nil {
			return nil, fmt.Errorf("scan calendar participant: %w", err)
		}
		participants[eventID] = append(participants[eventID], participant)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("iterate calendar participants: %w", err)
	}
	return participants, nil
}

func (t *Timeline) calendarVisibility(ctx context.Context, ids []string, userWorkspaceID string) (map[string]string, error) {
	schema := workspace.SchemaName()
	rows, err := t.pool.Query(ctx, `SELECT DISTINCT a."calendarEventId"::text,
			CASE WHEN ca."userWorkspaceId" = $3::uuid THEN 'SHARE_EVERYTHING' ELSE cc.visibility::text END
		FROM `+schema+`."calendarChannelEventAssociation" a
		JOIN core."calendarChannel" cc ON cc.id = a."calendarChannelId" AND cc."workspaceId" = $2::uuid
		LEFT JOIN core."connectedAccount" ca ON ca.id = cc."connectedAccountId"
		WHERE a."calendarEventId" = ANY($1::uuid[]) AND a."deletedAt" IS NULL`, ids, workspace.PinnedWorkspaceID, nullIfEmpty(userWorkspaceID))
	if err != nil {
		return nil, fmt.Errorf("select calendar event visibility: %w", err)
	}
	defer rows.Close()
	rank := []string{messaging.VisibilityMetadata, messaging.VisibilityShareEverything}
	visibility := map[string]string{}
	for rows.Next() {
		var event, channel string
		if err := rows.Scan(&event, &channel); err != nil {
			return nil, fmt.Errorf("scan calendar event visibility: %w", err)
		}
		if current, seen := visibility[event]; !seen || slices.Index(rank, channel) > slices.Index(rank, current) {
			visibility[event] = channel
		}
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("iterate calendar event visibility: %w", err)
	}
	return visibility, nil
}

type CreatedEvent struct {
	ExternalID, ICalUID, ConferenceLink string
	Title, Description, Location        string
	StartsAt, EndsAt                    time.Time
	IsFullDay                           bool
	Attendees                           []string
}

func (c *CalendarChannels) RecordCreatedEvent(ctx context.Context, connectedAccountID string, event CreatedEvent) (string, error) {
	var eventID string
	err := pgx.BeginFunc(ctx, c.pool, func(tx pgx.Tx) error {
		var channelID string
		err := tx.QueryRow(ctx, `SELECT id::text FROM core."calendarChannel" WHERE "connectedAccountId" = $1::uuid AND "workspaceId" = $2::uuid
			ORDER BY "createdAt", id LIMIT 1`, connectedAccountID, workspace.PinnedWorkspaceID).Scan(&channelID)
		if errors.Is(err, pgx.ErrNoRows) {
			return nil
		}
		if err != nil {
			return fmt.Errorf("select calendar channel: %w", err)
		}
		err = tx.QueryRow(ctx, `INSERT INTO `+workspaceSchema+`."calendarEvent" ("createdBySource", "updatedBySource", title, "isFullDay", "startsAt", "endsAt",
			description, location, "iCalUid", "conferenceLinkPrimaryLinkLabel", "conferenceLinkPrimaryLinkUrl")
			VALUES ('CALENDAR', 'CALENDAR', $1, $2, $3, $4, $5, $6, $7, $8, $8) RETURNING id::text`,
			event.Title, event.IsFullDay, event.StartsAt, event.EndsAt, event.Description, event.Location, event.ICalUID, event.ConferenceLink).Scan(&eventID)
		if err != nil {
			return fmt.Errorf("insert event: %w", err)
		}
		if _, err := tx.Exec(ctx, `INSERT INTO `+workspaceSchema+`."calendarChannelEventAssociation" ("createdBySource", "updatedBySource",
			"calendarChannelId", "calendarEventId", "eventExternalId") VALUES ('CALENDAR', 'CALENDAR', $1, $2, $3)`, channelID, eventID, event.ExternalID); err != nil {
			return fmt.Errorf("insert association: %w", err)
		}
		for _, handle := range event.Attendees {
			if _, err := tx.Exec(ctx, `INSERT INTO `+workspaceSchema+`."calendarEventParticipant" ("createdBySource", "updatedBySource", handle, "calendarEventId", "personId")
				VALUES ('CALENDAR', 'CALENDAR', $1, $2, (SELECT p.id FROM `+workspaceSchema+`.person p
					WHERE lower(p."emailsPrimaryEmail") = lower($1) AND p."deletedAt" IS NULL ORDER BY p."createdAt", p.id LIMIT 1))`, handle, eventID); err != nil {
				return fmt.Errorf("insert participant: %w", err)
			}
		}
		return nil
	})
	return eventID, err
}
