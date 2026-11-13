package authgql

import (
	"context"

	"github.com/twentyhq/twenty/packages/twenty-server-go/internal/auth"
	"github.com/twentyhq/twenty/packages/twenty-server-go/internal/metadata"
)

type Resolver struct {
	TwoFactor *auth.TwoFactor
	SignIn    *auth.SignIn
	Sessions  *auth.UserSession
}

func (r *mutationResolver) GetAuthTokensFromLoginToken(ctx context.Context, loginToken string, origin string) (*AuthTokens, error) {
	pair, err := r.SignIn.TokensFromLoginToken(ctx, loginToken, origin)
	if err != nil {
		return nil, err
	}
	return r.issueSession(ctx, pair, auth.SessionOriginSignIn)
}

func (r *mutationResolver) RenewToken(ctx context.Context, appToken string) (*AuthTokens, error) {
	pair, err := r.SignIn.Renew(ctx, appToken)
	if err != nil {
		return nil, err
	}
	return r.issueSession(ctx, pair, auth.SessionOriginRenewalBridge)
}

func (r *mutationResolver) SignOut(ctx context.Context, refreshToken *string) (bool, error) {
	exchange := exchangeFrom(ctx)
	var token string
	if refreshToken != nil {
		token = *refreshToken
	}
	if err := r.Sessions.SignOut(ctx, exchange.w, exchange.r, token); err != nil {
		return false, err
	}
	return true, nil
}

func (r *Resolver) issueSession(ctx context.Context, pair auth.TokenPair, origin auth.SessionOrigin) (*AuthTokens, error) {
	refreshExpiresAt, err := auth.UnverifiedRefreshTokenExpiry(pair.RefreshToken)
	if err != nil {
		return nil, err
	}
	exchange := exchangeFrom(ctx)
	if err := r.Sessions.IssueForTokenPair(ctx, exchange.w, exchange.r, pair, origin); err != nil {
		return nil, auth.SessionIssueError(err)
	}
	return &AuthTokens{Tokens: &AuthTokenPair{
		AccessOrWorkspaceAgnosticToken: &AuthToken{Token: pair.AccessToken, ExpiresAt: metadata.Timestamp{Time: pair.ExpiresAt}},
		RefreshToken:                   &AuthToken{Token: pair.RefreshToken, ExpiresAt: metadata.Timestamp{Time: refreshExpiresAt}},
	}}, nil
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
