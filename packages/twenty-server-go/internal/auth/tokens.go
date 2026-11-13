package auth

import (
	"context"
	"crypto/aes"
	"crypto/cipher"
	"crypto/ecdsa"
	"crypto/hkdf"
	"crypto/sha256"
	"crypto/x509"
	"encoding/base64"
	"encoding/hex"
	"encoding/pem"
	"errors"
	"fmt"
	"strings"
	"time"

	"github.com/golang-jwt/jwt/v5"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/twentyhq/twenty/packages/twenty-server-go/internal/workspace"
)

type TokenType string // ACCESS, REFRESH, LOGIN, FILE, API_KEY, as JwtTokenTypeEnum

const (
	TokenTypeAccess            TokenType = "ACCESS"
	TokenTypeRefresh           TokenType = "REFRESH"
	TokenTypeWorkspaceAgnostic TokenType = "WORKSPACE_AGNOSTIC"
	TokenTypeLogin             TokenType = "LOGIN"
	TokenTypeFile              TokenType = "FILE"
	TokenTypeAPIKey            TokenType = "API_KEY"
)

type TokenPair struct {
	AccessToken  string
	RefreshToken string
	ExpiresAt    time.Time // the access token's expiry
}

type Issuer interface { // ES256 with the current core."signingKey", same claims as Node
	IssueAccess(ctx context.Context, principal Principal) (string, time.Time, error)
	IssueLogin(ctx context.Context, userID string) (string, error)
	Refresh(ctx context.Context, refreshToken string) (TokenPair, error)
	Revoke(ctx context.Context, refreshToken string) error
	IssueLoginToken(ctx context.Context, userID, workspaceID string, provider AuthProvider) (string, error)
	VerifyLoginToken(ctx context.Context, loginToken string) (LoginClaims, error)
	ConsumeLoginToken(ctx context.Context, login LoginClaims) error
	IssueWorkspaceAgnostic(ctx context.Context, userID string, provider AuthProvider) (TokenPair, error)
}

type LoginClaims struct {
	Email        string
	WorkspaceID  string
	AuthProvider AuthProvider
	ID           string
}

var ErrInvalidRefreshToken = errors.New("auth: invalid refresh token")

var (
	ErrInvalidLoginToken  = errors.New("auth: invalid login token")
	ErrLoginTokenConsumed = errors.New("auth: login token already used")
)

var ErrUnknownUser = errors.New("auth: no user with that email")

var errNoSigningKey = errors.New("no current signing key")

const (
	passwordProvider AuthProvider = "password"
	googleProvider   AuthProvider = "google"
)

const (
	defaultAccessTTL         = 30 * time.Minute
	defaultRefreshTTL        = 60 * 24 * time.Hour
	defaultLoginTTL          = 15 * time.Minute
	defaultAgnosticTTL       = 30 * time.Minute
	defaultRefreshReuseGrace = time.Minute
	refreshAppTokenType      = "REFRESH_TOKEN"
	signOutRevokedReason     = "USER_SIGN_OUT"
	envelopePrefix           = "enc:v2:"

	consumedLoginTokenKeyPrefix = "login-token:consumed:"
)

type IssuerConfig struct {
	AppSecret             string
	EncryptionKey         string
	FallbackEncryptionKey string
	AccessTTL             time.Duration
	RefreshTTL            time.Duration
	LoginTTL              time.Duration
	WorkspaceAgnosticTTL  time.Duration
	RefreshReuseGrace     time.Duration
	Cache                 CacheStore
}

type PGIssuer struct {
	pool     *pgxpool.Pool
	verifier *JWTVerifier
	config   IssuerConfig
}

func NewPGIssuer(pool *pgxpool.Pool, config IssuerConfig) *PGIssuer {
	if config.AccessTTL == 0 {
		config.AccessTTL = defaultAccessTTL
	}
	if config.RefreshTTL == 0 {
		config.RefreshTTL = defaultRefreshTTL
	}
	if config.LoginTTL == 0 {
		config.LoginTTL = defaultLoginTTL
	}
	if config.WorkspaceAgnosticTTL == 0 {
		config.WorkspaceAgnosticTTL = defaultAgnosticTTL
	}
	if config.RefreshReuseGrace == 0 {
		config.RefreshReuseGrace = defaultRefreshReuseGrace
	}
	return &PGIssuer{pool: pool, verifier: NewJWTVerifier(pool, config.AppSecret), config: config}
}

type refreshClaims struct {
	claims
	TargetedTokenType TokenType `json:"targetedTokenType"`
}

func (i *PGIssuer) IssueAccess(ctx context.Context, principal Principal) (string, time.Time, error) {
	expiresAt := time.Now().Add(i.config.AccessTTL)
	body := jwt.MapClaims{
		"sub":             principal.UserID,
		"userId":          principal.UserID,
		"workspaceId":     principal.WorkspaceID,
		"userWorkspaceId": principal.UserWorkspaceID,
		"type":            TokenTypeAccess,
		"authProvider":    principal.AuthProvider,
	}
	if principal.WorkspaceMemberID != "" {
		body["workspaceMemberId"] = principal.WorkspaceMemberID
	}
	token, err := i.sign(ctx, body, expiresAt)
	if err != nil {
		return "", time.Time{}, fmt.Errorf("issue access token: %w", err)
	}
	return token, expiresAt, nil
}

func (i *PGIssuer) IssueLogin(ctx context.Context, userID string) (string, error) {
	return i.issueLogin(ctx, userID, passwordProvider)
}

func (i *PGIssuer) IssueLoginForEmail(ctx context.Context, email string, provider AuthProvider) (string, error) {
	var userID string
	err := i.pool.QueryRow(ctx,
		`SELECT id::text FROM core."user" WHERE lower(email::text) = lower($1) AND "deletedAt" IS NULL`, email,
	).Scan(&userID)
	if errors.Is(err, pgx.ErrNoRows) {
		return "", ErrUnknownUser
	}
	if err != nil {
		return "", fmt.Errorf("look up user by email: %w", err)
	}
	return i.issueLogin(ctx, userID, provider)
}

func (i *PGIssuer) issueLogin(ctx context.Context, userID string, provider AuthProvider) (string, error) {
	var email, workspaceID string
	err := i.pool.QueryRow(ctx,
		`SELECT u.email::text, uw."workspaceId"::text
		 FROM core."user" u JOIN core."userWorkspace" uw ON uw."userId" = u.id
		 WHERE u.id = $1::uuid AND u."deletedAt" IS NULL AND uw."deletedAt" IS NULL
		 ORDER BY uw."createdAt" LIMIT 1`, userID,
	).Scan(&email, &workspaceID)
	if err != nil {
		return "", fmt.Errorf("look up login subject: %w", err)
	}
	return i.signLogin(ctx, email, workspaceID, provider)
}

func (i *PGIssuer) IssueLoginToken(ctx context.Context, userID, workspaceID string, provider AuthProvider) (string, error) {
	var email string
	err := i.pool.QueryRow(ctx,
		`SELECT u.email::text FROM core."user" u JOIN core."userWorkspace" uw ON uw."userId" = u.id
		 WHERE u.id = $1::uuid AND uw."workspaceId" = $2::uuid AND u."deletedAt" IS NULL AND uw."deletedAt" IS NULL`,
		userID, workspaceID,
	).Scan(&email)
	if err != nil {
		return "", fmt.Errorf("look up login subject: %w", err)
	}
	return i.signLogin(ctx, email, workspaceID, provider)
}

func (i *PGIssuer) signLogin(ctx context.Context, email, workspaceID string, provider AuthProvider) (string, error) {
	if !provider.valid() {
		return "", fmt.Errorf("issue login token: unknown authentication provider %q", provider)
	}
	token, err := i.sign(ctx, jwt.MapClaims{
		"type":         TokenTypeLogin,
		"sub":          email,
		"workspaceId":  workspaceID,
		"authProvider": provider,
		"jti":          uuid.NewString(),
	}, time.Now().Add(i.config.LoginTTL))
	if err != nil {
		return "", fmt.Errorf("issue login token: %w", err)
	}
	return token, nil
}

func (i *PGIssuer) IssueFileToken(ctx context.Context, workspaceID, fileID string, ttl time.Duration) (string, error) {
	token, err := i.sign(ctx, jwt.MapClaims{
		"workspaceId": workspaceID,
		"fileId":      fileID,
		"sub":         workspaceID,
		"type":        TokenTypeFile,
	}, time.Now().Add(ttl))
	if err != nil {
		return "", fmt.Errorf("issue file token: %w", err)
	}
	return token, nil
}

func (i *PGIssuer) VerifyLoginToken(ctx context.Context, loginToken string) (LoginClaims, error) {
	var parsed claims
	err := i.parseSigned(ctx, loginToken, &parsed, func() claims { return parsed })
	switch {
	case errors.Is(err, errKeyLookup):
		return LoginClaims{}, fmt.Errorf("verify login token: %w", err)
	case err != nil, parsed.Type != string(TokenTypeLogin), parsed.Subject == "", parsed.WorkspaceID == "", !parsed.AuthProvider.valid():
		return LoginClaims{}, ErrInvalidLoginToken
	}
	return LoginClaims{Email: parsed.Subject, WorkspaceID: parsed.WorkspaceID, AuthProvider: parsed.AuthProvider, ID: parsed.ID}, nil
}

func (i *PGIssuer) ConsumeLoginToken(ctx context.Context, login LoginClaims) error {
	if login.ID == "" {
		return ErrInvalidLoginToken
	}
	if i.config.Cache == nil {
		return errors.New("consume login token: no cache configured")
	}
	first, err := i.config.Cache.SetIfAbsent(ctx, consumedLoginTokenKeyPrefix+login.ID, i.config.LoginTTL)
	if err != nil {
		return fmt.Errorf("consume login token: %w", err)
	}
	if !first {
		return ErrLoginTokenConsumed
	}
	return nil
}

func (i *PGIssuer) IssueWorkspaceAgnostic(ctx context.Context, userID string, provider AuthProvider) (TokenPair, error) {
	var exists bool
	if err := i.pool.QueryRow(ctx, `SELECT EXISTS (SELECT 1 FROM core."user" WHERE id = $1::uuid)`, userID).Scan(&exists); err != nil {
		return TokenPair{}, fmt.Errorf("look up user: %w", err)
	}
	if !exists {
		return TokenPair{}, ErrUnknownUser
	}
	var pair TokenPair
	err := pgx.BeginFunc(ctx, i.pool, func(tx pgx.Tx) error {
		refresh, err := i.insertRefresh(ctx, tx, userID, nil, provider, TokenTypeWorkspaceAgnostic)
		if err != nil {
			return err
		}
		access, expiresAt, err := i.issueWorkspaceAgnosticAccess(ctx, userID, provider)
		if err != nil {
			return err
		}
		pair = TokenPair{AccessToken: access, RefreshToken: refresh, ExpiresAt: expiresAt}
		return nil
	})
	if err != nil {
		return TokenPair{}, err
	}
	return pair, nil
}

func (i *PGIssuer) issueWorkspaceAgnosticAccess(ctx context.Context, userID string, provider AuthProvider) (string, time.Time, error) {
	expiresAt := time.Now().Add(i.config.WorkspaceAgnosticTTL)
	token, err := i.sign(ctx, jwt.MapClaims{
		"sub":          userID,
		"userId":       userID,
		"authProvider": provider,
		"type":         TokenTypeWorkspaceAgnostic,
	}, expiresAt)
	if err != nil {
		return "", time.Time{}, fmt.Errorf("issue workspace-agnostic token: %w", err)
	}
	return token, expiresAt, nil
}

func (i *PGIssuer) Refresh(ctx context.Context, refreshToken string) (TokenPair, error) {
	presented, err := i.parseRefresh(ctx, refreshToken)
	if err != nil {
		return TokenPair{}, err
	}
	var pair TokenPair
	err = pgx.BeginFunc(ctx, i.pool, func(tx pgx.Tx) error {
		var err error
		pair, err = i.rotate(ctx, tx, presented)
		return err
	})
	if err != nil {
		return TokenPair{}, err
	}
	return pair, nil
}

func (i *PGIssuer) Revoke(ctx context.Context, refreshToken string) error {
	presented, err := i.parseRefresh(ctx, refreshToken)
	if err != nil {
		return err
	}
	_, err = i.pool.Exec(ctx,
		`UPDATE core."appToken"
		 SET "revokedAt" = COALESCE("revokedAt", now()),
		     context = COALESCE(context, '{}'::jsonb) || jsonb_build_object('revokedReason', $2::text)
		 WHERE id = $1::uuid AND type = $3`,
		presented.ID, signOutRevokedReason, refreshAppTokenType)
	if err != nil {
		return fmt.Errorf("revoke refresh token: %w", err)
	}
	return nil
}

func (i *PGIssuer) rotate(ctx context.Context, tx pgx.Tx, presented refreshClaims) (TokenPair, error) {
	if _, err := tx.Exec(ctx, `SELECT pg_advisory_xact_lock_shared(hashtextextended($1, 0))`, "user-authentication:"+presented.Subject); err != nil {
		return TokenPair{}, fmt.Errorf("lock user authentication: %w", err)
	}
	workspaceID, err := i.consumeRefreshToken(ctx, tx, presented)
	if err != nil {
		return TokenPair{}, err
	}
	provider, targeted := presented.AuthProvider, presented.TargetedTokenType
	if provider == "" {
		provider = passwordProvider
	}
	if targeted == "" {
		targeted = TokenTypeAccess
	}
	if workspaceID == nil && targeted != TokenTypeWorkspaceAgnostic {
		return TokenPair{}, ErrInvalidRefreshToken
	}
	newRefresh, err := i.insertRefresh(ctx, tx, presented.Subject, workspaceID, provider, targeted)
	if err != nil {
		return TokenPair{}, err
	}
	if workspaceID == nil {
		access, expiresAt, err := i.issueWorkspaceAgnosticAccess(ctx, presented.Subject, provider)
		if err != nil {
			return TokenPair{}, err
		}
		return TokenPair{AccessToken: access, RefreshToken: newRefresh, ExpiresAt: expiresAt}, nil
	}
	principal, err := resolvePrincipal(ctx, tx, presented.Subject, *workspaceID, provider)
	if err != nil {
		return TokenPair{}, err
	}
	access, accessExpiresAt, err := i.IssueAccess(ctx, principal)
	if err != nil {
		return TokenPair{}, err
	}
	return TokenPair{AccessToken: access, RefreshToken: newRefresh, ExpiresAt: accessExpiresAt}, nil
}

func (i *PGIssuer) insertRefresh(ctx context.Context, tx pgx.Tx, userID string, workspaceID *string, provider AuthProvider, targeted TokenType) (string, error) {
	expiresAt := time.Now().Add(i.config.RefreshTTL)
	var id string
	if err := tx.QueryRow(ctx,
		`INSERT INTO core."appToken" ("userId", "workspaceId", type, "expiresAt") VALUES ($1, $2, $3, $4) RETURNING id::text`,
		userID, workspaceID, refreshAppTokenType, expiresAt,
	).Scan(&id); err != nil {
		return "", fmt.Errorf("insert refresh token: %w", err)
	}
	body := jwt.MapClaims{
		"sub":               userID,
		"userId":            userID,
		"authProvider":      provider,
		"targetedTokenType": targeted,
		"type":              TokenTypeRefresh,
		"jti":               id,
	}
	if workspaceID != nil {
		body["workspaceId"] = *workspaceID
	}
	token, err := i.sign(ctx, body, expiresAt)
	if err != nil {
		return "", fmt.Errorf("sign refresh token: %w", err)
	}
	return token, nil
}

func (i *PGIssuer) consumeRefreshToken(ctx context.Context, tx pgx.Tx, presented refreshClaims) (*string, error) {
	var (
		workspaceID   *string
		revokedAt     *time.Time
		revokedReason *string
		userExists    bool
	)
	err := tx.QueryRow(ctx,
		`SELECT t."workspaceId"::text, t."revokedAt", t.context->>'revokedReason',
		        EXISTS (SELECT 1 FROM core."user" WHERE id = $2::uuid)
		 FROM core."appToken" t WHERE t.id = $1::uuid AND t.type = $3`,
		presented.ID, presented.Subject, refreshAppTokenType,
	).Scan(&workspaceID, &revokedAt, &revokedReason, &userExists)
	if errors.Is(err, pgx.ErrNoRows) || err == nil && !userExists {
		return nil, ErrInvalidRefreshToken
	}
	if err != nil {
		return nil, fmt.Errorf("look up refresh token: %w", err)
	}
	if revokedAt != nil && (revokedReason != nil || revokedAt.Before(time.Now().Add(-i.config.RefreshReuseGrace))) {
		return nil, ErrInvalidRefreshToken
	}
	if _, err := tx.Exec(ctx,
		`UPDATE core."appToken" SET "revokedAt" = now() WHERE id = $1::uuid AND "revokedAt" IS NULL`, presented.ID,
	); err != nil {
		return nil, fmt.Errorf("revoke rotated refresh token: %w", err)
	}
	return workspaceID, nil
}

func (i *PGIssuer) parseRefresh(ctx context.Context, token string) (refreshClaims, error) {
	var presented refreshClaims
	err := i.parseSigned(ctx, token, &presented, func() claims { return presented.claims })
	switch {
	case errors.Is(err, errKeyLookup):
		return refreshClaims{}, fmt.Errorf("verify refresh token: %w", err)
	case err != nil, presented.Type != string(TokenTypeRefresh):
		return refreshClaims{}, ErrInvalidRefreshToken
	}
	if _, err := uuid.Parse(presented.ID); err != nil {
		return refreshClaims{}, ErrInvalidRefreshToken
	}
	if _, err := uuid.Parse(presented.Subject); err != nil {
		return refreshClaims{}, ErrInvalidRefreshToken
	}
	return presented, nil
}

func (i *PGIssuer) parseSigned(ctx context.Context, token string, into jwt.Claims, decoded func() claims) error {
	parser := jwt.NewParser(jwt.WithValidMethods([]string{"ES256", "HS256"}), jwt.WithExpirationRequired())
	_, err := parser.ParseWithClaims(token, into, func(parsed *jwt.Token) (any, error) {
		if parsed.Method.Alg() == "ES256" {
			return i.verifier.publicKey(ctx, parsed)
		}
		return i.verifier.legacySecret(decoded(), "")
	})
	return err
}

func resolvePrincipal(ctx context.Context, tx pgx.Tx, userID, workspaceID string, provider AuthProvider) (Principal, error) {
	principal := Principal{UserID: userID, WorkspaceID: workspaceID, AuthProvider: provider}
	var status string
	err := tx.QueryRow(ctx,
		`SELECT uw.id::text, w."activationStatus"::text
		 FROM core."userWorkspace" uw JOIN core.workspace w ON w.id = uw."workspaceId"
		 WHERE uw."userId"::text = $1 AND uw."workspaceId"::text = $2 AND uw."deletedAt" IS NULL`,
		userID, workspaceID,
	).Scan(&principal.UserWorkspaceID, &status)
	if err != nil {
		return Principal{}, fmt.Errorf("look up user workspace: %w", err)
	}
	if status != "CREATED" && status != "ACTIVE" {
		return principal, nil
	}
	err = tx.QueryRow(ctx,
		fmt.Sprintf(`SELECT id::text FROM %s."workspaceMember" WHERE "userId"::text = $1`, pgx.Identifier{workspace.SchemaName()}.Sanitize()),
		userID,
	).Scan(&principal.WorkspaceMemberID)
	if err != nil {
		return Principal{}, fmt.Errorf("look up workspace member: %w", err)
	}
	return principal, nil
}

func (i *PGIssuer) sign(ctx context.Context, body jwt.MapClaims, expiresAt time.Time) (string, error) {
	var kid, encrypted string
	err := i.pool.QueryRow(ctx,
		`SELECT id::text, "privateKey" FROM core."signingKey"
		 WHERE "isCurrent" AND "revokedAt" IS NULL AND "privateKey" IS NOT NULL`,
	).Scan(&kid, &encrypted)
	if errors.Is(err, pgx.ErrNoRows) {
		return "", errNoSigningKey
	}
	if err != nil {
		return "", fmt.Errorf("look up signing key: %w", err)
	}
	key, err := i.decryptSigningKey(encrypted)
	if err != nil {
		return "", err
	}
	body["iat"] = time.Now().Unix()
	body["exp"] = expiresAt.Unix()
	token := jwt.NewWithClaims(jwt.SigningMethodES256, body)
	token.Header["kid"] = kid
	signed, err := token.SignedString(key)
	if err != nil {
		return "", fmt.Errorf("sign token: %w", err)
	}
	return signed, nil
}

func (i *PGIssuer) decryptSigningKey(envelope string) (*ecdsa.PrivateKey, error) {
	rest, hasPrefix := strings.CutPrefix(envelope, envelopePrefix)
	keyID, payload, hasKeyID := strings.Cut(rest, ":")
	if !hasPrefix || !hasKeyID {
		return nil, errors.New("decrypt signing key: malformed envelope")
	}
	primary := i.config.EncryptionKey
	if primary == "" {
		primary = i.config.AppSecret
	}
	var rawKey string
	for _, candidate := range []string{primary, i.config.FallbackEncryptionKey} {
		sum := sha256.Sum256([]byte(candidate))
		if candidate != "" && hex.EncodeToString(sum[:])[:8] == keyID {
			rawKey = candidate
			break
		}
	}
	if rawKey == "" {
		return nil, errors.New("decrypt signing key: no encryption key matches the envelope")
	}
	derived, err := hkdf.Key(sha256.New, []byte(rawKey), make([]byte, 32), "twenty:enc:v2:instance", 32)
	if err != nil {
		return nil, fmt.Errorf("derive signing key encryption key: %w", err)
	}
	block, err := aes.NewCipher(derived)
	if err != nil {
		return nil, fmt.Errorf("decrypt signing key: %w", err)
	}
	gcm, err := cipher.NewGCM(block)
	if err != nil {
		return nil, fmt.Errorf("decrypt signing key: %w", err)
	}
	data, err := base64.StdEncoding.DecodeString(payload)
	if err != nil || len(data) < gcm.NonceSize() {
		return nil, errors.New("decrypt signing key: malformed payload")
	}
	plain, err := gcm.Open(nil, data[:gcm.NonceSize()], data[gcm.NonceSize():], nil)
	if err != nil {
		return nil, fmt.Errorf("decrypt signing key: %w", err)
	}
	pemBlock, _ := pem.Decode(plain)
	if pemBlock == nil {
		return nil, errors.New("decrypt signing key: not PEM")
	}
	parsed, err := x509.ParsePKCS8PrivateKey(pemBlock.Bytes)
	if err != nil {
		return nil, fmt.Errorf("parse signing key: %w", err)
	}
	key, ok := parsed.(*ecdsa.PrivateKey)
	if !ok {
		return nil, errors.New("parse signing key: not an EC key")
	}
	return key, nil
}
