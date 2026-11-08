package auth

import (
	"context"
	"crypto/sha256"
	"crypto/x509"
	"encoding/hex"
	"encoding/pem"
	"errors"
	"fmt"

	"github.com/golang-jwt/jwt/v5"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

const accessTokenType = "ACCESS"

var errKeyLookup = errors.New("look up signing key")

type claims struct {
	jwt.RegisteredClaims
	Type              string       `json:"type"`
	WorkspaceID       string       `json:"workspaceId"`
	UserID            string       `json:"userId"`
	WorkspaceMemberID string       `json:"workspaceMemberId"`
	UserWorkspaceID   string       `json:"userWorkspaceId"`
	AuthProvider      AuthProvider `json:"authProvider"`
}

type JWTVerifier struct {
	pool      *pgxpool.Pool
	appSecret string
}

func NewJWTVerifier(pool *pgxpool.Pool, appSecret string) *JWTVerifier {
	return &JWTVerifier{pool: pool, appSecret: appSecret}
}

func (v *JWTVerifier) Verify(ctx context.Context, bearer string) (Principal, error) {
	var tokenClaims claims
	parser := jwt.NewParser(jwt.WithValidMethods([]string{"ES256", "HS256"}), jwt.WithExpirationRequired())
	_, err := parser.ParseWithClaims(bearer, &tokenClaims, func(token *jwt.Token) (any, error) {
		if token.Method.Alg() == "ES256" {
			return v.publicKey(ctx, token)
		}
		return v.legacySecret(tokenClaims)
	})
	switch {
	case errors.Is(err, errKeyLookup):
		return Principal{}, fmt.Errorf("verify token: %w", err)
	case err != nil, tokenClaims.Type != accessTokenType:
		return Principal{}, ErrUnauthenticated
	}
	return Principal{
		UserID:            tokenClaims.UserID,
		WorkspaceID:       tokenClaims.WorkspaceID,
		UserWorkspaceID:   tokenClaims.UserWorkspaceID,
		WorkspaceMemberID: tokenClaims.WorkspaceMemberID,
		AuthProvider:      tokenClaims.AuthProvider,
	}, nil
}

func (v *JWTVerifier) legacySecret(tokenClaims claims) (any, error) {
	body := tokenClaims.WorkspaceID
	if body == "" {
		body = tokenClaims.UserID
	}
	if v.appSecret == "" || body == "" {
		return nil, ErrUnauthenticated
	}
	sum := sha256.Sum256([]byte(v.appSecret + body + tokenClaims.Type))
	return []byte(hex.EncodeToString(sum[:])), nil
}

func (v *JWTVerifier) publicKey(ctx context.Context, token *jwt.Token) (any, error) {
	kid, _ := token.Header["kid"].(string)
	if kid == "" {
		return nil, ErrUnauthenticated
	}
	var publicKeyPEM string
	err := v.pool.QueryRow(ctx,
		`SELECT "publicKey" FROM core."signingKey" WHERE id::text = $1 AND "revokedAt" IS NULL`, kid,
	).Scan(&publicKeyPEM)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, ErrUnauthenticated
	}
	if err != nil {
		return nil, fmt.Errorf("%w: %w", errKeyLookup, err)
	}
	block, _ := pem.Decode([]byte(publicKeyPEM))
	if block == nil {
		return nil, ErrUnauthenticated
	}
	key, err := x509.ParsePKIXPublicKey(block.Bytes)
	if err != nil {
		return nil, ErrUnauthenticated
	}
	return key, nil
}
