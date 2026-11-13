package auth

import (
	"context"
	"crypto/rand"
	"crypto/sha256"
	"encoding/hex"
	"errors"
	"fmt"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgconn"
	"github.com/jackc/pgx/v5/pgxpool"
)

const (
	otpRateLimit             = 10
	otpRateWindow            = 15 * time.Minute
	issuanceRateLimit        = 10
	issuanceRateWindow       = time.Hour
	pendingMethodReuseWindow = time.Hour

	recoveryCodeTokenType = "TWO_FACTOR_AUTHENTICATION_RECOVERY_CODE"
	recoveryCodeAlphabet  = "0123456789ABCDEFGHJKMNPQRSTVWXYZ"
	recoveryCodeLength    = 20
	recoveryCodeGroupSize = 5
	uniqueViolation       = "23505"
)

type TwoFactor struct {
	Throttle Throttle
	NewTOTP  func(issuer, account string) TOTP

	pool        *pgxpool.Pool
	cipher      *SecretCipher
	recoveryTTL time.Duration
}

func NewTwoFactor(pool *pgxpool.Pool, cipher *SecretCipher, recoveryTTL time.Duration) *TwoFactor {
	return &TwoFactor{Throttle: NewMemoryThrottle(), NewTOTP: NewTOTP, pool: pool, cipher: cipher, recoveryTTL: recoveryTTL}
}

type RecoveryStatus struct {
	HasVerifiedMethod         bool
	IsAwaitingRecoveryEnroll  bool
	PendingRecoveryCodeExpiry *time.Time
}

type RecoveryCode struct {
	Code      string
	ExpiresAt time.Time
}

type querier interface {
	QueryRow(ctx context.Context, sql string, args ...any) pgx.Row
	Exec(ctx context.Context, sql string, args ...any) (pgconn.CommandTag, error)
}

type userWorkspaceRow struct {
	ID        string
	CreatedAt time.Time
}

var errUserWorkspaceMissing = errors.New("user workspace not found")

func (s *TwoFactor) InitiateProvisioning(ctx context.Context, principal Principal) (string, error) {
	if err := requireUserSession(principal); err != nil {
		return "", err
	}
	var email, displayName string
	if err := s.pool.QueryRow(ctx,
		`SELECT u.email::text, COALESCE(w."displayName", '') FROM core."user" u, core.workspace w WHERE u.id = $1::uuid AND w.id = $2::uuid`,
		principal.UserID, principal.WorkspaceID,
	).Scan(&email, &displayName); err != nil {
		return "", fmt.Errorf("look up provisioning subject: %w", err)
	}
	if err := s.assertEnrollmentNotReserved(ctx, principal.UserID, principal.WorkspaceID); err != nil {
		return "", err
	}
	uri, err := s.initiateStrategyConfiguration(ctx, principal, email, displayName)
	if err != nil {
		return "", err
	}
	if err := s.assertEnrollmentNotReserved(ctx, principal.UserID, principal.WorkspaceID); err != nil {
		return "", err
	}
	return uri, nil
}

func (s *TwoFactor) initiateStrategyConfiguration(ctx context.Context, principal Principal, email, displayName string) (string, error) {
	userWorkspace, found, err := s.userWorkspace(ctx, s.pool, principal.UserID, principal.WorkspaceID)
	if err != nil {
		return "", err
	}
	if !found {
		return "", errUserWorkspaceMissing
	}
	issuer := "Twenty"
	if displayName != "" {
		issuer += " - " + displayName
	}

	var status, storedSecret string
	var createdAt time.Time
	err = s.pool.QueryRow(ctx,
		`SELECT status::text, secret, "createdAt" FROM core."twoFactorAuthenticationMethod"
		 WHERE "workspaceId" = $1::uuid AND "userWorkspaceId" = $2::uuid AND strategy = 'TOTP'`,
		principal.WorkspaceID, userWorkspace.ID,
	).Scan(&status, &storedSecret, &createdAt)
	exists := !errors.Is(err, pgx.ErrNoRows)
	if err != nil && exists {
		return "", fmt.Errorf("look up pending method: %w", err)
	}
	if exists && status != "PENDING" {
		return "", newTwoFactorError("TWO_FACTOR_AUTHENTICATION_METHOD_ALREADY_PROVISIONED",
			"A two factor authentication method has already been set. Please delete it and try again.")
	}
	if exists && time.Since(createdAt) < pendingMethodReuseWindow {
		secret, err := s.cipher.Decrypt(storedSecret, principal.WorkspaceID)
		if err != nil {
			return "", err
		}
		return OTPAuthURL(issuer, email, secret), nil
	}

	secret, uri, err := s.NewTOTP(issuer, email).Generate()
	if err != nil {
		return "", err
	}
	encrypted, err := s.cipher.Encrypt(secret, principal.WorkspaceID)
	if err != nil {
		return "", err
	}
	if _, err := s.pool.Exec(ctx,
		`INSERT INTO core."twoFactorAuthenticationMethod" ("workspaceId", "userWorkspaceId", secret, status, strategy)
		 VALUES ($1::uuid, $2::uuid, $3, 'PENDING', 'TOTP')
		 ON CONFLICT ("userWorkspaceId", strategy) DO UPDATE SET secret = EXCLUDED.secret, status = EXCLUDED.status, "updatedAt" = now()`,
		principal.WorkspaceID, userWorkspace.ID, encrypted,
	); err != nil {
		return "", fmt.Errorf("store pending method: %w", err)
	}
	return uri, nil
}

func (s *TwoFactor) VerifyOTP(ctx context.Context, principal Principal, otp string) error {
	if err := requireUserSession(principal); err != nil {
		return err
	}
	if len(otp) != 6 || strings.Trim(otp, "0123456789") != "" {
		return newTwoFactorError("INVALID_INPUT", "OTP must be exactly 6 digits")
	}
	return s.validateOTP(ctx, principal.UserID, principal.WorkspaceID, otp)
}

func (s *TwoFactor) validateOTP(ctx context.Context, userID, workspaceID, otp string) error {
	if !s.Throttle.Allow("two-factor-authentication-otp:"+userID+":"+workspaceID, otpRateLimit, otpRateWindow) {
		return limitReached(otpRateLimit, otpRateWindow)
	}
	var methodID, storedSecret string
	err := s.pool.QueryRow(ctx,
		`SELECT m.id::text, m.secret FROM core."twoFactorAuthenticationMethod" m
		 JOIN core."userWorkspace" uw ON uw.id = m."userWorkspaceId"
		 WHERE m.strategy = 'TOTP' AND uw."userId" = $1::uuid AND uw."workspaceId" = $2::uuid AND m."workspaceId" = $2::uuid`,
		userID, workspaceID,
	).Scan(&methodID, &storedSecret)
	if errors.Is(err, pgx.ErrNoRows) {
		return methodNotFound()
	}
	if err != nil {
		return fmt.Errorf("look up two-factor method: %w", err)
	}
	secret, err := s.cipher.Decrypt(storedSecret, workspaceID)
	if err != nil {
		return err
	}
	if !s.NewTOTP("", "").Verify(secret, otp) {
		return newTwoFactorError("INVALID_OTP", "Invalid OTP")
	}
	return pgx.BeginFunc(ctx, s.pool, func(tx pgx.Tx) error {
		if _, err := tx.Exec(ctx, `SELECT pg_advisory_xact_lock(hashtextextended($1, 0))`, "user-authentication:"+userID); err != nil {
			return fmt.Errorf("lock user authentication: %w", err)
		}
		updated, err := tx.Exec(ctx,
			`UPDATE core."twoFactorAuthenticationMethod" SET status = 'VERIFIED', "updatedAt" = now()
			 WHERE id = $1::uuid AND "workspaceId" = $2::uuid AND secret = $3`,
			methodID, workspaceID, storedSecret)
		if err != nil {
			return fmt.Errorf("verify two-factor method: %w", err)
		}
		if updated.RowsAffected() == 0 {
			return methodNotFound()
		}
		_, err = revokeRecoveryCodes(ctx, tx, workspaceID, userID, true)
		return err
	})
}

func (s *TwoFactor) DeleteMethod(ctx context.Context, principal Principal, methodID string) error {
	if err := requireUserSession(principal); err != nil {
		return err
	}
	if _, err := uuid.Parse(methodID); err != nil {
		return newTwoFactorError("INVALID_INPUT", "twoFactorAuthenticationMethodId must be a UUID")
	}
	var ownerID string
	err := s.pool.QueryRow(ctx,
		`SELECT uw."userId"::text FROM core."twoFactorAuthenticationMethod" m
		 JOIN core."userWorkspace" uw ON uw.id = m."userWorkspaceId"
		 WHERE m.id = $1::uuid AND m."workspaceId" = $2::uuid`,
		methodID, principal.WorkspaceID,
	).Scan(&ownerID)
	if errors.Is(err, pgx.ErrNoRows) {
		return newTwoFactorError("INVALID_INPUT", "Two-factor authentication method not found")
	}
	if err != nil {
		return fmt.Errorf("look up two-factor method: %w", err)
	}
	if ownerID != principal.UserID {
		return newTwoFactorError("FORBIDDEN_EXCEPTION", "You can only delete your own two-factor authentication methods")
	}
	if _, err := s.pool.Exec(ctx,
		`DELETE FROM core."twoFactorAuthenticationMethod" WHERE id = $1::uuid AND "workspaceId" = $2::uuid`,
		methodID, principal.WorkspaceID,
	); err != nil {
		return fmt.Errorf("delete two-factor method: %w", err)
	}
	return nil
}

func (s *TwoFactor) RecoveryStatus(ctx context.Context, principal Principal, targetUserID string) (RecoveryStatus, error) {
	if err := s.requireSecurityAdmin(ctx, principal, targetUserID); err != nil {
		return RecoveryStatus{}, err
	}
	target, err := s.targetUserWorkspace(ctx, principal.WorkspaceID, targetUserID)
	if err != nil {
		return RecoveryStatus{}, err
	}
	verified, err := s.hasVerifiedMethod(ctx, principal.WorkspaceID, target.ID)
	if err != nil {
		return RecoveryStatus{}, err
	}
	status := RecoveryStatus{HasVerifiedMethod: verified}
	if !verified {
		status.IsAwaitingRecoveryEnroll, err = s.isAwaitingRecoveryEnrollment(ctx, principal.WorkspaceID, targetUserID, target)
		if err != nil {
			return RecoveryStatus{}, err
		}
	}
	var expiresAt time.Time
	err = s.pool.QueryRow(ctx,
		`SELECT "expiresAt" FROM core."appToken"
		 WHERE "userId" = $1::uuid AND "workspaceId" = $2::uuid AND type = $3
		   AND "deletedAt" IS NULL AND "revokedAt" IS NULL AND "expiresAt" > now() LIMIT 1`,
		targetUserID, principal.WorkspaceID, recoveryCodeTokenType,
	).Scan(&expiresAt)
	switch {
	case err == nil:
		status.PendingRecoveryCodeExpiry = &expiresAt
	case !errors.Is(err, pgx.ErrNoRows):
		return RecoveryStatus{}, fmt.Errorf("look up pending recovery code: %w", err)
	}
	return status, nil
}

func (s *TwoFactor) GenerateRecoveryCode(ctx context.Context, principal Principal, targetUserID, otp string) (RecoveryCode, error) {
	if err := s.requireSecurityAdmin(ctx, principal, targetUserID); err != nil {
		return RecoveryCode{}, err
	}
	if !s.Throttle.Allow("two-factor-authentication-recovery-code-issuance:"+principal.UserID, issuanceRateLimit, issuanceRateWindow) {
		return RecoveryCode{}, limitReached(issuanceRateLimit, issuanceRateWindow)
	}
	if principal.UserID == targetUserID {
		return RecoveryCode{}, newTwoFactorError("RECOVERY_CODE_TARGET_NOT_ALLOWED",
			"A recovery code cannot be generated for yourself",
			"You can't generate a recovery code for yourself. Reset two-factor authentication from your profile instead.")
	}
	if err := s.assertFreshStepUp(ctx, principal, otp); err != nil {
		return RecoveryCode{}, err
	}
	target, err := s.targetUserWorkspace(ctx, principal.WorkspaceID, targetUserID)
	if err != nil {
		return RecoveryCode{}, err
	}
	verified, err := s.hasVerifiedMethod(ctx, principal.WorkspaceID, target.ID)
	if err != nil {
		return RecoveryCode{}, err
	}
	recoverable := verified
	if !recoverable {
		recoverable, err = s.isAwaitingRecoveryEnrollment(ctx, principal.WorkspaceID, targetUserID, target)
		if err != nil {
			return RecoveryCode{}, err
		}
	}
	if !recoverable {
		return RecoveryCode{}, newTwoFactorError("RECOVERY_CODE_TARGET_NOT_ALLOWED",
			"The member has no verified two-factor authentication method",
			"This member hasn't set up two-factor authentication, so there is nothing to recover.")
	}
	if _, err := revokeRecoveryCodes(ctx, s.pool, principal.WorkspaceID, targetUserID, false); err != nil {
		return RecoveryCode{}, err
	}

	code, err := newRecoveryCode()
	if err != nil {
		return RecoveryCode{}, err
	}
	expiresAt := time.Now().Add(s.recoveryTTL)
	_, err = s.pool.Exec(ctx,
		`INSERT INTO core."appToken" ("userId", "workspaceId", type, value, "expiresAt", context)
		 VALUES ($1::uuid, $2::uuid, $3, $4, $5, jsonb_build_object('issuedByUserId', $6::text))`,
		targetUserID, principal.WorkspaceID, recoveryCodeTokenType, hashRecoveryCode(code), expiresAt, principal.UserID)
	var pgErr *pgconn.PgError
	switch {
	case errors.As(err, &pgErr) && pgErr.Code == uniqueViolation:
		return RecoveryCode{}, newTwoFactorError("RECOVERY_CODE_ISSUANCE_CONFLICT", "A recovery code was issued concurrently for this member")
	case err != nil:
		return RecoveryCode{}, fmt.Errorf("store recovery code: %w", err)
	}
	return RecoveryCode{Code: code, ExpiresAt: expiresAt}, nil
}

func (s *TwoFactor) RevokeRecoveryCode(ctx context.Context, principal Principal, targetUserID string) (bool, error) {
	if err := s.requireSecurityAdmin(ctx, principal, targetUserID); err != nil {
		return false, err
	}
	if _, err := s.targetUserWorkspace(ctx, principal.WorkspaceID, targetUserID); err != nil {
		return false, err
	}
	revoked, err := revokeRecoveryCodes(ctx, s.pool, principal.WorkspaceID, targetUserID, false)
	return revoked > 0, err
}

func (s *TwoFactor) assertFreshStepUp(ctx context.Context, principal Principal, otp string) error {
	if otp == "" {
		return newTwoFactorError("STEP_UP_AUTHENTICATION_REQUIRED",
			"A two-factor authentication code is required for this action",
			"Enter your two-factor authentication code to generate a recovery code.")
	}
	var hasVerified bool
	if err := s.pool.QueryRow(ctx,
		`SELECT EXISTS (SELECT 1 FROM core."twoFactorAuthenticationMethod" m JOIN core."userWorkspace" uw ON uw.id = m."userWorkspaceId"
		 WHERE m."workspaceId" = $1::uuid AND uw."userId" = $2::uuid AND m.status = 'VERIFIED')`,
		principal.WorkspaceID, principal.UserID,
	).Scan(&hasVerified); err != nil {
		return fmt.Errorf("look up step-up method: %w", err)
	}
	if !hasVerified {
		return newTwoFactorError("STEP_UP_AUTHENTICATION_REQUIRED",
			"Two-factor authentication must be enabled in the current workspace for this action",
			"Set up two-factor authentication on your own account before generating a recovery code.")
	}
	return s.validateOTP(ctx, principal.UserID, principal.WorkspaceID, otp)
}

func (s *TwoFactor) assertEnrollmentNotReserved(ctx context.Context, userID, workspaceID string) error {
	userWorkspace, found, err := s.userWorkspace(ctx, s.pool, userID, workspaceID)
	if err != nil || !found {
		return err
	}
	verified, err := s.hasVerifiedMethod(ctx, workspaceID, userWorkspace.ID)
	if err != nil || verified {
		return err
	}
	awaiting, err := s.isAwaitingRecoveryEnrollment(ctx, workspaceID, userID, userWorkspace)
	if err != nil {
		return err
	}
	if awaiting {
		return newTwoFactorError("RECOVERY_ENROLLMENT_RESTRICTED",
			"Enrollment after a recovery must use the authenticator issued with the recovery code")
	}
	return nil
}

func (s *TwoFactor) userWorkspace(ctx context.Context, db querier, userID, workspaceID string) (userWorkspaceRow, bool, error) {
	var row userWorkspaceRow
	err := db.QueryRow(ctx,
		`SELECT id::text, "createdAt" FROM core."userWorkspace"
		 WHERE "userId" = $1::uuid AND "workspaceId" = $2::uuid AND "deletedAt" IS NULL`,
		userID, workspaceID,
	).Scan(&row.ID, &row.CreatedAt)
	if errors.Is(err, pgx.ErrNoRows) {
		return userWorkspaceRow{}, false, nil
	}
	if err != nil {
		return userWorkspaceRow{}, false, fmt.Errorf("look up user workspace: %w", err)
	}
	return row, true, nil
}

func (s *TwoFactor) targetUserWorkspace(ctx context.Context, workspaceID, targetUserID string) (userWorkspaceRow, error) {
	row, found, err := s.userWorkspace(ctx, s.pool, targetUserID, workspaceID)
	if err != nil {
		return userWorkspaceRow{}, err
	}
	if !found {
		return userWorkspaceRow{}, newTwoFactorError("RECOVERY_CODE_TARGET_NOT_ALLOWED",
			"The user is not a member of this workspace", "This user is not a member of the workspace.")
	}
	return row, nil
}

func (s *TwoFactor) hasVerifiedMethod(ctx context.Context, workspaceID, userWorkspaceID string) (bool, error) {
	var verified bool
	if err := s.pool.QueryRow(ctx,
		`SELECT EXISTS (SELECT 1 FROM core."twoFactorAuthenticationMethod"
		 WHERE "workspaceId" = $1::uuid AND "userWorkspaceId" = $2::uuid AND status = 'VERIFIED')`,
		workspaceID, userWorkspaceID,
	).Scan(&verified); err != nil {
		return false, fmt.Errorf("look up verified method: %w", err)
	}
	return verified, nil
}

func (s *TwoFactor) isAwaitingRecoveryEnrollment(ctx context.Context, workspaceID, userID string, userWorkspace userWorkspaceRow) (bool, error) {
	var awaiting bool
	if err := s.pool.QueryRow(ctx,
		`SELECT EXISTS (SELECT 1 FROM core."appToken"
		 WHERE "userId" = $1::uuid AND "workspaceId" = $2::uuid AND type = $3
		   AND "deletedAt" IS NOT NULL AND "revokedAt" IS NULL AND "createdAt" >= $4)`,
		userID, workspaceID, recoveryCodeTokenType, userWorkspace.CreatedAt,
	).Scan(&awaiting); err != nil {
		return false, fmt.Errorf("look up recovery enrollment: %w", err)
	}
	return awaiting, nil
}

func (s *TwoFactor) requireSecurityAdmin(ctx context.Context, principal Principal, targetUserID string) error {
	if err := requireUserSession(principal); err != nil {
		return err
	}
	if _, err := uuid.Parse(targetUserID); err != nil {
		return newTwoFactorError("INVALID_INPUT", "userId must be a UUID")
	}
	var granted bool
	if err := s.pool.QueryRow(ctx,
		`SELECT COALESCE(bool_and(r."canUpdateAllSettings" OR EXISTS (
		     SELECT 1 FROM core."rolePermissionFlag" rpf JOIN core."permissionFlag" pf ON pf.id = rpf."permissionFlagId"
		     WHERE rpf."roleId" = r.id AND pf.key = 'SECURITY')), false)
		 FROM core."roleTarget" rt JOIN core.role r ON r.id = rt."roleId"
		 WHERE rt."userWorkspaceId" = NULLIF($1, '')::uuid AND rt."workspaceId" = $2::uuid`,
		principal.UserWorkspaceID, principal.WorkspaceID,
	).Scan(&granted); err != nil {
		return fmt.Errorf("look up security permission: %w", err)
	}
	if !granted {
		return newTwoFactorError("PERMISSION_DENIED", "Entity performing the request does not have permission")
	}
	return nil
}

func requireUserSession(principal Principal) error {
	if principal.UserID == "" || principal.WorkspaceID == "" || principal.APIKeyID != "" {
		return newTwoFactorError("FORBIDDEN_EXCEPTION", "Forbidden resource")
	}
	return nil
}

func revokeRecoveryCodes(ctx context.Context, db querier, workspaceID, userID string, includeRedeemed bool) (int64, error) {
	result, err := db.Exec(ctx,
		`UPDATE core."appToken" SET "revokedAt" = now(), "updatedAt" = now()
		 WHERE "workspaceId" = $1::uuid AND "userId" = $2::uuid AND type = $3 AND "revokedAt" IS NULL
		   AND ($4 OR "deletedAt" IS NULL)`,
		workspaceID, userID, recoveryCodeTokenType, includeRedeemed)
	if err != nil {
		return 0, fmt.Errorf("revoke recovery codes: %w", err)
	}
	return result.RowsAffected(), nil
}

func newRecoveryCode() (string, error) {
	random := make([]byte, recoveryCodeLength)
	if _, err := rand.Read(random); err != nil {
		return "", fmt.Errorf("generate recovery code: %w", err)
	}
	var code strings.Builder
	for i, value := range random {
		if i > 0 && i%recoveryCodeGroupSize == 0 {
			code.WriteByte('-')
		}
		code.WriteByte(recoveryCodeAlphabet[int(value)%len(recoveryCodeAlphabet)])
	}
	return code.String(), nil
}

func hashRecoveryCode(code string) string {
	var normalized strings.Builder
	for _, character := range strings.ToUpper(code) {
		if character >= '0' && character <= '9' || character >= 'A' && character <= 'Z' {
			normalized.WriteRune(character)
		}
	}
	sum := sha256.Sum256([]byte(normalized.String()))
	return hex.EncodeToString(sum[:])
}
