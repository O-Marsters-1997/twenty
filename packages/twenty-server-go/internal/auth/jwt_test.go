package auth_test

import (
	"crypto/ecdsa"
	"crypto/elliptic"
	"crypto/rand"
	"crypto/sha256"
	"crypto/x509"
	"encoding/hex"
	"encoding/pem"
	"errors"
	"testing"
	"time"

	"github.com/golang-jwt/jwt/v5"
	"github.com/google/go-cmp/cmp"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/twentyhq/twenty/packages/twenty-server-go/internal/auth"
	"github.com/twentyhq/twenty/packages/twenty-server-go/internal/pgtest"
)

const appSecret = "app-secret"

type fixture struct {
	verifier *auth.JWTVerifier
	pool     *pgxpool.Pool
}

func newFixture(t *testing.T) fixture {
	t.Helper()
	pool, err := pgxpool.New(t.Context(), pgtest.New(t))
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(pool.Close)
	return fixture{verifier: auth.NewJWTVerifier(pool, appSecret), pool: pool}
}

func (f fixture) addKey(t *testing.T, revoked bool) (string, *ecdsa.PrivateKey) {
	t.Helper()
	key, err := ecdsa.GenerateKey(elliptic.P256(), rand.Reader)
	if err != nil {
		t.Fatal(err)
	}
	der, err := x509.MarshalPKIXPublicKey(&key.PublicKey)
	if err != nil {
		t.Fatal(err)
	}
	publicPEM := pem.EncodeToMemory(&pem.Block{Type: "PUBLIC KEY", Bytes: der})
	kid := uuid.NewString()
	var revokedAt *time.Time
	if revoked {
		now := time.Now()
		revokedAt = &now
	}
	_, err = f.pool.Exec(t.Context(),
		`INSERT INTO core."signingKey" (id, "publicKey", "revokedAt") VALUES ($1, $2, $3)`,
		kid, string(publicPEM), revokedAt)
	if err != nil {
		t.Fatal(err)
	}
	return kid, key
}

func accessClaims(tokenType string, expiresIn time.Duration) jwt.MapClaims {
	return jwt.MapClaims{
		"sub":               "user-1",
		"type":              tokenType,
		"workspaceId":       "workspace-1",
		"userId":            "user-1",
		"workspaceMemberId": "member-1",
		"userWorkspaceId":   "user-workspace-1",
		"authProvider":      "password",
		"exp":               time.Now().Add(expiresIn).Unix(),
	}
}

func signES256(t *testing.T, kid string, key *ecdsa.PrivateKey, claims jwt.MapClaims) string {
	t.Helper()
	token := jwt.NewWithClaims(jwt.SigningMethodES256, claims)
	token.Header["kid"] = kid
	signed, err := token.SignedString(key)
	if err != nil {
		t.Fatal(err)
	}
	return signed
}

func signHS256(t *testing.T, secret string, claims jwt.MapClaims) string {
	t.Helper()
	signed, err := jwt.NewWithClaims(jwt.SigningMethodHS256, claims).SignedString([]byte(secret))
	if err != nil {
		t.Fatal(err)
	}
	return signed
}

func legacySecret(body, tokenType string) string {
	sum := sha256.Sum256([]byte(appSecret + body + tokenType))
	return hex.EncodeToString(sum[:])
}

func TestJWTVerifier_Verify(t *testing.T) {
	t.Parallel()
	want := auth.Principal{
		UserID:            "user-1",
		WorkspaceID:       "workspace-1",
		UserWorkspaceID:   "user-workspace-1",
		WorkspaceMemberID: "member-1",
		AuthProvider:      "password",
	}

	t.Run("accepts", func(t *testing.T) {
		t.Parallel()
		f := newFixture(t)
		kid, key := f.addKey(t, false)
		tests := []struct{ name, token string }{
			{"ES256 by kid", signES256(t, kid, key, accessClaims("ACCESS", time.Hour))},
			{"legacy HS256", signHS256(t, legacySecret("workspace-1", "ACCESS"), accessClaims("ACCESS", time.Hour))},
		}
		for _, tt := range tests {
			t.Run(tt.name, func(t *testing.T) {
				got, err := f.verifier.Verify(t.Context(), tt.token)
				if err != nil {
					t.Errorf("Verify() error = %v", err)
				}
				if diff := cmp.Diff(want, got); diff != "" {
					t.Errorf("Verify() principal (-want +got):\n%s", diff)
				}
			})
		}
	})

	t.Run("rejects", func(t *testing.T) {
		t.Parallel()
		f := newFixture(t)
		kid, key := f.addKey(t, false)
		revokedKid, revokedKey := f.addKey(t, true)
		_, strangerKey := f.addKey(t, false)
		tests := []struct{ name, token string }{
			{"expired", signES256(t, kid, key, accessClaims("ACCESS", -time.Hour))},
			{"revoked key", signES256(t, revokedKid, revokedKey, accessClaims("ACCESS", time.Hour))},
			{"unknown kid", signES256(t, uuid.NewString(), key, accessClaims("ACCESS", time.Hour))},
			{"non-uuid kid", signES256(t, "nope", key, accessClaims("ACCESS", time.Hour))},
			{"wrong signature", signES256(t, kid, strangerKey, accessClaims("ACCESS", time.Hour))},
			{"refresh type", signES256(t, kid, key, accessClaims("REFRESH", time.Hour))},
			{"legacy wrong secret", signHS256(t, "wrong", accessClaims("ACCESS", time.Hour))},
			{"legacy non-access type", signHS256(t, legacySecret("workspace-1", "REFRESH"), accessClaims("REFRESH", time.Hour))},
			{"garbage", "not-a-token"},
			{"alg none", func() string {
				s, err := jwt.NewWithClaims(jwt.SigningMethodNone, accessClaims("ACCESS", time.Hour)).SignedString(jwt.UnsafeAllowNoneSignatureType)
				if err != nil {
					t.Fatal(err)
				}
				return s
			}()},
		}
		for _, tt := range tests {
			t.Run(tt.name, func(t *testing.T) {
				if _, err := f.verifier.Verify(t.Context(), tt.token); !errors.Is(err, auth.ErrUnauthenticated) {
					t.Errorf("Verify() error = %v, want %v", err, auth.ErrUnauthenticated)
				}
			})
		}
	})
}
