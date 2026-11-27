package authgql

import "context"

func (r *mutationResolver) ResendEmailVerificationToken(ctx context.Context, email string, origin string) (*ResendEmailVerificationToken, error) {
	if err := r.EmailVerification.Resend(ctx, email, origin); err != nil {
		return nil, err
	}
	return &ResendEmailVerificationToken{Success: true}, nil
}

func (r *mutationResolver) VerifyEmailAndGetLoginToken(ctx context.Context, emailVerificationToken string, email string, _ *string, origin string) (*VerifyEmailAndGetLoginToken, error) {
	verified, err := r.EmailVerification.VerifyForLoginToken(ctx, emailVerificationToken, email, origin)
	if err != nil {
		return nil, err
	}
	return &VerifyEmailAndGetLoginToken{
		LoginToken:    authTokenFrom(verified.LoginToken),
		WorkspaceUrls: &WorkspaceUrls{SubdomainURL: verified.SubdomainURL},
	}, nil
}

func (r *mutationResolver) VerifyEmailAndGetWorkspaceAgnosticToken(ctx context.Context, emailVerificationToken string, email string, _ *string) (*AvailableWorkspacesAndAccessTokens, error) {
	w, req := exchangeFrom(ctx)
	result, err := r.EmailVerification.VerifyForWorkspaceAgnosticToken(ctx, emailVerificationToken, email)
	if err != nil {
		return nil, err
	}
	return r.signedIn(ctx, w, req, result)
}

func (r *mutationResolver) UpdateUserEmail(ctx context.Context, newEmail string, verifyEmailRedirectPath *string) (bool, error) {
	principal, err := principalFrom(ctx)
	if err != nil {
		return false, err
	}
	var redirectPath string
	if verifyEmailRedirectPath != nil {
		redirectPath = *verifyEmailRedirectPath
	}
	if err := r.EmailVerification.UpdateEmail(ctx, principal, newEmail, redirectPath); err != nil {
		return false, err
	}
	return true, nil
}
