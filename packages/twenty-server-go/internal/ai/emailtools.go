package ai

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"

	"github.com/twentyhq/twenty/packages/twenty-server-go/internal/auth"
	"github.com/twentyhq/twenty/packages/twenty-server-go/internal/messaging"
)

var errAccountNotOwned = errors.New("connected account is not owned by the caller")

type accountOwnership interface {
	OwnedBy(ctx context.Context, workspaceMemberID, connectedAccountID string) (bool, error)
}

const emailSchema = `{"type":"object","properties":{"connectedAccountId":{"type":"string"},"to":{"type":"array","items":{"type":"string"}},"cc":{"type":"array","items":{"type":"string"}},"bcc":{"type":"array","items":{"type":"string"}},"subject":{"type":"string"},"htmlBody":{"type":"string"},"inReplyTo":{"type":"string"}},"required":["connectedAccountId","to","subject","htmlBody"]}`

// NewEmailTools returns the send-email and draft-email tools; a call is refused
// unless ownership confirms the principal owns the named connected account.
func NewEmailTools(mailer messaging.Mailer, ownership accountOwnership) []Tool {
	return []Tool{
		emailTool("send_email", "Send an email from a connected account the user owns.", "messageId", ownership, mailer.Send),
		emailTool("draft_email", "Save an email draft in a connected account the user owns.", "draftId", ownership, mailer.Draft),
	}
}

type mailerCall func(ctx context.Context, connectedAccountID string, email messaging.OutboundEmail) (string, error)

func emailTool(name, description, idKey string, ownership accountOwnership, deliver mailerCall) Tool {
	return funcTool{
		spec: ToolSpec{Name: name, Description: description, InputSchema: json.RawMessage(emailSchema)},
		call: func(ctx context.Context, principal auth.Principal, input json.RawMessage) (any, error) {
			var args struct {
				ConnectedAccountID string
				To, Cc, Bcc        []string
				Subject            string
				HTMLBody           string
				InReplyTo          string
			}
			if err := decode(input, &args); err != nil {
				return nil, err
			}
			owned, err := ownership.OwnedBy(ctx, principal.WorkspaceMemberID, args.ConnectedAccountID)
			if err != nil {
				return nil, fmt.Errorf("%s: check account owner: %w", name, err)
			}
			if !owned {
				return nil, errAccountNotOwned
			}
			id, err := deliver(ctx, args.ConnectedAccountID, messaging.OutboundEmail{
				To: args.To, Cc: args.Cc, Bcc: args.Bcc,
				Subject: args.Subject, HTMLBody: args.HTMLBody, InReplyTo: args.InReplyTo,
			})
			if errors.Is(err, messaging.ErrAccountAuthFailed) {
				return map[string]string{"error": err.Error()}, nil
			}
			if err != nil {
				return nil, fmt.Errorf("%s: %w", name, err)
			}
			return map[string]string{idKey: id}, nil
		},
	}
}
