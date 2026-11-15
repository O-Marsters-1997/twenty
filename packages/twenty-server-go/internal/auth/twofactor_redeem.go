package auth

import (
	"context"
	"fmt"
	"time"

	"github.com/jackc/pgx/v5"
)

const (
	redemptionRateLimit  = 5
	redemptionRateWindow = 15 * time.Minute

	sessionRevokedTwoFactorReset = "TWO_FACTOR_AUTHENTICATION_RESET"
)

func (s *TwoFactor) RedeemRecoveryCode(ctx context.Context, userID, email, workspaceID, code string) (string, error) {
	userWorkspace, err := s.targetUserWorkspace(ctx, workspaceID, userID)
	if err != nil {
		return "", err
	}
	if !s.Throttle.Allow("two-factor-authentication-recovery-code:"+userWorkspace.ID, redemptionRateLimit, redemptionRateWindow) {
		return "", limitReached(redemptionRateLimit, redemptionRateWindow)
	}
	var displayName string
	var enforced bool
	if err := s.pool.QueryRow(ctx,
		`SELECT COALESCE("displayName", ''), "isTwoFactorAuthenticationEnforced" FROM core.workspace WHERE id = $1::uuid`, workspaceID,
	).Scan(&displayName, &enforced); err != nil {
		return "", fmt.Errorf("look up workspace: %w", err)
	}

	var provisioningURI string
	err = pgx.BeginFunc(ctx, s.pool, func(tx pgx.Tx) error {
		if _, err := tx.Exec(ctx, `SELECT pg_advisory_xact_lock(hashtextextended($1, 0))`, "user-authentication:"+userID); err != nil {
			return fmt.Errorf("lock user authentication: %w", err)
		}
		consumed, err := tx.Exec(ctx,
			`UPDATE core."appToken" SET "deletedAt" = now(), "revokedAt" = CASE WHEN $5 THEN "revokedAt" ELSE now() END, "updatedAt" = now()
			 WHERE "userId" = $1::uuid AND "workspaceId" = $2::uuid AND type = $3 AND value = $4
			   AND "deletedAt" IS NULL AND "revokedAt" IS NULL AND "expiresAt" > now() AND "createdAt" >= $6`,
			userID, workspaceID, recoveryCodeTokenType, hashRecoveryCode(code), enforced, userWorkspace.CreatedAt)
		if err != nil {
			return fmt.Errorf("consume recovery code: %w", err)
		}
		if consumed.RowsAffected() == 0 {
			return newTwoFactorError("INVALID_RECOVERY_CODE", "Invalid recovery code")
		}
		if _, err := tx.Exec(ctx,
			`DELETE FROM core."twoFactorAuthenticationMethod" WHERE "workspaceId" = $1::uuid AND "userWorkspaceId" = $2::uuid`,
			workspaceID, userWorkspace.ID,
		); err != nil {
			return fmt.Errorf("delete two-factor method: %w", err)
		}
		if _, err := tx.Exec(ctx,
			`UPDATE core."appToken"
			 SET "revokedAt" = COALESCE("revokedAt", now()),
			     context = COALESCE(context, '{}'::jsonb) || jsonb_build_object('revokedReason', $4::text)
			 WHERE "userId" = $1::uuid AND "workspaceId" = $2::uuid AND type = $3 AND "expiresAt" > now()`,
			userID, workspaceID, refreshAppTokenType, sessionRevokedTwoFactorReset,
		); err != nil {
			return fmt.Errorf("revoke refresh tokens: %w", err)
		}
		if !enforced {
			return nil
		}
		issuer := "Twenty"
		if displayName != "" {
			issuer += " - " + displayName
		}
		secret, uri, err := s.NewTOTP(issuer, email).Generate()
		if err != nil {
			return fmt.Errorf("generate authenticator secret: %w", err)
		}
		encrypted, err := s.cipher.Encrypt(secret, workspaceID)
		if err != nil {
			return fmt.Errorf("encrypt authenticator secret: %w", err)
		}
		if _, err := tx.Exec(ctx,
			`INSERT INTO core."twoFactorAuthenticationMethod" ("workspaceId", "userWorkspaceId", secret, status, strategy)
			 VALUES ($1::uuid, $2::uuid, $3, 'PENDING', 'TOTP')`,
			workspaceID, userWorkspace.ID, encrypted,
		); err != nil {
			return fmt.Errorf("store pending method: %w", err)
		}
		provisioningURI = uri
		return nil
	})
	return provisioningURI, err
}
