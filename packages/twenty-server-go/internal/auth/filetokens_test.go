package auth_test

import (
	"errors"
	"testing"
	"time"

	"github.com/twentyhq/twenty/packages/twenty-server-go/internal/auth"
)

const fileID = "55555555-5555-4555-8555-555555555555"

func TestVerifyFileToken(t *testing.T) {
	t.Parallel()
	env := newTokenEnv(t)
	issueFile := func(ttl time.Duration) string {
		token, err := env.issuer.IssueFileToken(t.Context(), env.node.WorkspaceID, fileID, ttl)
		if err != nil {
			t.Fatal(err)
		}
		return token
	}
	upload, err := env.issuer.IssueUploadToken(t.Context(), env.node.WorkspaceID, fileID, time.Hour)
	if err != nil {
		t.Fatal(err)
	}

	tests := []struct {
		name         string
		token        string
		wantType     auth.TokenType
		ignoreExpiry bool
		wantErr      error
	}{
		{name: "file token", token: issueFile(time.Hour), wantType: auth.TokenTypeFile},
		{name: "upload token", token: upload, wantType: auth.TokenTypeFileUpload},
		{name: "upload token presented as file token", token: upload, wantType: auth.TokenTypeFile, wantErr: auth.ErrInvalidFileToken},
		{name: "file token presented as upload token", token: issueFile(time.Hour), wantType: auth.TokenTypeFileUpload, wantErr: auth.ErrInvalidFileToken},
		{name: "expired", token: issueFile(-time.Hour), wantType: auth.TokenTypeFile, wantErr: auth.ErrInvalidFileToken},
		{name: "expired but expiry ignored", token: issueFile(-time.Hour), wantType: auth.TokenTypeFile, ignoreExpiry: true},
		{name: "access token", token: env.node.Access, wantType: auth.TokenTypeFile, wantErr: auth.ErrInvalidFileToken},
		{name: "garbage", token: "not-a-token", wantType: auth.TokenTypeFile, wantErr: auth.ErrInvalidFileToken},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got, err := env.issuer.VerifyFileToken(t.Context(), tt.token, tt.wantType, tt.ignoreExpiry)
			if !errors.Is(err, tt.wantErr) {
				t.Fatalf("VerifyFileToken() error = %v, want %v", err, tt.wantErr)
			}
			if tt.wantErr == nil && (got.WorkspaceID != env.node.WorkspaceID || got.FileID != fileID) {
				t.Errorf("VerifyFileToken() = %+v, want the workspace and file the token was issued for", got)
			}
		})
	}
}
