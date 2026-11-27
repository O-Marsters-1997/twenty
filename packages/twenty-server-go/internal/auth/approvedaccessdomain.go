package auth

import (
	"context"
	"errors"
	"fmt"
	"strings"
	"time"

	"github.com/golang-jwt/jwt/v5"
)

const TokenTypeApprovedAccessDomain TokenType = "APPROVED_ACCESS_DOMAIN"

var ErrInvalidApprovedAccessDomainToken = errors.New("auth: invalid approved access domain token")

type ApprovedAccessDomainClaims struct {
	Email       string
	WorkspaceID string
}

type approvedAccessDomainClaims struct {
	jwt.RegisteredClaims
	Type        string `json:"type"`
	WorkspaceID string `json:"workspaceId"`
}

func IsPublicEmailDomain(domain string) bool {
	return emailProviders()[strings.ToLower(domain)]
}

func (i *PGIssuer) IssueApprovedAccessDomainToken(ctx context.Context, email, workspaceID string, ttl time.Duration) (string, error) {
	token, err := i.sign(ctx, jwt.MapClaims{
		"sub":         email,
		"workspaceId": workspaceID,
		"type":        TokenTypeApprovedAccessDomain,
	}, time.Now().Add(ttl))
	if err != nil {
		return "", fmt.Errorf("issue approved access domain token: %w", err)
	}
	return token, nil
}

func (i *PGIssuer) VerifyApprovedAccessDomainToken(ctx context.Context, token string) (ApprovedAccessDomainClaims, error) {
	var parsed approvedAccessDomainClaims
	err := i.parseSigned(ctx, token, &parsed, func() claims {
		return claims{Type: parsed.Type, WorkspaceID: parsed.WorkspaceID}
	})
	switch {
	case errors.Is(err, errKeyLookup):
		return ApprovedAccessDomainClaims{}, fmt.Errorf("verify approved access domain token: %w", err)
	case err != nil, parsed.Type != string(TokenTypeApprovedAccessDomain), parsed.Subject == "", parsed.WorkspaceID == "":
		return ApprovedAccessDomainClaims{}, ErrInvalidApprovedAccessDomainToken
	}
	return ApprovedAccessDomainClaims{Email: parsed.Subject, WorkspaceID: parsed.WorkspaceID}, nil
}
