package auth

import (
	"context"
	"errors"
	"fmt"
	"time"

	"github.com/golang-jwt/jwt/v5"
)

const TokenTypeFileUpload TokenType = "FILE_UPLOAD"

var ErrInvalidFileToken = errors.New("auth: invalid file token")

type FileClaims struct {
	WorkspaceID string
	FileID      string
}

type fileClaims struct {
	jwt.RegisteredClaims
	Type        string `json:"type"`
	WorkspaceID string `json:"workspaceId"`
	FileID      string `json:"fileId"`
}

func (i *PGIssuer) IssueUploadToken(ctx context.Context, workspaceID, fileID string, ttl time.Duration) (string, error) {
	token, err := i.sign(ctx, jwt.MapClaims{
		"workspaceId": workspaceID,
		"fileId":      fileID,
		"sub":         workspaceID,
		"type":        TokenTypeFileUpload,
	}, time.Now().Add(ttl))
	if err != nil {
		return "", fmt.Errorf("issue upload token: %w", err)
	}
	return token, nil
}

func (i *PGIssuer) VerifyFileToken(ctx context.Context, token string, wantType TokenType, ignoreExpiry bool) (FileClaims, error) {
	var parsed fileClaims
	err := i.parseSigned(ctx, token, &parsed, func() claims {
		return claims{Type: parsed.Type, WorkspaceID: parsed.WorkspaceID}
	})
	switch {
	case errors.Is(err, errKeyLookup):
		return FileClaims{}, fmt.Errorf("verify file token: %w", err)
	case err != nil && !(ignoreExpiry && errors.Is(err, jwt.ErrTokenExpired)):
		return FileClaims{}, ErrInvalidFileToken
	case parsed.Type != string(wantType), parsed.WorkspaceID == "", parsed.FileID == "":
		return FileClaims{}, ErrInvalidFileToken
	}
	return FileClaims{WorkspaceID: parsed.WorkspaceID, FileID: parsed.FileID}, nil
}
