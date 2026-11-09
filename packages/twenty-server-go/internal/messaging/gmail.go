package messaging

import (
	"bytes"
	"context"
	"encoding/base64"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"mime"
	"mime/quotedprintable"
	"net/http"
	"net/mail"
	"net/url"
	"strings"
	"time"
)

const (
	defaultAPIURL   = "https://gmail.googleapis.com"
	defaultTokenURL = "https://oauth2.googleapis.com/token"
)

type GmailConfig struct {
	ClientID, ClientSecret string
	// APIURL and TokenURL default to Google's endpoints.
	APIURL, TokenURL string
	HTTPClient       *http.Client
}

type Gmail struct {
	accounts Accounts
	config   GmailConfig
}

var (
	_ Mailer      = (*Gmail)(nil)
	_ DraftSender = (*Gmail)(nil)
)

func NewGmail(accounts Accounts, config GmailConfig) *Gmail {
	if config.APIURL == "" {
		config.APIURL = defaultAPIURL
	}
	if config.TokenURL == "" {
		config.TokenURL = defaultTokenURL
	}
	if config.HTTPClient == nil {
		config.HTTPClient = &http.Client{Timeout: 30 * time.Second}
	}
	return &Gmail{accounts: accounts, config: config}
}

func (g *Gmail) Send(ctx context.Context, connectedAccountID string, email OutboundEmail) (string, error) {
	return g.post(ctx, connectedAccountID, email, "/gmail/v1/users/me/messages/send", func(raw string) any {
		return map[string]string{"raw": raw}
	})
}

func (g *Gmail) Draft(ctx context.Context, connectedAccountID string, email OutboundEmail) (string, error) {
	return g.post(ctx, connectedAccountID, email, "/gmail/v1/users/me/drafts", func(raw string) any {
		return map[string]any{"message": map[string]string{"raw": raw}}
	})
}

func (g *Gmail) SendDraft(ctx context.Context, connectedAccountID, draftID string, email OutboundEmail) (string, error) {
	return g.post(ctx, connectedAccountID, email, "/gmail/v1/users/me/drafts/send", func(raw string) any {
		return map[string]any{"id": draftID, "message": map[string]string{"raw": raw}}
	})
}

func (g *Gmail) post(ctx context.Context, accountID string, email OutboundEmail, path string, payload func(raw string) any) (string, error) {
	account, err := g.accounts.Get(ctx, accountID)
	if err != nil {
		return "", fmt.Errorf("load connected account: %w", err)
	}
	if account.AuthFailedAt != nil {
		return "", ErrAccountAuthFailed
	}
	message, err := buildMessage(account.Handle, email)
	if err != nil {
		return "", err
	}
	body, err := json.Marshal(payload(base64.RawURLEncoding.EncodeToString(message)))
	if err != nil {
		return "", fmt.Errorf("encode request: %w", err)
	}

	id, status, err := g.call(ctx, path, account.AccessToken, body)
	if status == http.StatusUnauthorized {
		if account.AccessToken, err = g.refresh(ctx, account); err != nil {
			return "", err
		}
		id, _, err = g.call(ctx, path, account.AccessToken, body)
	}
	return id, err
}

func (g *Gmail) call(ctx context.Context, path, accessToken string, body []byte) (id string, status int, err error) {
	request, err := http.NewRequestWithContext(ctx, http.MethodPost, g.config.APIURL+path, bytes.NewReader(body))
	if err != nil {
		return "", 0, fmt.Errorf("build gmail request: %w", err)
	}
	request.Header.Set("Authorization", "Bearer "+accessToken)
	request.Header.Set("Content-Type", "application/json")
	response, err := g.config.HTTPClient.Do(request)
	if err != nil {
		return "", 0, fmt.Errorf("call gmail: %w", err)
	}
	defer func() { _ = response.Body.Close() }()
	if response.StatusCode != http.StatusOK {
		return "", response.StatusCode, fmt.Errorf("call gmail: status %d", response.StatusCode)
	}
	var result struct {
		ID string `json:"id"`
	}
	if err := json.NewDecoder(response.Body).Decode(&result); err != nil {
		return "", response.StatusCode, fmt.Errorf("decode gmail response: %w", err)
	}
	return result.ID, response.StatusCode, nil
}

func (g *Gmail) refresh(ctx context.Context, account ConnectedAccount) (string, error) {
	form := url.Values{
		"grant_type":    {"refresh_token"},
		"refresh_token": {account.RefreshToken},
		"client_id":     {g.config.ClientID},
		"client_secret": {g.config.ClientSecret},
	}
	request, err := http.NewRequestWithContext(ctx, http.MethodPost, g.config.TokenURL, strings.NewReader(form.Encode()))
	if err != nil {
		return "", fmt.Errorf("build token request: %w", err)
	}
	request.Header.Set("Content-Type", "application/x-www-form-urlencoded")
	response, err := g.config.HTTPClient.Do(request)
	if err != nil {
		return "", fmt.Errorf("refresh access token: %w", err)
	}
	defer func() { _ = response.Body.Close() }()

	var token struct {
		AccessToken string `json:"access_token"`
	}
	rejected := response.StatusCode == http.StatusBadRequest || response.StatusCode == http.StatusUnauthorized
	if !rejected && response.StatusCode != http.StatusOK {
		return "", fmt.Errorf("refresh access token: status %d", response.StatusCode)
	}
	if !rejected {
		if err := json.NewDecoder(response.Body).Decode(&token); err != nil {
			return "", fmt.Errorf("decode token response: %w", err)
		}
		rejected = token.AccessToken == ""
	}
	if rejected {
		if err := g.accounts.MarkAuthFailed(ctx, account.ID); err != nil {
			return "", fmt.Errorf("mark account auth failed: %w", err)
		}
		return "", ErrAccountAuthFailed
	}
	if err := g.accounts.SaveAccessToken(ctx, account.ID, token.AccessToken); err != nil {
		return "", fmt.Errorf("save access token: %w", err)
	}
	return token.AccessToken, nil
}

func buildMessage(from string, email OutboundEmail) ([]byte, error) {
	if len(email.To)+len(email.Cc)+len(email.Bcc) == 0 {
		return nil, errors.New("email has no recipients")
	}
	if strings.ContainsAny(email.InReplyTo, "\r\n") {
		return nil, errors.New("invalid in-reply-to")
	}
	var message bytes.Buffer
	headers := []struct {
		name      string
		addresses []string
	}{{"From", []string{from}}, {"To", email.To}, {"Cc", email.Cc}, {"Bcc", email.Bcc}}
	for _, header := range headers {
		if len(header.addresses) == 0 {
			continue
		}
		formatted := make([]string, 0, len(header.addresses))
		for _, address := range header.addresses {
			parsed, err := mail.ParseAddress(address)
			if err != nil {
				return nil, fmt.Errorf("invalid %s address: %w", strings.ToLower(header.name), err)
			}
			formatted = append(formatted, parsed.String())
		}
		fmt.Fprintf(&message, "%s: %s\r\n", header.name, strings.Join(formatted, ", "))
	}
	fmt.Fprintf(&message, "Subject: %s\r\n", mime.QEncoding.Encode("utf-8", email.Subject))
	if email.InReplyTo != "" {
		fmt.Fprintf(&message, "In-Reply-To: %s\r\nReferences: %s\r\n", email.InReplyTo, email.InReplyTo)
	}
	message.WriteString("MIME-Version: 1.0\r\nContent-Type: text/html; charset=UTF-8\r\nContent-Transfer-Encoding: quoted-printable\r\n\r\n")
	body := quotedprintable.NewWriter(&message)
	if _, err := io.WriteString(body, email.HTMLBody); err != nil {
		return nil, fmt.Errorf("encode body: %w", err)
	}
	if err := body.Close(); err != nil {
		return nil, fmt.Errorf("encode body: %w", err)
	}
	return message.Bytes(), nil
}
