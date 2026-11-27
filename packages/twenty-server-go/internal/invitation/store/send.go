package store

import (
	"context"
	"crypto/rand"
	"encoding/hex"
	"errors"
	"fmt"
	"net/mail"
	"net/url"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/twentyhq/twenty/packages/twenty-server-go/internal/systemmail"
)

const (
	invitationTTL        = 30 * 24 * time.Hour
	invitationRateLimit  = 100
	invitationRateWindow = 24 * time.Hour
)

var (
	ErrRoleNotFound       = errors.New("role not found")
	ErrInvitationNotFound = errors.New("workspace invitation not found")
)

type recipientError string

func (e recipientError) Error() string { return string(e) }

const (
	errInvalidEmail    recipientError = "Invalid email"
	errAlreadyMember   recipientError = "This user is already a member of the workspace"
	errAlreadyInvited  recipientError = "Invitation already sent"
	errInvitationLimit recipientError = "Too many invitations sent, please try again later"
)

type Throttle interface {
	Allow(key string, limit int, window time.Duration) bool
}

type SendResult struct {
	Success     bool
	Errors      []string
	Invitations []Invitation
}

type Inviter struct {
	pool           *pgxpool.Pool
	mailer         systemmail.Sender
	throttle       Throttle
	frontURL       *url.URL
	multiWorkspace bool
	now            func() time.Time
}

func NewInviter(pool *pgxpool.Pool, mailer systemmail.Sender, throttle Throttle, frontURL *url.URL, multiWorkspace bool) *Inviter {
	return &Inviter{pool: pool, mailer: mailer, throttle: throttle, frontURL: frontURL, multiWorkspace: multiWorkspace, now: time.Now}
}

type inviteContext struct {
	workspaceID, workspaceName, inviteHash, subdomain, senderName string
}

func (i *Inviter) Send(ctx context.Context, workspaceID, userID string, roleID *string, emails []string) (SendResult, error) {
	if roleID != nil {
		if err := i.checkRole(ctx, workspaceID, *roleID); err != nil {
			return SendResult{}, err
		}
	}
	invite, err := i.loadContext(ctx, workspaceID, userID)
	if err != nil {
		return SendResult{}, err
	}
	result := SendResult{Errors: []string{}, Invitations: []Invitation{}}
	for _, email := range emails {
		created, err := i.invite(ctx, invite, strings.TrimSpace(email), roleID, "")
		var failure recipientError
		if errors.As(err, &failure) {
			result.Errors = append(result.Errors, failure.Error())
			continue
		}
		if err != nil {
			return SendResult{}, err
		}
		result.Invitations = append(result.Invitations, created)
	}
	result.Success = len(result.Errors) == 0
	return result, nil
}

func (i *Inviter) Resend(ctx context.Context, workspaceID, userID, appTokenID string) (SendResult, error) {
	if _, err := uuid.Parse(appTokenID); err != nil {
		return SendResult{}, ErrInvitationNotFound
	}
	var email string
	var roleID *string
	err := i.pool.QueryRow(ctx,
		`SELECT context->>'email', NULLIF(context->>'roleId', '') FROM core."appToken"
		 WHERE id = $1::uuid AND "workspaceId" = $2::uuid AND `+invitationTypes+` AND "deletedAt" IS NULL`,
		appTokenID, workspaceID).Scan(&email, &roleID)
	if errors.Is(err, pgx.ErrNoRows) {
		return SendResult{}, ErrInvitationNotFound
	}
	if err != nil {
		return SendResult{}, fmt.Errorf("look up invitation: %w", err)
	}
	invite, err := i.loadContext(ctx, workspaceID, userID)
	if err != nil {
		return SendResult{}, err
	}
	created, err := i.invite(ctx, invite, email, roleID, appTokenID)
	var failure recipientError
	if errors.As(err, &failure) {
		return SendResult{Errors: []string{failure.Error()}, Invitations: []Invitation{}}, nil
	}
	if err != nil {
		return SendResult{}, err
	}
	return SendResult{Success: true, Errors: []string{}, Invitations: []Invitation{created}}, nil
}

func (i *Inviter) checkRole(ctx context.Context, workspaceID, roleID string) error {
	if _, err := uuid.Parse(roleID); err != nil {
		return ErrRoleNotFound
	}
	var exists bool
	if err := i.pool.QueryRow(ctx,
		`SELECT EXISTS (SELECT 1 FROM core.role WHERE id = $1::uuid AND "workspaceId" = $2::uuid)`,
		roleID, workspaceID).Scan(&exists); err != nil {
		return fmt.Errorf("look up role: %w", err)
	}
	if !exists {
		return ErrRoleNotFound
	}
	return nil
}

func (i *Inviter) loadContext(ctx context.Context, workspaceID, userID string) (inviteContext, error) {
	invite := inviteContext{workspaceID: workspaceID}
	err := i.pool.QueryRow(ctx,
		`SELECT COALESCE(w."displayName", ''), COALESCE(w."inviteHash", ''), w.subdomain,
		        trim(COALESCE(u."firstName", '') || ' ' || COALESCE(u."lastName", ''))
		 FROM core.workspace w LEFT JOIN core."user" u ON u.id = NULLIF($2, '')::uuid
		 WHERE w.id = $1::uuid AND w."deletedAt" IS NULL`,
		workspaceID, userID).Scan(&invite.workspaceName, &invite.inviteHash, &invite.subdomain, &invite.senderName)
	if err != nil {
		return inviteContext{}, fmt.Errorf("load invitation workspace: %w", err)
	}
	return invite, nil
}

func (i *Inviter) invite(ctx context.Context, invite inviteContext, email string, roleID *string, replacing string) (Invitation, error) {
	if parsed, err := mail.ParseAddress(email); err != nil || parsed.Address != email {
		return Invitation{}, errInvalidEmail
	}
	if replacing == "" {
		if err := i.checkNew(ctx, invite.workspaceID, email); err != nil {
			return Invitation{}, err
		}
	}
	if !i.throttle.Allow("invitations:"+invite.workspaceID, invitationRateLimit, invitationRateWindow) {
		return Invitation{}, errInvitationLimit
	}
	raw := make([]byte, 32)
	if _, err := rand.Read(raw); err != nil {
		return Invitation{}, fmt.Errorf("generate invitation token: %w", err)
	}
	token := hex.EncodeToString(raw)
	created := Invitation{Email: email, RoleID: roleID, ExpiresAt: i.now().Add(invitationTTL)}
	err := pgx.BeginFunc(ctx, i.pool, func(tx pgx.Tx) error {
		if replacing != "" {
			if _, err := tx.Exec(ctx, `DELETE FROM core."appToken" WHERE id = $1::uuid`, replacing); err != nil {
				return fmt.Errorf("delete replaced invitation: %w", err)
			}
		}
		if err := tx.QueryRow(ctx,
			`INSERT INTO core."appToken" ("workspaceId", type, value, "expiresAt", context)
			 VALUES ($1::uuid, 'INVITATION_TOKEN', $2, $3,
			         jsonb_build_object('email', $4::text) || CASE WHEN $5::text IS NULL THEN '{}'::jsonb ELSE jsonb_build_object('roleId', $5::text) END)
			 RETURNING id::text`,
			invite.workspaceID, token, created.ExpiresAt, email, roleID).Scan(&created.ID); err != nil {
			return fmt.Errorf("insert invitation: %w", err)
		}
		return nil
	})
	if err != nil {
		return Invitation{}, err
	}
	message, err := systemmail.InvitationEmail(email, i.inviteLink(invite, token), invite.senderName, invite.workspaceName)
	if err != nil {
		return Invitation{}, err
	}
	if err := i.mailer.Send(ctx, message); err != nil {
		return Invitation{}, fmt.Errorf("send invitation email: %w", err)
	}
	return created, nil
}

func (i *Inviter) checkNew(ctx context.Context, workspaceID, email string) error {
	var member, invited bool
	if err := i.pool.QueryRow(ctx,
		`SELECT EXISTS (SELECT 1 FROM core."userWorkspace" uw JOIN core."user" u ON u.id = uw."userId"
		                WHERE uw."workspaceId" = $1::uuid AND lower(u.email::text) = lower($2) AND uw."deletedAt" IS NULL),
		        EXISTS (SELECT 1 FROM core."appToken" WHERE "workspaceId" = $1::uuid AND `+invitationTypes+`
		                AND "deletedAt" IS NULL AND lower(context->>'email') = lower($2))`,
		workspaceID, email).Scan(&member, &invited); err != nil {
		return fmt.Errorf("check existing invitation: %w", err)
	}
	switch {
	case member:
		return errAlreadyMember
	case invited:
		return errAlreadyInvited
	}
	return nil
}

func (i *Inviter) inviteLink(invite inviteContext, token string) string {
	base := *i.frontURL
	if i.multiWorkspace {
		host := invite.subdomain + "." + base.Hostname()
		if port := base.Port(); port != "" {
			host += ":" + port
		}
		base.Host = host
	}
	link := base.JoinPath("invite", invite.inviteHash)
	link.RawQuery = url.Values{"inviteToken": {token}}.Encode()
	return link.String()
}
