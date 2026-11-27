package authgql

import (
	"context"
	"net/http"

	"github.com/twentyhq/twenty/packages/twenty-server-go/internal/auth"
	"github.com/twentyhq/twenty/packages/twenty-server-go/internal/metadata"
)

type Resolver struct {
	EmailVerification *auth.EmailVerification
	TwoFactor         *auth.TwoFactor
	Exchange          *auth.SignIn
	PasswordLogin     *auth.PasswordLogin
	Sessions          *auth.UserSession
	Login             *auth.TwoFactorLogin
	Tokens            *auth.PGIssuer
	Public            *auth.PublicData
	PasswordReset     *auth.PasswordReset
}

func (r *mutationResolver) EmailPasswordResetLink(ctx context.Context, email string, workspaceID *string, _ *string) (*EmailPasswordResetLink, error) {
	var workspace string
	if workspaceID != nil {
		workspace = *workspaceID
	}
	if err := r.PasswordReset.RequestLink(ctx, email, workspace); err != nil {
		return nil, err
	}
	return &EmailPasswordResetLink{Success: true}, nil
}

func (r *mutationResolver) UpdatePasswordViaResetToken(ctx context.Context, passwordResetToken string, newPassword string) (*InvalidatePassword, error) {
	if err := r.PasswordReset.UpdatePassword(ctx, passwordResetToken, newPassword); err != nil {
		return nil, err
	}
	return &InvalidatePassword{Success: true}, nil
}

func (r *queryResolver) ValidatePasswordResetToken(ctx context.Context, passwordResetToken string) (*ValidatePasswordResetToken, error) {
	user, err := r.PasswordReset.Validate(ctx, passwordResetToken)
	if err != nil {
		return nil, err
	}
	return &ValidatePasswordResetToken{ID: user.ID, Email: user.Email, HasPassword: user.HasPassword}, nil
}

func (r *mutationResolver) InitiateOTPProvisioning(ctx context.Context, loginToken string, origin string) (*InitiateTwoFactorAuthenticationProvisioning, error) {
	uri, err := r.Login.InitiateProvisioning(ctx, loginToken, origin)
	if err != nil {
		return nil, err
	}
	return &InitiateTwoFactorAuthenticationProvisioning{URI: uri}, nil
}

func (r *mutationResolver) RevokeUserSession(ctx context.Context, userSessionID string) (bool, error) {
	principal, err := principalFrom(ctx)
	if err != nil {
		return false, err
	}
	w, req := exchangeFrom(ctx)
	return r.Sessions.RevokeSession(ctx, w, req, principal, userSessionID)
}

func (r *mutationResolver) RevokeAllOtherUserSessions(ctx context.Context) (int, error) {
	principal, err := principalFrom(ctx)
	if err != nil {
		return 0, err
	}
	_, req := exchangeFrom(ctx)
	return r.Sessions.RevokeOtherSessions(ctx, req, principal)
}

func (r *mutationResolver) GenerateTransientToken(ctx context.Context) (*TransientToken, error) {
	principal, err := principalFrom(ctx)
	if err != nil {
		return nil, err
	}
	token, err := r.Tokens.IssueTransient(ctx, principal)
	if err != nil {
		return nil, err
	}
	return &TransientToken{TransientToken: authTokenFrom(token)}, nil
}

func (r *queryResolver) CurrentUserSessions(ctx context.Context) ([]*UserSession, error) {
	principal, err := principalFrom(ctx)
	if err != nil {
		return nil, err
	}
	_, req := exchangeFrom(ctx)
	sessions, err := r.Sessions.CurrentSessions(ctx, req, principal)
	if err != nil {
		return nil, err
	}
	result := make([]*UserSession, 0, len(sessions))
	for _, session := range sessions {
		result = append(result, &UserSession{
			ID:           session.ID,
			WorkspaceID:  session.WorkspaceID,
			AuthProvider: session.AuthProvider,
			UserAgent:    session.UserAgent,
			IPAddress:    session.IPAddress,
			CreatedAt:    metadata.Timestamp{Time: session.CreatedAt},
			LastActiveAt: metadata.Timestamp{Time: session.LastActiveAt},
			ExpiresAt:    metadata.Timestamp{Time: session.ExpiresAt},
			IsCurrent:    session.IsCurrent,
		})
	}
	return result, nil
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

func (r *mutationResolver) GetLoginTokenFromCredentials(ctx context.Context, email string, password string, _ *string, _ *string, _ *string, origin string) (*LoginToken, error) {
	token, err := r.PasswordLogin.LoginTokenFromCredentials(ctx, email, password, origin)
	if err != nil {
		return nil, err
	}
	return &LoginToken{LoginToken: authTokenFrom(token)}, nil
}

func (r *mutationResolver) SignIn(ctx context.Context, email string, password string, _ *string, _ *string, _ *string) (*AvailableWorkspacesAndAccessTokens, error) {
	w, req := exchangeFrom(ctx)
	result, err := r.PasswordLogin.SignIn(ctx, email, password)
	if err != nil {
		return nil, err
	}
	return r.signedIn(ctx, w, req, result)
}

func (r *Resolver) signedIn(ctx context.Context, w http.ResponseWriter, req *http.Request, result auth.SignInResult) (*AvailableWorkspacesAndAccessTokens, error) {
	if err := r.Sessions.IssueForTokenPair(ctx, w, req, result.Pair, auth.SessionOriginSignIn); err != nil {
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

func (r *mutationResolver) GetAuthTokensFromLoginToken(ctx context.Context, loginToken string, origin string) (*AuthTokens, error) {
	pair, err := r.Exchange.TokensFromLoginToken(ctx, loginToken, origin)
	if err != nil {
		return nil, err
	}
	return r.issueSession(ctx, pair, auth.SessionOriginSignIn)
}

func (r *mutationResolver) RenewToken(ctx context.Context, appToken string) (*AuthTokens, error) {
	pair, err := r.Exchange.Renew(ctx, appToken)
	if err != nil {
		return nil, err
	}
	return r.issueSession(ctx, pair, auth.SessionOriginRenewalBridge)
}

func (r *mutationResolver) SignOut(ctx context.Context, refreshToken *string) (bool, error) {
	w, req := exchangeFrom(ctx)
	var token string
	if refreshToken != nil {
		token = *refreshToken
	}
	if err := r.Sessions.SignOut(ctx, w, req, token); err != nil {
		return false, err
	}
	return true, nil
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

func (r *Resolver) issueSession(ctx context.Context, pair auth.TokenPair, origin auth.SessionOrigin) (*AuthTokens, error) {
	refreshExpiresAt, err := auth.UnverifiedRefreshTokenExpiry(pair.RefreshToken)
	if err != nil {
		return nil, err
	}
	w, req := exchangeFrom(ctx)
	if err := r.Sessions.IssueForTokenPair(ctx, w, req, pair, origin); err != nil {
		return nil, auth.SessionIssueError(err)
	}
	pair.RefreshExpiresAt = refreshExpiresAt
	return &AuthTokens{Tokens: tokenPair(pair)}, nil
}

func (r *queryResolver) GetPublicWorkspaceDataByDomain(ctx context.Context, origin *string) (*PublicWorkspaceData, error) {
	_, req := exchangeFrom(ctx)
	var requested string
	if origin != nil {
		requested = *origin
	}
	workspace, err := r.Public.ByOrigin(ctx, requested, req.Header.Get("Origin"))
	if err != nil {
		return nil, err
	}
	logo := workspace.Logo
	data := &PublicWorkspaceData{
		ID:            workspace.ID,
		Logo:          &logo,
		DisplayName:   workspace.DisplayName,
		WorkspaceUrls: &WorkspaceUrls{SubdomainURL: workspace.SubdomainURL},
		AuthProviders: (*AuthProviders)(&workspace.AuthProviders),
	}
	if workspace.AuthBypassProviders != nil {
		data.AuthBypassProviders = (*AuthBypassProviders)(workspace.AuthBypassProviders)
	}
	return data, nil
}

func (r *queryResolver) GetPublicWorkspaceDataByID(ctx context.Context, id string) (*PublicWorkspaceDataSummary, error) {
	workspace, err := r.Public.ByID(ctx, id)
	if err != nil {
		return nil, err
	}
	return &PublicWorkspaceDataSummary{ID: workspace.ID, Logo: &workspace.Logo, DisplayName: workspace.DisplayName}, nil
}

func (r *queryResolver) FindWorkspaceFromInviteHash(ctx context.Context, inviteHash string) (*Workspace, error) {
	workspace, err := r.Public.ByInviteHash(ctx, inviteHash)
	if err != nil {
		return nil, err
	}
	return &Workspace{ID: workspace.ID, DisplayName: workspace.DisplayName, Logo: workspace.Logo, AllowImpersonation: workspace.AllowImpersonation}, nil
}

func (r *queryResolver) CheckUserExists(ctx context.Context, email string, _ *string) (*CheckUserExist, error) {
	existence, err := r.Public.UserExists(ctx, email)
	if err != nil {
		return nil, err
	}
	return &CheckUserExist{
		Exists:                   existence.Exists,
		AvailableWorkspacesCount: float64(existence.AvailableWorkspacesCount),
		IsEmailVerified:          existence.IsEmailVerified,
	}, nil
}

func (r *queryResolver) CheckWorkspaceSubdomainAvailability(ctx context.Context, subdomain string) (*SubdomainAvailability, error) {
	availability, err := r.Public.SubdomainAvailability(ctx, subdomain)
	if err != nil {
		return nil, err
	}
	return (*SubdomainAvailability)(&availability), nil
}

func (r *queryResolver) GetWorkspaceCreationDefaults(ctx context.Context) (*WorkspaceCreationDefaults, error) {
	principal, err := principalFrom(ctx)
	if err != nil {
		return nil, err
	}
	defaults, err := r.Public.CreationDefaults(ctx, principal.UserID)
	if err != nil {
		return nil, err
	}
	return (*WorkspaceCreationDefaults)(&defaults), nil
}

func (r *queryResolver) CurrentWorkspace(ctx context.Context) (*Workspace, error) {
	principal, err := principalFrom(ctx)
	if err != nil {
		return nil, err
	}
	origins, err := r.Public.IframeOrigins(ctx, principal.WorkspaceID)
	if err != nil {
		return nil, err
	}
	return &Workspace{ID: principal.WorkspaceID, AllowedIframeOrigins: origins}, nil
}

func (r *Resolver) Mutation() MutationResolver { return &mutationResolver{r} }

func (r *Resolver) Query() QueryResolver { return &queryResolver{r} }

type (
	mutationResolver struct{ *Resolver }
	queryResolver    struct{ *Resolver }
)
