package auth

import (
	"context"
	"errors"
	"fmt"
	"net/mail"

	"github.com/jackc/pgx/v5"

	"github.com/twentyhq/twenty/packages/twenty-server-go/internal/membership"
)

var errSignUpVerificationNotServed = errors.New("sign-up with email verification required is not served by Go yet")

type SignUp struct {
	login   *PasswordLogin
	members *membership.Store
}

func NewSignUp(login *PasswordLogin, members *membership.Store) *SignUp {
	return &SignUp{login: login, members: members}
}

type SignUpInWorkspaceInput struct {
	Email, Password, Locale string
	WorkspaceID             string
	WorkspaceInviteHash     string
	PersonalInviteToken     string
	Origin                  string
}

type SignUpInWorkspaceResult struct {
	LoginToken   SignedToken
	WorkspaceID  string
	SubdomainURL string
}

func userAlreadyExists() error {
	return &LoginError{Code: "BAD_USER_INPUT", SubCode: "USER_ALREADY_EXIST", Message: "User already exists", FriendlyMessage: "User already exists."}
}

func (s *SignUp) createUser(ctx context.Context, email, password, locale string) (loginUser, error) {
	if s.login.config.EmailVerificationRequired {
		return loginUser{}, errSignUpVerificationNotServed
	}
	if _, err := mail.ParseAddress(email); err != nil {
		return loginUser{}, &LoginError{Code: "BAD_USER_INPUT", SubCode: "INVALID_INPUT", Message: "Invalid email", FriendlyMessage: "Invalid email."}
	}
	hash, err := HashNewPassword(s.login.hasher, password)
	if errors.Is(err, ErrPasswordInvalid) {
		return loginUser{}, &LoginError{Code: "BAD_USER_INPUT", SubCode: "PASSWORD_TOO_WEAK", Message: "Password too weak", FriendlyMessage: "Password too weak."}
	}
	if err != nil {
		return loginUser{}, err
	}
	id, err := s.members.CreateUser(ctx, membership.NewUser{Email: email, Locale: locale, PasswordHash: hash})
	if errors.Is(err, membership.ErrEmailTaken) {
		return loginUser{}, userAlreadyExists()
	}
	if err != nil {
		return loginUser{}, err
	}
	return loginUser{id: id, email: email, passwordHash: &hash}, nil
}

func (s *SignUp) WithoutWorkspace(ctx context.Context, email, password, locale string) (SignInResult, error) {
	user, err := s.createUser(ctx, email, password, locale)
	if err != nil {
		return SignInResult{}, err
	}
	return s.login.sessionFor(ctx, user)
}

func (s *SignUp) InWorkspace(ctx context.Context, in SignUpInWorkspaceInput) (SignUpInWorkspaceResult, error) {
	target, err := s.workspaceFor(ctx, in)
	if err != nil {
		return SignUpInWorkspaceResult{}, err
	}
	if err := s.authorize(ctx, target.ID, in); err != nil {
		return SignUpInWorkspaceResult{}, err
	}
	var passwordEnabled bool
	if err := s.login.pool.QueryRow(ctx, `SELECT "isPasswordAuthEnabled" FROM core.workspace WHERE id = $1::uuid`, target.ID).Scan(&passwordEnabled); err != nil {
		return SignUpInWorkspaceResult{}, fmt.Errorf("look up workspace auth settings: %w", err)
	}
	if !passwordEnabled {
		return SignUpInWorkspaceResult{}, forbidden("Email/Password auth is not enabled for this workspace")
	}
	user, err := s.createUser(ctx, in.Email, in.Password, in.Locale)
	if err != nil {
		return SignUpInWorkspaceResult{}, err
	}
	_, err = s.members.AddUserToWorkspace(ctx, user.id, target.ID)
	if errors.Is(err, membership.ErrWorkspaceNotFound) {
		return SignUpInWorkspaceResult{}, workspaceNotFound()
	}
	if err != nil {
		return SignUpInWorkspaceResult{}, err
	}
	if in.PersonalInviteToken != "" {
		if err := s.members.InvalidatePersonalInvitation(ctx, target.ID, in.PersonalInviteToken); err != nil {
			return SignUpInWorkspaceResult{}, err
		}
	}
	token, err := s.login.issuer.IssueLoginToken(ctx, user.id, target.ID, passwordProvider)
	if err != nil {
		return SignUpInWorkspaceResult{}, err
	}
	signed, err := signedToken(token)
	if err != nil {
		return SignUpInWorkspaceResult{}, err
	}
	return SignUpInWorkspaceResult{LoginToken: signed, WorkspaceID: target.ID, SubdomainURL: s.login.workspaceURL(target.Subdomain)}, nil
}

func (s *SignUp) InNewWorkspace() error {
	return forbidden("Workspace creation is not available on this server")
}

func (s *SignUp) workspaceFor(ctx context.Context, in SignUpInWorkspaceInput) (OriginWorkspace, error) {
	if in.WorkspaceID == "" {
		target, err := s.login.origins.ByOriginOrDefault(ctx, in.Origin)
		if errors.Is(err, ErrWorkspaceNotFound) {
			return OriginWorkspace{}, workspaceNotFound()
		}
		return target, err
	}
	var target OriginWorkspace
	err := s.login.pool.QueryRow(ctx,
		`SELECT id::text, subdomain FROM core.workspace WHERE id::text = $1 AND "deletedAt" IS NULL`, in.WorkspaceID,
	).Scan(&target.ID, &target.Subdomain)
	if errors.Is(err, pgx.ErrNoRows) {
		return OriginWorkspace{}, workspaceNotFound()
	}
	if err != nil {
		return OriginWorkspace{}, fmt.Errorf("look up workspace: %w", err)
	}
	return target, nil
}

func (s *SignUp) authorize(ctx context.Context, workspaceID string, in SignUpInWorkspaceInput) error {
	switch {
	case in.PersonalInviteToken != "":
		_, err := s.members.ValidatePersonalInvitation(ctx, workspaceID, in.PersonalInviteToken, in.Email)
		if errors.Is(err, membership.ErrInvitationInvalid) || errors.Is(err, membership.ErrInvitationExpired) {
			return forbidden(err.Error())
		}
		return err
	case in.WorkspaceInviteHash != "":
		var allowed bool
		if err := s.login.pool.QueryRow(ctx,
			`SELECT EXISTS (SELECT 1 FROM core.workspace WHERE id = $1::uuid AND "inviteHash" = $2 AND "isPublicInviteLinkEnabled")`,
			workspaceID, in.WorkspaceInviteHash,
		).Scan(&allowed); err != nil {
			return fmt.Errorf("look up invite hash: %w", err)
		}
		if !allowed {
			return forbidden("Invalid invite hash")
		}
		return nil
	}
	return forbidden("An invitation is required to join this workspace")
}
