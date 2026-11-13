package authgql

import (
	"context"

	"github.com/twentyhq/twenty/packages/twenty-server-go/internal/auth"
	"github.com/twentyhq/twenty/packages/twenty-server-go/internal/metadata"
)

type Resolver struct {
	TwoFactor *auth.TwoFactor
	Login     *auth.TwoFactorLogin
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

func (r *mutationResolver) GetAuthTokensFromOtp(ctx context.Context, loginToken string, otp string, _ *string, origin string) (*AuthTokens, error) {
	w, req := exchangeFrom(ctx)
	pair, err := r.Login.WithOTP(ctx, w, req, loginToken, otp, origin)
	if err != nil {
		return nil, err
	}
	return &AuthTokens{Tokens: tokenPair(pair)}, nil
}

func (r *mutationResolver) GetAuthTokensFromTwoFactorAuthenticationRecoveryCode(ctx context.Context, loginToken string, recoveryCode string, _ *string, origin string) (*TwoFactorAuthenticationRecoveryCodeRedemption, error) {
	w, req := exchangeFrom(ctx)
	login, err := r.Login.WithRecoveryCode(ctx, w, req, loginToken, recoveryCode, origin)
	if err != nil {
		return nil, err
	}
	result := &TwoFactorAuthenticationRecoveryCodeRedemption{}
	if login.Tokens != nil {
		result.Tokens = tokenPair(*login.Tokens)
	}
	if login.ProvisioningURI != "" {
		result.ProvisioningURI = &login.ProvisioningURI
	}
	return result, nil
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
