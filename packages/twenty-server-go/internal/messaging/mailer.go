package messaging

import (
	"context"
	"errors"
	"time"
)

type ConnectedAccount struct {
	ID, Handle, AccessToken, RefreshToken string
	Scopes                                []string
	AuthFailedAt                          *time.Time
}

type OutboundEmail struct {
	To, Cc, Bcc []string
	Subject     string
	HTMLBody    string
	InReplyTo   string
}

// Mailer sends and drafts through the Gmail API, refreshing the account's access token when it has expired.
type Mailer interface {
	Send(ctx context.Context, connectedAccountID string, email OutboundEmail) (messageID string, err error)
	Draft(ctx context.Context, connectedAccountID string, email OutboundEmail) (draftID string, err error)
}

type DraftSender interface {
	SendDraft(ctx context.Context, connectedAccountID, draftID string, email OutboundEmail) (messageID string, err error)
}

var ErrAccountAuthFailed = errors.New("connected account needs reconnecting")

// Accounts is the persistence the Gmail mailer needs for connected accounts.
type Accounts interface {
	Get(ctx context.Context, id string) (ConnectedAccount, error)
	SaveAccessToken(ctx context.Context, id, accessToken string) error
	MarkAuthFailed(ctx context.Context, id string) error
}
