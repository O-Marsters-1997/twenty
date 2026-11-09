package messaginggql

import (
	"context"
	"errors"
	"fmt"
	"log/slog"
	"regexp"
	"strings"
	"time"

	"github.com/twentyhq/twenty/packages/twenty-server-go/internal/auth"
	"github.com/twentyhq/twenty/packages/twenty-server-go/internal/messaging"
	"github.com/twentyhq/twenty/packages/twenty-server-go/internal/messaging/store"
)

type Resolver struct {
	Channels *store.Channels
	Mailer   Mailer
	Sent     SentMessages
	Logger   *slog.Logger
}

func caller(ctx context.Context) (string, error) {
	principal, ok := auth.PrincipalFrom(ctx)
	if !ok || principal.UserWorkspaceID == "" {
		return "", fmt.Errorf("%w: a workspace member session is required", store.ErrForbidden)
	}
	return principal.UserWorkspaceID, nil
}

func pointer[TRecord any](record TRecord, err error) (*TRecord, error) {
	if err != nil {
		return nil, err
	}
	return &record, nil
}

func pointers[TRecord any](records []TRecord, err error) ([]*TRecord, error) {
	if err != nil {
		return nil, err
	}
	listed := make([]*TRecord, len(records))
	for i := range records {
		listed[i] = &records[i]
	}
	return listed, nil
}

func (r *messageChannelResolver) ConnectedAccount(ctx context.Context, channel *store.MessageChannel) (*store.Account, error) {
	principal, _ := auth.PrincipalFrom(ctx)
	return r.Channels.MessageChannelAccount(ctx, *channel, principal.UserWorkspaceID)
}

func (r *mutationResolver) DeleteConnectedAccount(ctx context.Context, id string) (*store.Account, error) {
	userWorkspaceID, err := caller(ctx)
	if err != nil {
		return nil, err
	}
	return pointer(r.Channels.DeleteAccount(ctx, id, userWorkspaceID))
}

func (r *mutationResolver) DisconnectConnectedAccount(ctx context.Context, id string) (*store.Account, error) {
	userWorkspaceID, err := caller(ctx)
	if err != nil {
		return nil, err
	}
	return pointer(r.Channels.DisconnectAccount(ctx, id, userWorkspaceID))
}

func (r *mutationResolver) UpdateMessageChannel(ctx context.Context, input map[string]any) (*store.MessageChannel, error) {
	userWorkspaceID, err := caller(ctx)
	if err != nil {
		return nil, err
	}
	id, update := idAndUpdate(input)
	return pointer(r.Channels.UpdateMessageChannel(ctx, id, userWorkspaceID, update))
}

func (r *mutationResolver) CreateEmailGroupChannel(ctx context.Context, input map[string]any) (*store.EmailGroupChannel, error) {
	userWorkspaceID, err := caller(ctx)
	if err != nil {
		return nil, err
	}
	input = withoutPointers(input)
	handle, _ := input["handle"].(string)
	var displayName *string
	if text, ok := input["displayName"].(string); ok {
		displayName = &text
	}
	return pointer(r.Channels.CreateEmailGroupChannel(ctx, userWorkspaceID, handle, displayName))
}

func (r *mutationResolver) UpdateEmailGroupChannel(ctx context.Context, input map[string]any) (*store.MessageChannel, error) {
	userWorkspaceID, err := caller(ctx)
	if err != nil {
		return nil, err
	}
	input = withoutPointers(input)
	id, _ := input["id"].(string)
	return pointer(r.Channels.UpdateEmailGroupChannel(ctx, id, userWorkspaceID, input))
}

func (r *mutationResolver) DeleteEmailGroupChannel(ctx context.Context, id string) (*store.MessageChannel, error) {
	userWorkspaceID, err := caller(ctx)
	if err != nil {
		return nil, err
	}
	return pointer(r.Channels.DeleteEmailGroupChannel(ctx, id, userWorkspaceID))
}

func (r *mutationResolver) UpdateCalendarChannel(ctx context.Context, input map[string]any) (*store.CalendarChannel, error) {
	userWorkspaceID, err := caller(ctx)
	if err != nil {
		return nil, err
	}
	id, update := idAndUpdate(input)
	return pointer(r.Channels.UpdateCalendarChannel(ctx, id, userWorkspaceID, update))
}

func (r *queryResolver) MyConnectedAccounts(ctx context.Context) ([]*store.Account, error) {
	userWorkspaceID, err := caller(ctx)
	if err != nil {
		return nil, err
	}
	return pointers(r.Channels.Accounts(ctx, userWorkspaceID))
}

func (r *queryResolver) ApplicationConnectedAccounts(ctx context.Context, applicationID string) ([]*store.ApplicationAccount, error) {
	userWorkspaceID, err := caller(ctx)
	if err != nil {
		return nil, err
	}
	return pointers(r.Channels.ApplicationAccounts(ctx, applicationID, userWorkspaceID))
}

func (r *queryResolver) MyMessageChannels(ctx context.Context, connectedAccountID *string) ([]*store.MessageChannel, error) {
	userWorkspaceID, err := caller(ctx)
	if err != nil {
		return nil, err
	}
	return pointers(r.Channels.MessageChannels(ctx, userWorkspaceID, connectedAccountID))
}

func (r *queryResolver) MyCalendarChannels(ctx context.Context, connectedAccountID *string) ([]*store.CalendarChannel, error) {
	userWorkspaceID, err := caller(ctx)
	if err != nil {
		return nil, err
	}
	return pointers(r.Channels.CalendarChannels(ctx, userWorkspaceID, connectedAccountID))
}

func idAndUpdate(input map[string]any) (string, map[string]any) {
	input = withoutPointers(input)
	id, _ := input["id"].(string)
	update, _ := input["update"].(map[string]any)
	return id, update
}

func withoutPointers(input map[string]any) map[string]any {
	plain := make(map[string]any, len(input))
	for key, value := range input {
		switch typed := value.(type) {
		case *string:
			if typed != nil {
				plain[key] = *typed
			} else {
				plain[key] = nil
			}
		case *bool:
			if typed != nil {
				plain[key] = *typed
			} else {
				plain[key] = nil
			}
		case map[string]any:
			plain[key] = withoutPointers(typed)
		default:
			plain[key] = value
		}
	}
	return plain
}

func (r *Resolver) MessageChannel() MessageChannelResolver { return &messageChannelResolver{r} }

func (r *Resolver) Mutation() MutationResolver { return &mutationResolver{r} }

func (r *Resolver) Query() QueryResolver { return &queryResolver{r} }

type (
	messageChannelResolver struct{ *Resolver }
	mutationResolver       struct{ *Resolver }
	queryResolver          struct{ *Resolver }
)
type SentMessages interface {
	OwnedHandle(ctx context.Context, userWorkspaceID, accountID string) (handle, channelID string, err error)
	FindDraft(ctx context.Context, accountID, draftMessageID string) (store.Draft, error)
	Persist(ctx context.Context, sent store.SentMessage) (threadID string, err error)
}

type Mailer interface {
	messaging.Mailer
	messaging.DraftSender
}

var (
	htmlTag          = regexp.MustCompile(`<[^>]*>`)
	errForeignSender = errors.New("you cannot send from this address")
	errAttachments   = errors.New("attachments are not supported")
)

func (r *mutationResolver) SendEmail(ctx context.Context, input SendEmailInput) (*SendEmailOutput, error) {
	principal, ok := auth.PrincipalFrom(ctx)
	if !ok {
		return nil, auth.ErrUnauthenticated
	}
	handle, channelID, err := r.Sent.OwnedHandle(ctx, principal.UserWorkspaceID, input.ConnectedAccountID)
	if err != nil {
		return nil, err
	}
	threadID, err := r.send(ctx, input, handle, channelID)
	if err != nil {
		r.Logger.Warn("send email", "err", err)
		message := "Failed to send email"
		for _, known := range []error{messaging.ErrAccountAuthFailed, errForeignSender, errAttachments, store.ErrDraftNotFound} {
			if errors.Is(err, known) {
				message = known.Error()
			}
		}
		return &SendEmailOutput{Error: &message}, nil
	}
	return &SendEmailOutput{Success: true, MessageThreadID: threadID}, nil
}

func (r *mutationResolver) send(ctx context.Context, input SendEmailInput, handle, channelID string) (*string, error) {
	if input.FromHandle != nil && !strings.EqualFold(strings.TrimSpace(*input.FromHandle), handle) {
		return nil, errForeignSender
	}
	if len(input.Files) > 0 {
		return nil, errAttachments
	}
	email := messaging.OutboundEmail{
		To: splitAddresses(input.To), Cc: splitAddresses(deref(input.Cc)), Bcc: splitAddresses(deref(input.Bcc)),
		Subject: input.Subject, HTMLBody: input.Body, InReplyTo: deref(input.InReplyTo),
	}

	draftMessageID := deref(input.DraftMessageID)
	var messageID string
	var err error
	if draftMessageID == "" {
		messageID, err = r.Mailer.Send(ctx, input.ConnectedAccountID, email)
	} else {
		var draft store.Draft
		if draft, err = r.Sent.FindDraft(ctx, input.ConnectedAccountID, draftMessageID); err != nil {
			return nil, err
		}
		messageID, err = r.Mailer.SendDraft(ctx, input.ConnectedAccountID, draft.ExternalID, email)
	}
	if err != nil {
		return nil, err
	}
	if channelID == "" {
		return nil, nil
	}

	threadID, err := r.Sent.Persist(ctx, store.SentMessage{
		ChannelID: channelID, ExternalID: messageID, InReplyTo: email.InReplyTo,
		Subject: email.Subject, Text: htmlTag.ReplaceAllString(email.HTMLBody, ""),
		From: handle, To: email.To, Cc: email.Cc, Bcc: email.Bcc,
		ReceivedAt: time.Now(), ReplacesMessageID: draftMessageID,
	})
	if err != nil {
		r.Logger.Warn("persist sent message; sync will recover", "err", err)
		return nil, nil
	}
	if draftMessageID == "" {
		return nil, nil
	}
	return &threadID, nil
}

func splitAddresses(list string) []string {
	var addresses []string
	for address := range strings.SplitSeq(list, ",") {
		if address = strings.TrimSpace(address); address != "" {
			addresses = append(addresses, address)
		}
	}
	return addresses
}

func deref(value *string) string {
	if value == nil {
		return ""
	}
	return *value
}
