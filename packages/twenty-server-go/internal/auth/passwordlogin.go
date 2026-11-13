package auth

import (
	"context"
	"errors"
	"fmt"
	"net/url"
	"strings"
	"time"

	"github.com/golang-jwt/jwt/v5"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

const fileFolderCorePicture = "core-picture"

type PasswordLoginConfig struct {
	FrontURL                  *url.URL
	ServerURL                 string
	MultiWorkspace            bool
	EmailVerificationRequired bool
	FileTokenTTL              time.Duration
}

type PasswordLoginIssuer interface {
	IssueLoginToken(ctx context.Context, userID, workspaceID string, provider AuthProvider) (string, error)
	IssueWorkspaceAgnostic(ctx context.Context, userID string, provider AuthProvider) (TokenPair, error)
	IssueFileToken(ctx context.Context, workspaceID, fileID string, ttl time.Duration) (string, error)
}

type PasswordLogin struct {
	pool    *pgxpool.Pool
	hasher  PasswordHasher
	issuer  PasswordLoginIssuer
	origins *OriginResolver
	config  PasswordLoginConfig
}

func NewPasswordLogin(pool *pgxpool.Pool, hasher PasswordHasher, issuer PasswordLoginIssuer, origins *OriginResolver, config PasswordLoginConfig) *PasswordLogin {
	return &PasswordLogin{pool: pool, hasher: hasher, issuer: issuer, origins: origins, config: config}
}

type SignedToken struct {
	Token     string
	ExpiresAt time.Time
}

type AvailableWorkspace struct {
	ID                  string
	DisplayName         *string
	LoginToken          *string
	PersonalInviteToken *string
	SubdomainURL        string
	Logo                string
}

type SignInResult struct {
	Pair      TokenPair
	Access    SignedToken
	Refresh   SignedToken
	ForSignIn []AvailableWorkspace
	ForSignUp []AvailableWorkspace
}

type loginUser struct {
	id           string
	email        string
	passwordHash *string
	verified     bool
}

type workspaceRow struct {
	id              string
	displayName     *string
	subdomain       string
	logoFileID      *string
	passwordEnabled bool
	inviteToken     *string
}

const workspaceColumns = `w.id::text, w."displayName", w.subdomain, w."logoFileId"::text, w."isPasswordAuthEnabled"`

func (l *PasswordLogin) LoginTokenFromCredentials(ctx context.Context, email, password, origin string) (SignedToken, error) {
	workspace, err := l.origins.ByOriginOrDefault(ctx, origin)
	if errors.Is(err, ErrWorkspaceNotFound) {
		return SignedToken{}, workspaceNotFound()
	}
	if err != nil {
		return SignedToken{}, fmt.Errorf("resolve workspace: %w", err)
	}
	user, err := l.findUser(ctx, email)
	if err != nil {
		return SignedToken{}, err
	}
	if err := l.assertPasswordAuthAllowed(ctx, user, workspace.ID); err != nil {
		return SignedToken{}, err
	}
	if err := l.assertMember(ctx, user, workspace.ID, password); err != nil {
		return SignedToken{}, err
	}
	token, err := l.issuer.IssueLoginToken(ctx, user.id, workspace.ID, passwordProvider)
	if err != nil {
		return SignedToken{}, err
	}
	return signedToken(token)
}

func (l *PasswordLogin) SignIn(ctx context.Context, email, password string) (SignInResult, error) {
	user, err := l.findUser(ctx, email)
	if err != nil {
		return SignInResult{}, err
	}
	if err := l.checkPassword(user, password); err != nil {
		return SignInResult{}, err
	}
	forSignIn, forSignUp, err := l.availableWorkspaces(ctx, user)
	if err != nil {
		return SignInResult{}, err
	}
	pair, err := l.issuer.IssueWorkspaceAgnostic(ctx, user.id, passwordProvider)
	if err != nil {
		return SignInResult{}, err
	}
	refresh, err := signedToken(pair.RefreshToken)
	if err != nil {
		return SignInResult{}, err
	}
	return SignInResult{
		Pair:      pair,
		Access:    SignedToken{Token: pair.AccessToken, ExpiresAt: pair.ExpiresAt},
		Refresh:   refresh,
		ForSignIn: forSignIn,
		ForSignUp: forSignUp,
	}, nil
}

func (l *PasswordLogin) findUser(ctx context.Context, email string) (loginUser, error) {
	var user loginUser
	err := l.pool.QueryRow(ctx,
		`SELECT id::text, email::text, "passwordHash", "isEmailVerified" FROM core."user"
		 WHERE lower(email::text) = lower($1) AND "deletedAt" IS NULL`, email,
	).Scan(&user.id, &user.email, &user.passwordHash, &user.verified)
	if errors.Is(err, pgx.ErrNoRows) {
		return loginUser{}, userNotFound()
	}
	if err != nil {
		return loginUser{}, fmt.Errorf("look up user: %w", err)
	}
	return user, nil
}

func (l *PasswordLogin) checkPassword(user loginUser, password string) error {
	if user.passwordHash == nil || *user.passwordHash == "" {
		return incorrectLoginMethod()
	}
	switch err := l.hasher.Compare(*user.passwordHash, password); {
	case errors.Is(err, ErrInvalidCredentials):
		return wrongPassword()
	case err != nil:
		return err
	}
	if l.config.EmailVerificationRequired && !user.verified {
		return emailNotVerified()
	}
	return nil
}

func (l *PasswordLogin) assertPasswordAuthAllowed(ctx context.Context, user loginUser, workspaceID string) error {
	var enabled, bypassEnabled bool
	if err := l.pool.QueryRow(ctx,
		`SELECT "isPasswordAuthEnabled", "isPasswordAuthBypassEnabled" FROM core.workspace WHERE id = $1::uuid`, workspaceID,
	).Scan(&enabled, &bypassEnabled); err != nil {
		return fmt.Errorf("look up workspace auth settings: %w", err)
	}
	if enabled {
		return nil
	}
	if bypassEnabled {
		canBypass, err := l.canBypassPasswordAuth(ctx, user.id, workspaceID)
		if err != nil {
			return err
		}
		if canBypass {
			return nil
		}
	}
	return forbidden("Email/Password auth is not enabled for this workspace")
}

func (l *PasswordLogin) canBypassPasswordAuth(ctx context.Context, userID, workspaceID string) (bool, error) {
	var granted bool
	if err := l.pool.QueryRow(ctx,
		`SELECT COALESCE(bool_and(r."canUpdateAllSettings" OR EXISTS (
		     SELECT 1 FROM core."rolePermissionFlag" rpf JOIN core."permissionFlag" pf ON pf.id = rpf."permissionFlagId"
		     WHERE rpf."roleId" = r.id AND pf.key = 'SSO_BYPASS')), false)
		 FROM core."userWorkspace" uw
		 JOIN core."roleTarget" rt ON rt."userWorkspaceId" = uw.id AND rt."workspaceId" = uw."workspaceId"
		 JOIN core.role r ON r.id = rt."roleId"
		 WHERE uw."userId" = $1::uuid AND uw."workspaceId" = $2::uuid AND uw."deletedAt" IS NULL`, userID, workspaceID,
	).Scan(&granted); err != nil {
		return false, fmt.Errorf("look up sso bypass permission: %w", err)
	}
	return granted, nil
}

func (l *PasswordLogin) assertMember(ctx context.Context, user loginUser, workspaceID, password string) error {
	var member bool
	if err := l.pool.QueryRow(ctx,
		`SELECT EXISTS (SELECT 1 FROM core."userWorkspace" WHERE "userId" = $1::uuid AND "workspaceId" = $2::uuid AND "deletedAt" IS NULL)`,
		user.id, workspaceID,
	).Scan(&member); err != nil {
		return fmt.Errorf("look up workspace membership: %w", err)
	}
	if member {
		return l.checkPassword(user, password)
	}
	var invited bool
	if err := l.pool.QueryRow(ctx,
		`SELECT EXISTS (SELECT 1 FROM core."appToken"
		 WHERE "workspaceId" = $1::uuid AND type IN ('INVITATION_TOKEN', 'ONBOARDING_INVITATION_TOKEN')
		   AND "deletedAt" IS NULL AND "expiresAt" > now() AND lower(context->>'email') = lower($2))`,
		workspaceID, user.email,
	).Scan(&invited); err != nil {
		return fmt.Errorf("look up workspace invitation: %w", err)
	}
	if invited {
		return errInvitedJoinNotServed
	}
	return forbidden("User is not a member of the workspace.")
}

func (l *PasswordLogin) availableWorkspaces(ctx context.Context, user loginUser) (forSignIn, forSignUp []AvailableWorkspace, err error) {
	members, err := l.queryWorkspaces(ctx,
		`SELECT `+workspaceColumns+`, NULL::text FROM core."userWorkspace" uw JOIN core.workspace w ON w.id = uw."workspaceId"
		 WHERE uw."userId" = $1::uuid AND uw."deletedAt" IS NULL AND w."deletedAt" IS NULL AND w."workspaceDiscoverability" <> 'HIDDEN'
		 ORDER BY uw."createdAt"`, user.id)
	if err != nil {
		return nil, nil, err
	}
	known := make([]string, 0, len(members))
	for _, member := range members {
		known = append(known, member.id)
	}
	joinable, err := l.joinableByDomain(ctx, user.email, known)
	if err != nil {
		return nil, nil, err
	}
	for _, workspace := range joinable {
		known = append(known, workspace.id)
	}
	invitations, err := l.queryWorkspaces(ctx,
		`SELECT `+workspaceColumns+`, t.value FROM core."appToken" t JOIN core.workspace w ON w.id = t."workspaceId"
		 WHERE t.type IN ('INVITATION_TOKEN', 'ONBOARDING_INVITATION_TOKEN') AND lower(t.context->>'email') = lower($1)
		   AND t."deletedAt" IS NULL AND t."expiresAt" > now() AND w."deletedAt" IS NULL
		   AND w."workspaceDiscoverability" <> 'HIDDEN' AND NOT (w.id::text = ANY($2))
		 ORDER BY t."createdAt"`, user.email, known)
	if err != nil {
		return nil, nil, err
	}

	forSignIn, err = l.present(ctx, user, members, true)
	if err != nil {
		return nil, nil, err
	}
	forSignUp, err = l.present(ctx, user, append(joinable, invitations...), false)
	if err != nil {
		return nil, nil, err
	}
	return forSignIn, forSignUp, nil
}

func (l *PasswordLogin) joinableByDomain(ctx context.Context, email string, memberIDs []string) ([]workspaceRow, error) {
	if !l.config.EmailVerificationRequired {
		return nil, nil
	}
	_, domain, found := strings.Cut(email, "@")
	if !found || domain == "" {
		return nil, nil
	}
	return l.queryWorkspaces(ctx,
		`SELECT `+workspaceColumns+`, NULL::text FROM core."approvedAccessDomain" d JOIN core.workspace w ON w.id = d."workspaceId"
		 WHERE d.domain = $1 AND d."isValidated" AND w."deletedAt" IS NULL AND w."workspaceDiscoverability" = 'PUBLIC'
		   AND NOT (w.id::text = ANY($2))
		 ORDER BY d."createdAt"`, domain, memberIDs)
}

func (l *PasswordLogin) queryWorkspaces(ctx context.Context, sql string, args ...any) ([]workspaceRow, error) {
	rows, err := l.pool.Query(ctx, sql, args...)
	if err != nil {
		return nil, fmt.Errorf("query workspaces: %w", err)
	}
	found, err := pgx.CollectRows(rows, func(row pgx.CollectableRow) (workspaceRow, error) {
		var workspace workspaceRow
		err := row.Scan(&workspace.id, &workspace.displayName, &workspace.subdomain, &workspace.logoFileID, &workspace.passwordEnabled, &workspace.inviteToken)
		return workspace, err
	})
	if err != nil {
		return nil, fmt.Errorf("read workspaces: %w", err)
	}
	return found, nil
}

func (l *PasswordLogin) present(ctx context.Context, user loginUser, rows []workspaceRow, withLoginToken bool) ([]AvailableWorkspace, error) {
	workspaces := make([]AvailableWorkspace, 0, len(rows))
	for _, row := range rows {
		available := AvailableWorkspace{
			ID:                  row.id,
			DisplayName:         row.displayName,
			PersonalInviteToken: row.inviteToken,
			SubdomainURL:        l.workspaceURL(row.subdomain),
		}
		if row.logoFileID != nil {
			token, err := l.issuer.IssueFileToken(ctx, row.id, *row.logoFileID, l.config.FileTokenTTL)
			if err != nil {
				return nil, err
			}
			available.Logo = fmt.Sprintf("%s/file/%s/%s?token=%s", l.config.ServerURL, fileFolderCorePicture, *row.logoFileID, token)
		}
		if withLoginToken && row.passwordEnabled {
			token, err := l.issuer.IssueLoginToken(ctx, user.id, row.id, passwordProvider)
			if err != nil {
				return nil, err
			}
			available.LoginToken = &token
		}
		workspaces = append(workspaces, available)
	}
	return workspaces, nil
}

func (l *PasswordLogin) workspaceURL(subdomain string) string {
	workspaceURL := *l.config.FrontURL
	if l.config.MultiWorkspace {
		host := subdomain + "." + workspaceURL.Hostname()
		if port := workspaceURL.Port(); port != "" {
			host += ":" + port
		}
		workspaceURL.Host = host
	}
	if workspaceURL.Path == "" {
		workspaceURL.Path = "/"
	}
	return workspaceURL.String()
}

func signedToken(token string) (SignedToken, error) {
	var claims jwt.RegisteredClaims
	if _, _, err := jwt.NewParser().ParseUnverified(token, &claims); err != nil {
		return SignedToken{}, fmt.Errorf("read token expiry: %w", err)
	}
	if claims.ExpiresAt == nil {
		return SignedToken{}, errors.New("read token expiry: token has no exp claim")
	}
	return SignedToken{Token: token, ExpiresAt: claims.ExpiresAt.Time}, nil
}
