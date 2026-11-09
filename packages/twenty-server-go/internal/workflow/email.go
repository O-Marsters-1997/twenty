package workflow

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"

	"github.com/twentyhq/twenty/packages/twenty-server-go/internal/messaging"
)

type emailAction struct {
	actionType ActionType
	resultKey  string
	deliver    func(ctx context.Context, connectedAccountID string, email messaging.OutboundEmail) (string, error)
}

// NewSendEmailAction returns the SEND_EMAIL action; its result is {"messageId": ...}.
func NewSendEmailAction(mailer messaging.Mailer) Action {
	return emailAction{ActionTypeSendEmail, "messageId", mailer.Send}
}

// NewDraftEmailAction returns the DRAFT_EMAIL action; its result is {"draftId": ...}.
func NewDraftEmailAction(mailer messaging.Mailer) Action {
	return emailAction{ActionTypeDraftEmail, "draftId", mailer.Draft}
}

func (a emailAction) Type() ActionType { return a.actionType }

func (a emailAction) Run(ctx context.Context, input StepInput) (StepOutput, error) {
	var settings struct {
		ConnectedAccountID string
		To, Cc, Bcc        []string
		Subject            string
		HTMLBody           string
		InReplyTo          string
	}
	if err := json.Unmarshal(input.Settings, &settings); err != nil {
		return StepOutput{}, fmt.Errorf("decode %s settings: %w", a.actionType, err)
	}
	id, err := a.deliver(ctx, settings.ConnectedAccountID, messaging.OutboundEmail{
		To: settings.To, Cc: settings.Cc, Bcc: settings.Bcc,
		Subject: settings.Subject, HTMLBody: settings.HTMLBody, InReplyTo: settings.InReplyTo,
	})
	if errors.Is(err, messaging.ErrAccountAuthFailed) {
		return StepOutput{Error: err.Error()}, nil
	}
	if err != nil {
		return StepOutput{}, fmt.Errorf("deliver email: %w", err)
	}
	return StepOutput{Result: map[string]string{a.resultKey: id}}, nil
}
