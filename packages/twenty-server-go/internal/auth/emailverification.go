package auth

import (
	"context"
	"errors"
	"fmt"
	"net/mail"
	"net/url"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/twentyhq/twenty/packages/twenty-server-go/internal/systemmail"
)

const EmailVerificationTTL = 24 * time.Hour

type EmailVerification struct {
	pool   *pgxpool.Pool
	login  *PasswordLogin
	sender systemmail.Sender
	now    func() time.Time
}

func NewEmailVerification(pool *pgxpool.Pool, login *PasswordLogin, sender systemmail.Sender) *EmailVerification {
	return &EmailVerification{pool: pool, login: login, sender: sender, now: time.Now}
}

type VerifiedLogin struct {
	LoginToken   SignedToken
	SubdomainURL string
}

func (e *EmailVerification) Resend(ctx context.Context, email, origin string) error {
	if !e.login.config.EmailVerificationRequired {
		return forbidden("Email verification token cannot be sent because email verification is not required")
	}
	workspace, err := e.workspaceByOrigin(ctx, origin)
	if err != nil {
		return err
	}
	user, err := e.login.findUser(ctx, email)
	if err != nil {
		return err
	}
	if user.verified {
		return badInput("Email already verified")
	}
	return e.sendLink(ctx, user.id, user.email, workspace.Subdomain, "", false)
}

func (e *EmailVerification) VerifyForLoginToken(ctx context.Context, token, email, origin string) (VerifiedLogin, error) {
	workspace, err := e.workspaceByOrigin(ctx, origin)
	if err != nil {
		return VerifiedLogin{}, err
	}
	user, err := e.consume(ctx, token, email)
	if err != nil {
		return VerifiedLogin{}, err
	}
	login, err := e.login.issuer.IssueLoginToken(ctx, user.id, workspace.ID, passwordProvider)
	if err != nil {
		return VerifiedLogin{}, err
	}
	signed, err := signedToken(login)
	if err != nil {
		return VerifiedLogin{}, err
	}
	return VerifiedLogin{LoginToken: signed, SubdomainURL: e.login.workspaceURL(workspace.Subdomain)}, nil
}

func (e *EmailVerification) VerifyForWorkspaceAgnosticToken(ctx context.Context, token, email string) (SignInResult, error) {
	user, err := e.consume(ctx, token, email)
	if err != nil {
		return SignInResult{}, err
	}
	return e.login.workspaceAgnosticResult(ctx, user)
}

func (e *EmailVerification) UpdateEmail(ctx context.Context, principal Principal, newEmail, redirectPath string) error {
	if principal.UserID == "" || principal.WorkspaceID == "" {
		return ErrUnauthenticated
	}
	address, err := mail.ParseAddress(newEmail)
	if err != nil || address.Address != newEmail {
		return badInput("Invalid email")
	}
	var taken bool
	if err := e.pool.QueryRow(ctx,
		`SELECT EXISTS (SELECT 1 FROM core."user" WHERE lower(email::text) = lower($1) AND id <> $2::uuid AND "deletedAt" IS NULL)`,
		newEmail, principal.UserID).Scan(&taken); err != nil {
		return fmt.Errorf("look up email: %w", err)
	}
	if taken {
		return badInput("Email already in use")
	}
	if !e.login.config.EmailVerificationRequired {
		if _, err := e.pool.Exec(ctx, `UPDATE core."user" SET email = $2 WHERE id = $1::uuid`, principal.UserID, newEmail); err != nil {
			return fmt.Errorf("update email: %w", err)
		}
		return nil
	}
	var subdomain string
	if err := e.pool.QueryRow(ctx, `SELECT subdomain FROM core.workspace WHERE id = $1::uuid AND "deletedAt" IS NULL`, principal.WorkspaceID).Scan(&subdomain); err != nil {
		return fmt.Errorf("look up workspace: %w", err)
	}
	return e.sendLink(ctx, principal.UserID, newEmail, subdomain, redirectPath, true)
}

func (e *EmailVerification) workspaceByOrigin(ctx context.Context, origin string) (OriginWorkspace, error) {
	workspace, err := e.login.origins.ByOriginOrDefault(ctx, origin)
	if errors.Is(err, ErrWorkspaceNotFound) {
		return OriginWorkspace{}, workspaceNotFound()
	}
	if err != nil {
		return OriginWorkspace{}, fmt.Errorf("resolve workspace: %w", err)
	}
	return workspace, nil
}

func (e *EmailVerification) sendLink(ctx context.Context, userID, email, subdomain, redirectPath string, isEmailUpdate bool) error {
	token, err := IssueAppToken(e.now(), EmailVerificationTTL)
	if err != nil {
		return err
	}
	err = pgx.BeginFunc(ctx, e.pool, func(tx pgx.Tx) error {
		if _, err := tx.Exec(ctx, `DELETE FROM core."appToken" WHERE "userId" = $1::uuid AND type = $2`, userID, AppTokenEmailVerification); err != nil {
			return err
		}
		_, err := tx.Exec(ctx,
			`INSERT INTO core."appToken" ("userId", type, value, "expiresAt", context) VALUES ($1::uuid, $2, $3, $4, jsonb_build_object('email', $5::text))`,
			userID, AppTokenEmailVerification, token.Hash, token.ExpiresAt, email)
		return err
	})
	if err != nil {
		return fmt.Errorf("store verification token: %w", err)
	}
	link, err := url.Parse(e.login.workspaceURL(subdomain))
	if err != nil {
		return fmt.Errorf("build verification link: %w", err)
	}
	link = link.JoinPath("verify-email")
	query := url.Values{"emailVerificationToken": {token.Plain}, "email": {email}}
	if redirectPath != "" {
		query.Set("nextPath", redirectPath)
	}
	link.RawQuery = query.Encode()
	message, err := systemmail.VerificationEmail(email, link.String(), isEmailUpdate)
	if err != nil {
		return err
	}
	if err := e.sender.Send(ctx, message); err != nil {
		return fmt.Errorf("send verification link: %w", err)
	}
	return nil
}

func (e *EmailVerification) consume(ctx context.Context, plain, email string) (loginUser, error) {
	var (
		tokenID string
		stored  StoredAppToken
		user    loginUser
	)
	err := e.pool.QueryRow(ctx,
		`SELECT t.id::text, t."expiresAt", COALESCE(t.context->>'email', ''), u.id::text
		 FROM core."appToken" t JOIN core."user" u ON u.id = t."userId"
		 WHERE t.value = $1 AND t.type = $2 AND t."deletedAt" IS NULL AND u."deletedAt" IS NULL`,
		HashAppToken(plain), AppTokenEmailVerification,
	).Scan(&tokenID, &stored.ExpiresAt, &stored.Email, &user.id)
	if errors.Is(err, pgx.ErrNoRows) {
		return loginUser{}, verificationFailure(ErrTokenInvalid)
	}
	if err != nil {
		return loginUser{}, fmt.Errorf("look up verification token: %w", err)
	}
	if err := ValidateEmailVerification(stored, email, e.now()); err != nil {
		return loginUser{}, verificationFailure(err)
	}
	err = pgx.BeginFunc(ctx, e.pool, func(tx pgx.Tx) error {
		deleted, err := tx.Exec(ctx, `DELETE FROM core."appToken" WHERE id = $1::uuid`, tokenID)
		if err != nil {
			return err
		}
		if deleted.RowsAffected() == 0 {
			return verificationFailure(ErrTokenInvalid)
		}
		var taken bool
		if err := tx.QueryRow(ctx,
			`SELECT EXISTS (SELECT 1 FROM core."user" WHERE lower(email::text) = lower($2) AND id <> $1::uuid AND "deletedAt" IS NULL)`,
			user.id, stored.Email).Scan(&taken); err != nil {
			return err
		}
		if taken {
			return badInput("Email already in use")
		}
		_, err = tx.Exec(ctx, `UPDATE core."user" SET email = $2, "isEmailVerified" = true WHERE id = $1::uuid`, user.id, stored.Email)
		return err
	})
	var loginErr *LoginError
	if errors.As(err, &loginErr) {
		return loginUser{}, err
	}
	if err != nil {
		return loginUser{}, fmt.Errorf("verify email: %w", err)
	}
	user.email = stored.Email
	user.verified = true
	return user, nil
}

func verificationFailure(err error) error {
	messages := map[error]string{
		ErrTokenInvalid:  "Invalid email verification token",
		ErrTokenExpired:  "Email verification token expired",
		ErrEmailMissing:  "Email missing from verification token",
		ErrEmailMismatch: "Email does not match verification token",
	}
	message, known := messages[err]
	if !known {
		return err
	}
	return &LoginError{Code: "FORBIDDEN", SubCode: "FORBIDDEN_EXCEPTION", Message: message, FriendlyMessage: message + "."}
}
