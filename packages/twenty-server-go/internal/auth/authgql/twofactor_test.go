package authgql_test

import (
	"bytes"
	"encoding/json"
	"io"
	"log/slog"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/google/go-cmp/cmp"
	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/twentyhq/twenty/packages/twenty-server-go/internal/auth"
	"github.com/twentyhq/twenty/packages/twenty-server-go/internal/auth/authgql"
	"github.com/twentyhq/twenty/packages/twenty-server-go/internal/golden"
	"github.com/twentyhq/twenty/packages/twenty-server-go/internal/pgtest"
)

const (
	workspaceID   = "20202020-1c25-4d02-bf25-6aeccf7ea419"
	applicationID = "20202020-0687-4c41-b707-ed1bfca972a7"

	adminID    = "a0000000-0000-4000-8000-000000000001"
	flaggedID  = "a0000000-0000-4000-8000-000000000002"
	memberID   = "a0000000-0000-4000-8000-000000000003"
	freshID    = "a0000000-0000-4000-8000-000000000004"
	pendingID  = "a0000000-0000-4000-8000-000000000005"
	outsiderID = "a0000000-0000-4000-8000-000000000006"

	memberMethodID  = "b0000000-0000-4000-8000-000000000003"
	adminMethodID   = "b0000000-0000-4000-8000-000000000001"
	pendingMethodID = "b0000000-0000-4000-8000-000000000005"

	totpSecret = "JBSWY3DPEHPK3PXP"
	validOTP   = "123456"
)

type fakeTOTP struct{ issuer, account string }

func (f fakeTOTP) Verify(secret, code string) bool { return secret == totpSecret && code == validOTP }

func (f fakeTOTP) Generate() (string, string, error) {
	return totpSecret, auth.OTPAuthURL(f.issuer, f.account, totpSecret), nil
}

func uwID(userID string) string { return "c" + userID[1:] }

func principalFor(userID string) auth.Principal {
	return auth.Principal{UserID: userID, WorkspaceID: workspaceID, UserWorkspaceID: uwID(userID)}
}

type harness struct {
	pool    *pgxpool.Pool
	cipher  *auth.SecretCipher
	service *auth.TwoFactor
	handler http.Handler
}

func newHarness(t *testing.T) *harness {
	t.Helper()
	pool, err := pgxpool.New(t.Context(), pgtest.New(t))
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(pool.Close)
	h := &harness{pool: pool, cipher: auth.NewSecretCipher("test-key", "", "")}
	h.service = auth.NewTwoFactor(pool, h.cipher, time.Hour)
	h.service.NewTOTP = func(issuer, account string) auth.TOTP { return fakeTOTP{issuer, account} }
	h.service.Throttle = allowAll{}
	h.handler = authgql.NewHandler(&authgql.Resolver{TwoFactor: h.service}, slog.New(slog.NewTextHandler(io.Discard, nil)))
	h.seed(t)
	return h
}

type allowAll struct{}

func (allowAll) Allow(string, int, time.Duration) bool { return true }

func (h *harness) exec(t *testing.T, sql string, args ...any) {
	t.Helper()
	if _, err := h.pool.Exec(t.Context(), sql, args...); err != nil {
		t.Fatalf("%s: %v", sql, err)
	}
}

func (h *harness) seed(t *testing.T) {
	t.Helper()
	tx, err := h.pool.Begin(t.Context())
	if err != nil {
		t.Fatal(err)
	}
	for _, statement := range []string{
		`INSERT INTO core.workspace (id, subdomain, "workspaceCustomApplicationId", "activationStatus", "displayName") VALUES ('` + workspaceID + `', 'acme', '` + applicationID + `', 'PENDING_CREATION', 'Acme')`,
		`INSERT INTO core.application (id, "universalIdentifier", name, "workspaceId") VALUES ('` + applicationID + `', gen_random_uuid(), 'custom', '` + workspaceID + `')`,
	} {
		if _, err := tx.Exec(t.Context(), statement); err != nil {
			t.Fatal(err)
		}
	}
	if err := tx.Commit(t.Context()); err != nil {
		t.Fatal(err)
	}
	for _, userID := range []string{adminID, flaggedID, memberID, freshID, pendingID, outsiderID} {
		h.exec(t, `INSERT INTO core."user" (id, email) VALUES ($1, $2)`, userID, userID[len(userID)-1:]+"@example.com")
		if userID != outsiderID {
			h.exec(t, `INSERT INTO core."userWorkspace" (id, "userId", "workspaceId") VALUES ($1, $2, $3)`, uwID(userID), userID, workspaceID)
		}
	}
	h.exec(t, `UPDATE core."user" SET email = 'fresh@example.com' WHERE id = $1`, freshID)

	h.method(t, adminMethodID, adminID, "VERIFIED")
	h.method(t, memberMethodID, memberID, "VERIFIED")
	h.method(t, pendingMethodID, pendingID, "PENDING")

	h.exec(t, `INSERT INTO core.role (id, label, "canUpdateAllSettings", "workspaceId", "universalIdentifier", "applicationId") VALUES ('d0000000-0000-4000-8000-000000000001', 'Admin', true, $1, gen_random_uuid(), $2)`, workspaceID, applicationID)
	h.exec(t, `INSERT INTO core.role (id, label, "workspaceId", "universalIdentifier", "applicationId") VALUES ('d0000000-0000-4000-8000-000000000002', 'Security', $1, gen_random_uuid(), $2)`, workspaceID, applicationID)
	h.exec(t, `INSERT INTO core."permissionFlag" (id, "workspaceId", "applicationId", "universalIdentifier", key, label, "permissionType") VALUES ('e0000000-0000-4000-8000-000000000001', $1, $2, gen_random_uuid(), 'SECURITY', 'Security', 'SETTINGS')`, workspaceID, applicationID)
	h.exec(t, `INSERT INTO core."rolePermissionFlag" ("roleId", "workspaceId", "universalIdentifier", "applicationId", "permissionFlagId") VALUES ('d0000000-0000-4000-8000-000000000002', $1, gen_random_uuid(), $2, 'e0000000-0000-4000-8000-000000000001')`, workspaceID, applicationID)
	for roleID, userID := range map[string]string{
		"d0000000-0000-4000-8000-000000000001": adminID,
		"d0000000-0000-4000-8000-000000000002": flaggedID,
	} {
		h.exec(t, `INSERT INTO core."roleTarget" ("workspaceId", "roleId", "userWorkspaceId", "universalIdentifier", "applicationId") VALUES ($1, $2, $3, gen_random_uuid(), $4)`, workspaceID, roleID, uwID(userID), applicationID)
	}
}

func (h *harness) method(t *testing.T, id, userID, status string) {
	t.Helper()
	secret, err := h.cipher.Encrypt(totpSecret, workspaceID)
	if err != nil {
		t.Fatal(err)
	}
	h.exec(t, `INSERT INTO core."twoFactorAuthenticationMethod" (id, "workspaceId", "userWorkspaceId", secret, status, strategy) VALUES ($1, $2, $3, $4, $5, 'TOTP')`,
		id, workspaceID, uwID(userID), secret, status)
}

func (h *harness) recoveryCode(t *testing.T, userID string, deleted bool) {
	t.Helper()
	deletedAt := "NULL"
	if deleted {
		deletedAt = "now()"
	}
	h.exec(t, `INSERT INTO core."appToken" ("userId", "workspaceId", type, value, "expiresAt", "deletedAt") VALUES ($1, $2, 'TWO_FACTOR_AUTHENTICATION_RECOVERY_CODE', 'hash', now() + interval '1 hour', `+deletedAt+`)`, userID, workspaceID)
}

func (h *harness) asPrincipal(principal auth.Principal) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		h.handler.ServeHTTP(w, r.WithContext(auth.WithPrincipal(r.Context(), principal)))
	})
}

func (h *harness) post(t *testing.T, principal auth.Principal, query string, variables map[string]any) map[string]any {
	t.Helper()
	body, err := json.Marshal(map[string]any{"query": query, "variables": variables})
	if err != nil {
		t.Fatal(err)
	}
	request := httptest.NewRequest(http.MethodPost, "/metadata", bytes.NewReader(body))
	request.Header.Set("Content-Type", "application/json")
	recorder := httptest.NewRecorder()
	h.asPrincipal(principal).ServeHTTP(recorder, request)
	var decoded map[string]any
	if err := json.Unmarshal(recorder.Body.Bytes(), &decoded); err != nil {
		t.Fatalf("decode %s: %v", recorder.Body.String(), err)
	}
	return decoded
}

func (h *harness) errorExtensions(t *testing.T, response map[string]any) map[string]any {
	t.Helper()
	errs, _ := response["errors"].([]any)
	if len(errs) != 1 {
		t.Fatalf("response = %v, want exactly one error", response)
	}
	extensions, _ := errs[0].(map[string]any)["extensions"].(map[string]any)
	return extensions
}

func (h *harness) count(t *testing.T, sql string, args ...any) int {
	t.Helper()
	var count int
	if err := h.pool.QueryRow(t.Context(), sql, args...).Scan(&count); err != nil {
		t.Fatal(err)
	}
	return count
}

func TestHandler_MatchesGolden(t *testing.T) {
	t.Parallel()
	tests := []struct {
		name      string
		principal auth.Principal
		setup     func(t *testing.T, h *harness)
		ignore    []string
	}{
		{name: "initiate-otp-provisioning-for-authenticated-user", principal: principalFor(freshID)},
		{name: "verify-two-factor-authentication-method", principal: principalFor(pendingID)},
		{name: "delete-two-factor-authentication-method", principal: principalFor(memberID)},
		{name: "two-factor-authentication-recovery-status", principal: principalFor(adminID)},
		{name: "generate-two-factor-authentication-recovery-code", principal: principalFor(adminID), ignore: []string{"data.generateTwoFactorAuthenticationRecoveryCode.recoveryCode", "data.generateTwoFactorAuthenticationRecoveryCode.expiresAt"}},
		{name: "revoke-two-factor-authentication-recovery-code", principal: principalFor(adminID), setup: func(t *testing.T, h *harness) { h.recoveryCode(t, memberID, false) }},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()
			h := newHarness(t)
			if tt.setup != nil {
				tt.setup(t, h)
			}
			golden.Assert(t, h.asPrincipal(tt.principal), "testdata/golden", tt.name, tt.ignore...)
		})
	}
}

func TestInitiateProvisioning(t *testing.T) {
	t.Parallel()
	const mutation = `mutation { initiateOTPProvisioningForAuthenticatedUser { uri } }`

	t.Run("stores a Node-readable encrypted pending secret", func(t *testing.T) {
		t.Parallel()
		h := newHarness(t)
		h.post(t, principalFor(freshID), mutation, nil)
		var stored, status string
		if err := h.pool.QueryRow(t.Context(), `SELECT secret, status::text FROM core."twoFactorAuthenticationMethod" WHERE "userWorkspaceId" = $1`, uwID(freshID)).Scan(&stored, &status); err != nil {
			t.Fatal(err)
		}
		plain, err := h.cipher.Decrypt(stored, workspaceID)
		if err != nil || plain != totpSecret || status != "PENDING" {
			t.Errorf("stored method = (%q, %q, %v), want the pending TOTP secret", plain, status, err)
		}
	})

	t.Run("reuses a recent pending secret", func(t *testing.T) {
		t.Parallel()
		h := newHarness(t)
		first := h.post(t, principalFor(pendingID), mutation, nil)
		second := h.post(t, principalFor(pendingID), mutation, nil)
		if diff := cmp.Diff(first, second); diff != "" {
			t.Errorf("repeat initiate differs (-first +second):\n%s", diff)
		}
		if got := h.count(t, `SELECT count(*) FROM core."twoFactorAuthenticationMethod" WHERE "userWorkspaceId" = $1 AND "createdAt" > now() - interval '1 minute'`, uwID(pendingID)); got != 1 {
			t.Errorf("pending method rows created just now = %d, want 1", got)
		}
	})

	t.Run("rejects an already verified method", func(t *testing.T) {
		t.Parallel()
		h := newHarness(t)
		extensions := h.errorExtensions(t, h.post(t, principalFor(memberID), mutation, nil))
		want := map[string]any{"code": "FORBIDDEN", "subCode": "TWO_FACTOR_AUTHENTICATION_METHOD_ALREADY_PROVISIONED", "userFriendlyMessage": "Two-factor authentication is already set up."}
		if diff := cmp.Diff(want, extensions); diff != "" {
			t.Errorf("extensions (-want +got):\n%s", diff)
		}
	})

	t.Run("refuses enrollment reserved by a redeemed recovery code", func(t *testing.T) {
		t.Parallel()
		h := newHarness(t)
		h.recoveryCode(t, freshID, true)
		extensions := h.errorExtensions(t, h.post(t, principalFor(freshID), mutation, nil))
		if extensions["subCode"] != "RECOVERY_ENROLLMENT_RESTRICTED" || extensions["code"] != "FORBIDDEN" {
			t.Errorf("extensions = %v, want FORBIDDEN RECOVERY_ENROLLMENT_RESTRICTED", extensions)
		}
	})

	t.Run("refuses api keys", func(t *testing.T) {
		t.Parallel()
		h := newHarness(t)
		extensions := h.errorExtensions(t, h.post(t, auth.Principal{WorkspaceID: workspaceID, APIKeyID: "key"}, mutation, nil))
		if extensions["code"] != "FORBIDDEN" {
			t.Errorf("extensions = %v, want FORBIDDEN", extensions)
		}
	})
}

func TestVerifyTwoFactorAuthenticationMethod(t *testing.T) {
	t.Parallel()
	const mutation = `mutation ($otp: String!) { verifyTwoFactorAuthenticationMethodForAuthenticatedUser(otp: $otp) { success } }`

	t.Run("marks the method verified and revokes every recovery code", func(t *testing.T) {
		t.Parallel()
		h := newHarness(t)
		h.recoveryCode(t, pendingID, true)
		h.post(t, principalFor(pendingID), mutation, map[string]any{"otp": validOTP})
		if got := h.count(t, `SELECT count(*) FROM core."twoFactorAuthenticationMethod" WHERE id = $1 AND status = 'VERIFIED'`, pendingMethodID); got != 1 {
			t.Errorf("verified methods = %d, want 1", got)
		}
		if got := h.count(t, `SELECT count(*) FROM core."appToken" WHERE "userId" = $1 AND "revokedAt" IS NULL`, pendingID); got != 0 {
			t.Errorf("unrevoked recovery codes = %d, want 0", got)
		}
	})

	t.Run("rejects a wrong code", func(t *testing.T) {
		t.Parallel()
		h := newHarness(t)
		extensions := h.errorExtensions(t, h.post(t, principalFor(pendingID), mutation, map[string]any{"otp": "000000"}))
		want := map[string]any{"code": "BAD_USER_INPUT", "subCode": "INVALID_OTP", "userFriendlyMessage": "Invalid verification code. Please try again."}
		if diff := cmp.Diff(want, extensions); diff != "" {
			t.Errorf("extensions (-want +got):\n%s", diff)
		}
		if got := h.count(t, `SELECT count(*) FROM core."twoFactorAuthenticationMethod" WHERE id = $1 AND status = 'PENDING'`, pendingMethodID); got != 1 {
			t.Error("a wrong code changed the method status")
		}
	})

	t.Run("rejects a code that is not six digits", func(t *testing.T) {
		t.Parallel()
		h := newHarness(t)
		extensions := h.errorExtensions(t, h.post(t, principalFor(pendingID), mutation, map[string]any{"otp": "12ab56"}))
		if extensions["code"] != "BAD_USER_INPUT" || extensions["subCode"] != "INVALID_INPUT" {
			t.Errorf("extensions = %v, want BAD_USER_INPUT INVALID_INPUT", extensions)
		}
	})

	t.Run("rejects a user without a method", func(t *testing.T) {
		t.Parallel()
		h := newHarness(t)
		extensions := h.errorExtensions(t, h.post(t, principalFor(freshID), mutation, map[string]any{"otp": validOTP}))
		if extensions["subCode"] != "INVALID_CONFIGURATION" || extensions["code"] != "FORBIDDEN" {
			t.Errorf("extensions = %v, want FORBIDDEN INVALID_CONFIGURATION", extensions)
		}
	})

	t.Run("rate limits attempts", func(t *testing.T) {
		t.Parallel()
		h := newHarness(t)
		h.service.Throttle = auth.NewMemoryThrottle()
		for range 10 {
			h.post(t, principalFor(pendingID), mutation, map[string]any{"otp": "000000"})
		}
		extensions := h.errorExtensions(t, h.post(t, principalFor(pendingID), mutation, map[string]any{"otp": validOTP}))
		if extensions["subCode"] != "LIMIT_REACHED" || extensions["code"] != "BAD_USER_INPUT" {
			t.Errorf("extensions = %v, want BAD_USER_INPUT LIMIT_REACHED", extensions)
		}
	})
}

func TestDeleteTwoFactorAuthenticationMethod(t *testing.T) {
	t.Parallel()
	const mutation = `mutation ($id: UUID!) { deleteTwoFactorAuthenticationMethod(twoFactorAuthenticationMethodId: $id) { success } }`

	t.Run("deletes the method and leaves recovery codes as Node does", func(t *testing.T) {
		t.Parallel()
		h := newHarness(t)
		h.recoveryCode(t, memberID, true)
		h.post(t, principalFor(memberID), mutation, map[string]any{"id": memberMethodID})
		if got := h.count(t, `SELECT count(*) FROM core."twoFactorAuthenticationMethod" WHERE id = $1`, memberMethodID); got != 0 {
			t.Errorf("methods left = %d, want 0", got)
		}
		if got := h.count(t, `SELECT count(*) FROM core."appToken" WHERE "userId" = $1 AND "revokedAt" IS NULL`, memberID); got != 1 {
			t.Errorf("unrevoked recovery codes = %d, want 1", got)
		}
	})

	t.Run("refuses someone else's method", func(t *testing.T) {
		t.Parallel()
		h := newHarness(t)
		extensions := h.errorExtensions(t, h.post(t, principalFor(freshID), mutation, map[string]any{"id": memberMethodID}))
		if extensions["subCode"] != "FORBIDDEN_EXCEPTION" || extensions["code"] != "FORBIDDEN" {
			t.Errorf("extensions = %v, want FORBIDDEN FORBIDDEN_EXCEPTION", extensions)
		}
		if got := h.count(t, `SELECT count(*) FROM core."twoFactorAuthenticationMethod" WHERE id = $1`, memberMethodID); got != 1 {
			t.Error("the method was deleted")
		}
	})

	t.Run("rejects an unknown or malformed id", func(t *testing.T) {
		t.Parallel()
		h := newHarness(t)
		for _, id := range []string{"b0000000-0000-4000-8000-0000000000ff", "not-a-uuid"} {
			extensions := h.errorExtensions(t, h.post(t, principalFor(memberID), mutation, map[string]any{"id": id}))
			if extensions["code"] != "BAD_USER_INPUT" {
				t.Errorf("id %q: extensions = %v, want BAD_USER_INPUT", id, extensions)
			}
		}
	})
}

func TestRecoveryCodes(t *testing.T) {
	t.Parallel()
	const (
		generate = `mutation ($userId: UUID!, $otp: String) { generateTwoFactorAuthenticationRecoveryCode(userId: $userId, otp: $otp) { recoveryCode expiresAt } }`
		revoke   = `mutation ($userId: UUID!) { revokeTwoFactorAuthenticationRecoveryCode(userId: $userId) }`
		status   = `query ($userId: UUID!) { twoFactorAuthenticationRecoveryStatus(userId: $userId) { hasVerifiedTwoFactorAuthenticationMethod isAwaitingRecoveryEnrollment pendingRecoveryCodeExpiresAt } }`
	)

	t.Run("generate stores a hashed code and replaces the previous one", func(t *testing.T) {
		t.Parallel()
		h := newHarness(t)
		h.recoveryCode(t, memberID, false)
		response := h.post(t, principalFor(adminID), generate, map[string]any{"userId": memberID, "otp": validOTP})
		code := response["data"].(map[string]any)["generateTwoFactorAuthenticationRecoveryCode"].(map[string]any)["recoveryCode"].(string)
		if len(code) != 23 {
			t.Errorf("recoveryCode = %q, want four groups of five", code)
		}
		if got := h.count(t, `SELECT count(*) FROM core."appToken" WHERE "userId" = $1 AND "revokedAt" IS NULL AND value <> 'hash' AND value <> $2`, memberID, code); got != 1 {
			t.Errorf("active hashed codes = %d, want 1 that is not the plaintext", got)
		}
		if got := h.count(t, `SELECT count(*) FROM core."appToken" WHERE "userId" = $1 AND "revokedAt" IS NOT NULL`, memberID); got != 1 {
			t.Errorf("revoked previous codes = %d, want 1", got)
		}
	})

	t.Run("generate errors", func(t *testing.T) {
		t.Parallel()
		tests := []struct {
			name      string
			principal auth.Principal
			variables map[string]any
			wantCode  string
			wantSub   string
		}{
			{"for yourself", principalFor(adminID), map[string]any{"userId": adminID, "otp": validOTP}, "FORBIDDEN", "RECOVERY_CODE_TARGET_NOT_ALLOWED"},
			{"without otp", principalFor(adminID), map[string]any{"userId": memberID}, "BAD_USER_INPUT", "STEP_UP_AUTHENTICATION_REQUIRED"},
			{"wrong otp", principalFor(adminID), map[string]any{"userId": memberID, "otp": "000000"}, "BAD_USER_INPUT", "INVALID_OTP"},
			{"without security permission", principalFor(memberID), map[string]any{"userId": adminID, "otp": validOTP}, "FORBIDDEN", "PERMISSION_DENIED"},
			{"target without a method", principalFor(adminID), map[string]any{"userId": freshID, "otp": validOTP}, "FORBIDDEN", "RECOVERY_CODE_TARGET_NOT_ALLOWED"},
			{"target outside the workspace", principalFor(adminID), map[string]any{"userId": outsiderID, "otp": validOTP}, "FORBIDDEN", "RECOVERY_CODE_TARGET_NOT_ALLOWED"},
		}
		for _, tt := range tests {
			t.Run(tt.name, func(t *testing.T) {
				t.Parallel()
				h := newHarness(t)
				extensions := h.errorExtensions(t, h.post(t, tt.principal, generate, tt.variables))
				if extensions["code"] != tt.wantCode || extensions["subCode"] != tt.wantSub {
					t.Errorf("extensions = %v, want %s %s", extensions, tt.wantCode, tt.wantSub)
				}
			})
		}
	})

	t.Run("a SECURITY permission flag grants access", func(t *testing.T) {
		t.Parallel()
		h := newHarness(t)
		response := h.post(t, principalFor(flaggedID), status, map[string]any{"userId": memberID})
		if _, failed := response["errors"]; failed {
			t.Errorf("flagged user was refused: %v", response)
		}
	})

	t.Run("status reports a pending code and a redeemed enrollment", func(t *testing.T) {
		t.Parallel()
		h := newHarness(t)
		h.recoveryCode(t, memberID, false)
		h.recoveryCode(t, freshID, true)
		pending := h.post(t, principalFor(adminID), status, map[string]any{"userId": memberID})["data"].(map[string]any)["twoFactorAuthenticationRecoveryStatus"].(map[string]any)
		if pending["pendingRecoveryCodeExpiresAt"] == nil || pending["isAwaitingRecoveryEnrollment"] != false {
			t.Errorf("member status = %v, want a pending expiry and no enrollment wait", pending)
		}
		awaiting := h.post(t, principalFor(adminID), status, map[string]any{"userId": freshID})["data"].(map[string]any)["twoFactorAuthenticationRecoveryStatus"].(map[string]any)
		if awaiting["isAwaitingRecoveryEnrollment"] != true || awaiting["hasVerifiedTwoFactorAuthenticationMethod"] != false {
			t.Errorf("fresh status = %v, want awaiting enrollment", awaiting)
		}
	})

	t.Run("revoke reports whether a code was revoked", func(t *testing.T) {
		t.Parallel()
		h := newHarness(t)
		got := h.post(t, principalFor(adminID), revoke, map[string]any{"userId": memberID})["data"].(map[string]any)["revokeTwoFactorAuthenticationRecoveryCode"]
		if got != false {
			t.Errorf("revoke with no code = %v, want false", got)
		}
	})
}
