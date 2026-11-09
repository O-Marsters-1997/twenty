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
	TokenTypeAccess  TokenType = "ACCESS"
	TokenTypeRefresh TokenType = "REFRESH"
	TokenTypeLogin   TokenType = "LOGIN"
	TokenTypeFile    TokenType = "FILE"
	TokenTypeAPIKey  TokenType = "API_KEY"
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
}

var ErrInvalidRefreshToken = errors.New("invalid refresh token")

var errNoSigningKey = errors.New("no current signing key")

const passwordProvider AuthProvider = "password"

const (
	refreshAppTokenType  = "REFRESH_TOKEN"
	signOutRevokedReason = "USER_SIGN_OUT"
	envelopePrefix       = "enc:v2:"
)

type IssuerConfig struct { // a zero lifetime takes Node's default, shown beside it
	AppSecret             string
	EncryptionKey         string
	FallbackEncryptionKey string
	AccessTTL             time.Duration // 30m
	RefreshTTL            time.Duration // 60d
	LoginTTL              time.Duration // 15m
	RefreshReuseGrace     time.Duration // 1m
}

type PGIssuer struct {
	pool     *pgxpool.Pool
	verifier *JWTVerifier
	config   IssuerConfig
}

func NewPGIssuer(pool *pgxpool.Pool, config IssuerConfig) *PGIssuer {
	if config.AccessTTL == 0 {
		config.AccessTTL = 30 * time.Minute
	}
	if config.RefreshTTL == 0 {
		config.RefreshTTL = 60 * 24 * time.Hour
	}
	if config.LoginTTL == 0 {
		config.LoginTTL = 15 * time.Minute
	}
	if config.RefreshReuseGrace == 0 {
		config.RefreshReuseGrace = time.Minute
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
	var email, workspaceID string
	err := i.pool.QueryRow(ctx,
		`SELECT u.email::text, uw."workspaceId"::text
		 FROM core."user" u JOIN core."userWorkspace" uw ON uw."userId" = u.id
		 WHERE u.id::text = $1 AND uw."deletedAt" IS NULL
		 ORDER BY uw."createdAt" LIMIT 1`, userID,
	).Scan(&email, &workspaceID)
	if err != nil {
		return "", fmt.Errorf("look up login subject: %w", err)
	}
	token, err := i.sign(ctx, jwt.MapClaims{
		"type":         TokenTypeLogin,
		"sub":          email,
		"workspaceId":  workspaceID,
		"authProvider": passwordProvider,
		"jti":          uuid.NewString(),
	}, time.Now().Add(i.config.LoginTTL))
	if err != nil {
		return "", fmt.Errorf("issue login token: %w", err)
	}
	return token, nil
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
		 WHERE id::text = $1 AND type = $3`,
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
	refreshExpiresAt := time.Now().Add(i.config.RefreshTTL)
	var newRefreshID string
	if err := tx.QueryRow(ctx,
		`INSERT INTO core."appToken" ("userId", "workspaceId", type, "expiresAt") VALUES ($1, $2, $3, $4) RETURNING id::text`,
		presented.Subject, workspaceID, refreshAppTokenType, refreshExpiresAt,
	).Scan(&newRefreshID); err != nil {
		return TokenPair{}, fmt.Errorf("insert refresh token: %w", err)
	}
	newRefresh, err := i.sign(ctx, jwt.MapClaims{
		"sub":               presented.Subject,
		"userId":            presented.Subject,
		"workspaceId":       workspaceID,
		"authProvider":      provider,
		"targetedTokenType": targeted,
		"type":              TokenTypeRefresh,
		"jti":               newRefreshID,
	}, refreshExpiresAt)
	if err != nil {
		return TokenPair{}, fmt.Errorf("sign refresh token: %w", err)
	}
	principal, err := resolvePrincipal(ctx, tx, presented.Subject, workspaceID, provider)
	if err != nil {
		return TokenPair{}, err
	}
	access, accessExpiresAt, err := i.IssueAccess(ctx, principal)
	if err != nil {
		return TokenPair{}, err
	}
	return TokenPair{AccessToken: access, RefreshToken: newRefresh, ExpiresAt: accessExpiresAt}, nil
}

func (i *PGIssuer) consumeRefreshToken(ctx context.Context, tx pgx.Tx, presented refreshClaims) (string, error) {
	var (
		workspaceID   *string
		revokedAt     *time.Time
		revokedReason *string
		userExists    bool
	)
	err := tx.QueryRow(ctx,
		`SELECT t."workspaceId"::text, t."revokedAt", t.context->>'revokedReason',
		        EXISTS (SELECT 1 FROM core."user" WHERE id::text = $2)
		 FROM core."appToken" t WHERE t.id::text = $1 AND t.type = $3`,
		presented.ID, presented.Subject, refreshAppTokenType,
	).Scan(&workspaceID, &revokedAt, &revokedReason, &userExists)
	if errors.Is(err, pgx.ErrNoRows) || err == nil && !userExists {
		return "", ErrInvalidRefreshToken
	}
	if err != nil {
		return "", fmt.Errorf("look up refresh token: %w", err)
	}
	if revokedAt != nil && (revokedReason != nil || revokedAt.Before(time.Now().Add(-i.config.RefreshReuseGrace))) {
		return "", ErrInvalidRefreshToken
	}
	if workspaceID == nil {
		return "", errors.New("refresh workspace-agnostic token: unsupported")
	}
	if _, err := tx.Exec(ctx,
		`UPDATE core."appToken" SET "revokedAt" = now() WHERE id::text = $1 AND "revokedAt" IS NULL`, presented.ID,
	); err != nil {
		return "", fmt.Errorf("revoke rotated refresh token: %w", err)
	}
	return *workspaceID, nil
}

func (i *PGIssuer) parseRefresh(ctx context.Context, token string) (refreshClaims, error) {
	var presented refreshClaims
	parser := jwt.NewParser(jwt.WithValidMethods([]string{"ES256", "HS256"}), jwt.WithExpirationRequired())
	_, err := parser.ParseWithClaims(token, &presented, func(parsed *jwt.Token) (any, error) {
		if parsed.Method.Alg() == "ES256" {
			return i.verifier.publicKey(ctx, parsed)
		}
		return i.verifier.legacySecret(presented.claims, "")
	})
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
