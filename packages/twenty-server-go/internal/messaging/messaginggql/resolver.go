package messaginggql

import (
	"context"
	"errors"
	"log/slog"
	"regexp"
	"strings"
	"time"

	"github.com/twentyhq/twenty/packages/twenty-server-go/internal/auth"
	"github.com/twentyhq/twenty/packages/twenty-server-go/internal/messaging"
	"github.com/twentyhq/twenty/packages/twenty-server-go/internal/messaging/store"
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

type Resolver struct {
	Mailer Mailer
	Sent   SentMessages
	Logger *slog.Logger
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

func (r *Resolver) Mutation() MutationResolver { return &mutationResolver{r} }

type mutationResolver struct{ *Resolver }
