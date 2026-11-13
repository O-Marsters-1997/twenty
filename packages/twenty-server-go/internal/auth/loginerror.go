package auth

import "errors"

type LoginError struct {
	Code            string
	SubCode         string
	Message         string
	FriendlyMessage string
}

func (e *LoginError) Error() string { return e.Message }

const defaultForbiddenMessage = "You do not have permission to perform this action."

var errInvitedJoinNotServed = errors.New("joining a workspace by invitation at login is not served by Go yet")

func userNotFound() error {
	return &LoginError{Code: "UNAUTHENTICATED", SubCode: "USER_NOT_FOUND", Message: "User not found", FriendlyMessage: "User not found."}
}

func workspaceNotFound() error {
	return &LoginError{Code: "UNAUTHENTICATED", SubCode: "WORKSPACE_NOT_FOUND", Message: "Workspace not found", FriendlyMessage: "Workspace not found."}
}

func wrongPassword() error {
	return &LoginError{Code: "FORBIDDEN", SubCode: "FORBIDDEN_EXCEPTION", Message: "Wrong password", FriendlyMessage: "Wrong password."}
}

func incorrectLoginMethod() error {
	return &LoginError{Code: "BAD_USER_INPUT", SubCode: "INVALID_INPUT", Message: "Incorrect login method", FriendlyMessage: "User was not created with email/password"}
}

func emailNotVerified() error {
	return &LoginError{Code: "FORBIDDEN", SubCode: "EMAIL_NOT_VERIFIED", Message: "Email is not verified", FriendlyMessage: "Email is not verified."}
}

func forbidden(message string) error {
	return &LoginError{Code: "FORBIDDEN", SubCode: "FORBIDDEN_EXCEPTION", Message: message, FriendlyMessage: defaultForbiddenMessage}
}
