package auth

import (
	"fmt"
	"time"
)

type TwoFactorError struct {
	Code            string
	SubCode         string
	Message         string
	FriendlyMessage string
}

func (e *TwoFactorError) Error() string { return e.Message }

type twoFactorErrorKind struct {
	code     string
	friendly string
}

var twoFactorErrorKinds = map[string]twoFactorErrorKind{
	"INVALID_OTP":                                          {"BAD_USER_INPUT", "Invalid verification code. Please try again."},
	"INVALID_CONFIGURATION":                                {"FORBIDDEN", "Invalid two-factor authentication configuration."},
	"STEP_UP_AUTHENTICATION_REQUIRED":                      {"BAD_USER_INPUT", "Enter your two-factor authentication code to continue."},
	"RECOVERY_CODE_TARGET_NOT_ALLOWED":                     {"FORBIDDEN", "You can't generate a recovery code for this member."},
	"RECOVERY_ENROLLMENT_RESTRICTED":                       {"FORBIDDEN", "Ask a workspace admin for a new recovery code to finish setting up two-factor authentication."},
	"RECOVERY_CODE_ISSUANCE_CONFLICT":                      {"CONFLICT", "Another recovery code was just generated for this member. Refresh the page to see it."},
	"TWO_FACTOR_AUTHENTICATION_METHOD_ALREADY_PROVISIONED": {"FORBIDDEN", "Two-factor authentication is already set up."},
	"INVALID_INPUT":                                        {"BAD_USER_INPUT", "Invalid input provided."},
	"FORBIDDEN_EXCEPTION":                                  {"FORBIDDEN", "You do not have permission to perform this action."},
	"PERMISSION_DENIED":                                    {"FORBIDDEN", "User does not have permission."},
	"UNAUTHENTICATED":                                      {"UNAUTHENTICATED", "You must be authenticated to perform this action."},
	"WORKSPACE_NOT_FOUND":                                  {"UNAUTHENTICATED", "Workspace not found."},
	"USER_NOT_FOUND":                                       {"UNAUTHENTICATED", "User not found."},
	"USER_WORKSPACE_NOT_FOUND":                             {"UNAUTHENTICATED", "User workspace not found."},
	"EMAIL_NOT_VERIFIED":                                   {"FORBIDDEN", "Email is not verified."},
	"TWO_FACTOR_AUTHENTICATION_VERIFICATION_REQUIRED":      {"FORBIDDEN", "Two factor authentication verification required."},
	"TWO_FACTOR_AUTHENTICATION_PROVISION_REQUIRED":         {"FORBIDDEN", "Two factor authentication setup required."},
	"LIMIT_REACHED":                                        {"BAD_USER_INPUT", "Rate limit reached. Please try again later."},
}

func newTwoFactorError(subCode, message string, friendly ...string) *TwoFactorError {
	kind := twoFactorErrorKinds[subCode]
	err := &TwoFactorError{Code: kind.code, SubCode: subCode, Message: message, FriendlyMessage: kind.friendly}
	if len(friendly) > 0 {
		err.FriendlyMessage = friendly[0]
	}
	return err
}

func methodNotFound() error {
	return newTwoFactorError("INVALID_CONFIGURATION", "Two Factor Authentication Method not found.")
}

func limitReached(limit int, window time.Duration) error {
	return newTwoFactorError("LIMIT_REACHED", fmt.Sprintf("Limit reached (%d tokens per %d ms)", limit, window.Milliseconds()))
}
