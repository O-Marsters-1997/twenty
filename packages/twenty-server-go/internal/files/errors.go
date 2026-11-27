package files

import "net/http"

type Error struct {
	Code     string
	SubCode  string
	Message  string
	Friendly string
}

func (e *Error) Error() string { return e.Message }

const (
	CodeNotFound   = "NOT_FOUND"
	CodeUserInput  = "BAD_USER_INPUT"
	CodeForbidden  = "FORBIDDEN"
	subBadRequest  = "BAD_REQUEST"
	subNotFound    = "FILE_NOT_FOUND"
	subNotUploaded = "FILE_NOT_UPLOADED"
	subMismatch    = "FILE_SIZE_MISMATCH"
	subTooLarge    = "FILE_TOO_LARGE"
)

func badRequest(message, friendly string) *Error {
	return &Error{Code: CodeUserInput, SubCode: subBadRequest, Message: message, Friendly: friendly}
}

func tooLarge(message, friendly string) *Error {
	return &Error{Code: CodeUserInput, SubCode: subTooLarge, Message: message, Friendly: friendly}
}

func notFound(message string) *Error {
	return &Error{Code: CodeNotFound, SubCode: subNotFound, Message: message, Friendly: "File not found."}
}

func notUploaded(path string) *Error {
	return &Error{
		Code: CodeUserInput, SubCode: subNotUploaded, Message: "File \"" + path + "\" has not been uploaded to storage yet.",
		Friendly: "The file has not been uploaded yet. Please upload it before confirming.",
	}
}

func sizeMismatch(message string) *Error {
	return &Error{
		Code: CodeUserInput, SubCode: subMismatch, Message: message,
		Friendly: "The uploaded file does not match the declared size. Please retry the upload.",
	}
}

func permissionDenied(friendly string) *Error {
	return &Error{Code: CodeForbidden, SubCode: "PERMISSION_DENIED", Message: "Permission denied", Friendly: friendly}
}

func (e *Error) httpStatus() int {
	switch {
	case e.Code == CodeNotFound:
		return http.StatusNotFound
	case e.SubCode == subTooLarge:
		return http.StatusRequestEntityTooLarge
	case e.Code == CodeUserInput:
		return http.StatusBadRequest
	case e.Code == CodeForbidden:
		return http.StatusForbidden
	}
	return http.StatusInternalServerError
}
