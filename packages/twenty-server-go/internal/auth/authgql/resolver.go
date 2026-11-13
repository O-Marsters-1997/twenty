package authgql

import (
	"context"
	"errors"

	"github.com/twentyhq/twenty/packages/twenty-server-go/internal/auth"
	"github.com/twentyhq/twenty/packages/twenty-server-go/internal/metadata"
)

type Resolver struct {
	TwoFactor     *auth.TwoFactor
	PasswordLogin *auth.PasswordLogin
	Sessions      *auth.UserSession
}

func (r *mutationResolver) GetLoginTokenFromCredentials(ctx context.Context, email string, password string, captchaToken *string, locale *string, verifyEmailRedirectPath *string, origin string) (*LoginToken, error) {
	token, err := r.PasswordLogin.LoginTokenFromCredentials(ctx, email, password, origin)
	if err != nil {
		return nil, err
	}
	return &LoginToken{LoginToken: authTokenFrom(token)}, nil
}

func (r *mutationResolver) SignIn(ctx context.Context, email string, password string, captchaToken *string, locale *string, verifyEmailRedirectPath *string) (*AvailableWorkspacesAndAccessTokens, error) {
	exchange, ok := httpExchangeFrom(ctx)
	if !ok {
		return nil, errors.New("sign in: no http exchange on the request context")
	}
	result, err := r.PasswordLogin.SignIn(ctx, email, password)
	if err != nil {
		return nil, err
	}
	if err := r.Sessions.IssueForTokenPair(ctx, exchange.w, exchange.r, result.Pair, auth.SessionOriginSignIn); err != nil {
		return nil, err
	}
	return &AvailableWorkspacesAndAccessTokens{
		Tokens: &AuthTokenPair{
			AccessOrWorkspaceAgnosticToken: authTokenFrom(result.Access),
			RefreshToken:                   authTokenFrom(result.Refresh),
		},
		AvailableWorkspaces: &AvailableWorkspaces{
			AvailableWorkspacesForSignIn: availableWorkspacesFrom(result.ForSignIn),
			AvailableWorkspacesForSignUp: availableWorkspacesFrom(result.ForSignUp),
		},
	}, nil
}

func authTokenFrom(token auth.SignedToken) *AuthToken {
	return &AuthToken{Token: token.Token, ExpiresAt: metadata.Timestamp{Time: token.ExpiresAt}}
}

func availableWorkspacesFrom(workspaces []auth.AvailableWorkspace) []*AvailableWorkspace {
	converted := make([]*AvailableWorkspace, 0, len(workspaces))
	for _, workspace := range workspaces {
		logo := workspace.Logo
		converted = append(converted, &AvailableWorkspace{
			ID:                  workspace.ID,
			DisplayName:         workspace.DisplayName,
			LoginToken:          workspace.LoginToken,
			PersonalInviteToken: workspace.PersonalInviteToken,
			WorkspaceUrls:       &WorkspaceUrls{SubdomainURL: workspace.SubdomainURL},
			Logo:                &logo,
		})
	}
	return converted
}

func (r *mutationResolver) InitiateOTPProvisioningForAuthenticatedUser(ctx context.Context) (*InitiateTwoFactorAuthenticationProvisioning, error) {
	principal, err := principalFrom(ctx)
	if err != nil {
		return nil, err
	}
	uri, err := r.TwoFactor.InitiateProvisioning(ctx, principal)
	if err != nil {
		return nil, err
	}
	return &InitiateTwoFactorAuthenticationProvisioning{URI: uri}, nil
}

func (r *mutationResolver) VerifyTwoFactorAuthenticationMethodForAuthenticatedUser(ctx context.Context, otp string) (*VerifyTwoFactorAuthenticationMethod, error) {
	principal, err := principalFrom(ctx)
	if err != nil {
		return nil, err
	}
	if err := r.TwoFactor.VerifyOTP(ctx, principal, otp); err != nil {
		return nil, err
	}
	return &VerifyTwoFactorAuthenticationMethod{Success: true}, nil
}

func (r *mutationResolver) DeleteTwoFactorAuthenticationMethod(ctx context.Context, twoFactorAuthenticationMethodID string) (*DeleteTwoFactorAuthenticationMethod, error) {
	principal, err := principalFrom(ctx)
	if err != nil {
		return nil, err
	}
	if err := r.TwoFactor.DeleteMethod(ctx, principal, twoFactorAuthenticationMethodID); err != nil {
		return nil, err
	}
	return &DeleteTwoFactorAuthenticationMethod{Success: true}, nil
}

func (r *mutationResolver) GenerateTwoFactorAuthenticationRecoveryCode(ctx context.Context, userID string, otp *string) (*TwoFactorAuthenticationRecoveryCode, error) {
	principal, err := principalFrom(ctx)
	if err != nil {
		return nil, err
	}
	var code string
	if otp != nil {
		code = *otp
	}
	recovery, err := r.TwoFactor.GenerateRecoveryCode(ctx, principal, userID, code)
	if err != nil {
		return nil, err
	}
	return &TwoFactorAuthenticationRecoveryCode{RecoveryCode: recovery.Code, ExpiresAt: metadata.Timestamp{Time: recovery.ExpiresAt}}, nil
}

func (r *mutationResolver) RevokeTwoFactorAuthenticationRecoveryCode(ctx context.Context, userID string) (bool, error) {
	principal, err := principalFrom(ctx)
	if err != nil {
		return false, err
	}
	return r.TwoFactor.RevokeRecoveryCode(ctx, principal, userID)
}

func (r *queryResolver) TwoFactorAuthenticationRecoveryStatus(ctx context.Context, userID string) (*TwoFactorAuthenticationRecoveryStatus, error) {
	principal, err := principalFrom(ctx)
	if err != nil {
		return nil, err
	}
	status, err := r.TwoFactor.RecoveryStatus(ctx, principal, userID)
	if err != nil {
		return nil, err
	}
	result := &TwoFactorAuthenticationRecoveryStatus{
		HasVerifiedTwoFactorAuthenticationMethod: status.HasVerifiedMethod,
		IsAwaitingRecoveryEnrollment:             status.IsAwaitingRecoveryEnroll,
	}
	if status.PendingRecoveryCodeExpiry != nil {
		result.PendingRecoveryCodeExpiresAt = &metadata.Timestamp{Time: *status.PendingRecoveryCodeExpiry}
	}
	return result, nil
}

func (r *Resolver) Mutation() MutationResolver { return &mutationResolver{r} }

func (r *Resolver) Query() QueryResolver { return &queryResolver{r} }

type (
	mutationResolver struct{ *Resolver }
	queryResolver    struct{ *Resolver }
)

func principalFrom(ctx context.Context) (auth.Principal, error) {
	principal, ok := auth.PrincipalFrom(ctx)
	if !ok {
		return auth.Principal{}, auth.ErrUnauthenticated
	}
	return principal, nil
}
