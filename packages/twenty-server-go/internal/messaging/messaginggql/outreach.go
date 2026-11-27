package messaginggql

import (
	"context"
	"errors"
	"fmt"
	"log/slog"
	"strings"
	"time"

	"github.com/twentyhq/twenty/packages/twenty-server-go/internal/auth"
	"github.com/twentyhq/twenty/packages/twenty-server-go/internal/messaging"
	"github.com/twentyhq/twenty/packages/twenty-server-go/internal/messaging/store"
)

func (r *queryResolver) MyMessageFolders(ctx context.Context, messageChannelID *string) ([]*store.MessageFolder, error) {
	userWorkspaceID, err := caller(ctx)
	if err != nil {
		return nil, err
	}
	return pointers(r.Outreach.MessageFolders(ctx, userWorkspaceID, messageChannelID))
}

func (r *mutationResolver) UpdateMessageFolders(ctx context.Context, input map[string]any) ([]*store.MessageFolder, error) {
	userWorkspaceID, err := caller(ctx)
	if err != nil {
		return nil, err
	}
	ids, _ := input["ids"].([]string)
	update, _ := withoutPointers(input)["update"].(map[string]any)
	isSynced, _ := update["isSynced"].(bool)
	return pointers(r.Outreach.UpdateMessageFolders(ctx, userWorkspaceID, ids, isSynced))
}

func (r *mutationResolver) StartChannelSync(ctx context.Context, connectedAccountID string) (*ChannelSyncSuccess, error) {
	userWorkspaceID, err := caller(ctx)
	if err != nil {
		return nil, err
	}
	channelIDs, err := r.Outreach.StartChannelSync(ctx, userWorkspaceID, connectedAccountID)
	if err != nil {
		return nil, err
	}
	for _, channelID := range channelIDs {
		if err := r.Queue(ctx, messaging.SyncMessageChannelArgs{ChannelID: channelID}); err != nil {
			return nil, fmt.Errorf("enqueue message channel sync: %w", err)
		}
	}
	return &ChannelSyncSuccess{Success: true}, nil
}

func (r *queryResolver) MessageSuppressions(ctx context.Context, input map[string]any) (*store.MessageSuppressionList, error) {
	if _, err := caller(ctx); err != nil {
		return nil, err
	}
	input = withoutPointers(input)
	filter := store.SuppressionFilter{
		Reason: text(input, "reason"), SearchTerm: text(input, "searchTerm"), UnsubscribeTopicID: text(input, "unsubscribeTopicId"),
	}
	filter.Limit, _ = input["limit"].(int)
	filter.Offset, _ = input["offset"].(int)
	return pointer(r.Outreach.MessageSuppressions(ctx, filter))
}

func (r *queryResolver) UnsubscribeTopics(ctx context.Context) ([]*store.UnsubscribeTopic, error) {
	if _, err := caller(ctx); err != nil {
		return nil, err
	}
	return pointers(r.Outreach.UnsubscribeTopics(ctx))
}

func (r *mutationResolver) CreateUnsubscribeTopic(ctx context.Context, input map[string]any) (*store.UnsubscribeTopic, error) {
	if _, err := caller(ctx); err != nil {
		return nil, err
	}
	input = withoutPointers(input)
	var description *string
	if value, ok := input["description"].(string); ok {
		description = &value
	}
	return pointer(r.Outreach.CreateUnsubscribeTopic(ctx, text(input, "name"), description, text(input, "visibility")))
}

func (r *mutationResolver) UpdateUnsubscribeTopic(ctx context.Context, input map[string]any) (*store.UnsubscribeTopic, error) {
	if _, err := caller(ctx); err != nil {
		return nil, err
	}
	input = withoutPointers(input)
	return pointer(r.Outreach.UpdateUnsubscribeTopic(ctx, text(input, "id"), input))
}

func (r *mutationResolver) DeleteUnsubscribeTopic(ctx context.Context, id string) (bool, error) {
	if _, err := caller(ctx); err != nil {
		return false, err
	}
	if err := r.Outreach.DeleteUnsubscribeTopic(ctx, id); err != nil {
		return false, err
	}
	return true, nil
}

func (r *mutationResolver) DuplicateMessageList(ctx context.Context, id string) (*store.DuplicatedMessageList, error) {
	if _, err := caller(ctx); err != nil {
		return nil, err
	}
	return pointer(r.Outreach.DuplicateMessageList(ctx, id))
}

func (r *queryResolver) GetTimelineCalendarEventsFromObjectRecord(ctx context.Context, objectNameSingular string, recordID string, page int, pageSize int) (*store.CalendarEventsWithTotal, error) {
	principal, ok := auth.PrincipalFrom(ctx)
	if !ok {
		return nil, auth.ErrUnauthenticated
	}
	if principal.WorkspaceMemberID == "" {
		return nil, errNoWorkspaceMember
	}
	return pointer(r.Timeline.CalendarEventsForRecord(ctx, principal.UserWorkspaceID, objectNameSingular, recordID, page, pageSize))
}

func (r *mutationResolver) CreateCalendarEvent(ctx context.Context, input map[string]any) (*CreateCalendarEventOutput, error) {
	userWorkspaceID, err := caller(ctx)
	if err != nil {
		return nil, err
	}
	input = withoutPointers(input)
	accountID := text(input, "connectedAccountId")
	if err := r.Channels.UsableAccount(ctx, accountID, userWorkspaceID); err != nil {
		return nil, err
	}
	startsAt, endsAt := text(input, "startsAt"), text(input, "endsAt")
	isFullDay, _ := input["isFullDay"].(bool)
	storedStart, startErr := parseEventTime(startsAt, isFullDay)
	storedEnd, endErr := parseEventTime(endsAt, isFullDay)
	if err := errors.Join(startErr, endErr); err != nil {
		return nil, fmt.Errorf("%w: %w", store.ErrInvalidInput, err)
	}
	event := messaging.NewCalendarEvent{
		Title: strings.TrimSpace(text(input, "title")), Description: text(input, "description"), Location: text(input, "location"),
		StartsAt: startsAt, EndsAt: endsAt, TimeZone: text(input, "timeZone"), IsFullDay: isFullDay,
		Attendees: splitAddresses(text(input, "attendees")),
	}
	event.SendInvitations, _ = input["sendInvitations"].(bool)
	event.AddConferencing, _ = input["addConferencing"].(bool)

	if r.Calendar == nil {
		return failedCalendarEvent(r.Logger, errCalendarNotConfigured), nil
	}
	created, err := r.Calendar.CreateEvent(ctx, accountID, event)
	if err != nil {
		return failedCalendarEvent(r.Logger, err), nil
	}
	output := &CreateCalendarEventOutput{Success: true, ICalUID: nonEmpty(created.ICalUID), ConferenceLink: nonEmpty(created.ConferenceLink)}
	storedID, err := r.CalendarChannels.RecordCreatedEvent(ctx, accountID, store.CreatedEvent{
		ExternalID: created.ExternalID, ICalUID: created.ICalUID, ConferenceLink: created.ConferenceLink,
		Title: event.Title, Description: event.Description, Location: event.Location,
		StartsAt: storedStart, EndsAt: storedEnd, IsFullDay: isFullDay, Attendees: event.Attendees,
	})
	if err != nil {
		r.Logger.Error("record created calendar event", "err", err)
		return output, nil
	}
	output.CalendarEventID = nonEmpty(storedID)
	return output, nil
}

var errCalendarNotConfigured = errors.New("calendar event creation is not configured")

func failedCalendarEvent(logger *slog.Logger, err error) *CreateCalendarEventOutput {
	message := "Failed to create calendar event"
	switch {
	case errors.Is(err, messaging.ErrMissingCalendarScope):
		message = "The connected account needs to be reconnected with calendar access"
	case errors.Is(err, messaging.ErrAccountAuthFailed):
		message = "The connected account needs to be reconnected"
	default:
		logger.Error("create calendar event", "err", err)
	}
	return &CreateCalendarEventOutput{Success: false, Error: &message}
}

func text(input map[string]any, key string) string {
	value, _ := input[key].(string)
	return value
}

func nonEmpty(value string) *string {
	if value == "" {
		return nil
	}
	return &value
}

func parseEventTime(value string, isFullDay bool) (time.Time, error) {
	if isFullDay && len(value) >= len(time.DateOnly) {
		value = value[:len(time.DateOnly)]
		return time.Parse(time.DateOnly, value)
	}
	return time.Parse(time.RFC3339, value)
}
