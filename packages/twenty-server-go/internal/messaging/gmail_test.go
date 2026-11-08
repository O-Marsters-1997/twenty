package messaging_test

import (
	"context"
	"encoding/base64"
	"encoding/json"
	"errors"
	"net/http"
	"net/http/httptest"
	"strings"
	"sync"
	"testing"
	"time"

	"github.com/google/go-cmp/cmp"

	"github.com/twentyhq/twenty/packages/twenty-server-go/internal/messaging"
)

type fakeAccounts struct {
	mu      sync.Mutex
	account messaging.ConnectedAccount
}

func (f *fakeAccounts) Get(context.Context, string) (messaging.ConnectedAccount, error) {
	f.mu.Lock()
	defer f.mu.Unlock()
	return f.account, nil
}

func (f *fakeAccounts) SaveAccessToken(_ context.Context, _, token string) error {
	f.mu.Lock()
	defer f.mu.Unlock()
	f.account.AccessToken = token
	return nil
}

func (f *fakeAccounts) MarkAuthFailed(context.Context, string) error {
	f.mu.Lock()
	defer f.mu.Unlock()
	now := time.Now()
	f.account.AuthFailedAt = &now
	return nil
}

type gmailCall struct {
	Path, Authorization string
	Body                map[string]any
}

// fakeGoogle accepts only validToken and records every Gmail call.
func fakeGoogle(t *testing.T, validToken string, refreshStatus int) (gmailURL, tokenURL string, calls *[]gmailCall) {
	t.Helper()
	var recorded []gmailCall
	mux := http.NewServeMux()
	mux.HandleFunc("/gmail/", func(w http.ResponseWriter, r *http.Request) {
		call := gmailCall{Path: r.URL.Path, Authorization: r.Header.Get("Authorization")}
		_ = json.NewDecoder(r.Body).Decode(&call.Body)
		recorded = append(recorded, call)
		if call.Authorization != "Bearer "+validToken {
			http.Error(w, "expired", http.StatusUnauthorized)
			return
		}
		_, _ = w.Write([]byte(`{"id":"gmail-id"}`))
	})
	mux.HandleFunc("/token", func(w http.ResponseWriter, r *http.Request) {
		if err := r.ParseForm(); err != nil || r.Form.Get("refresh_token") != "refresh-1" || r.Form.Get("grant_type") != "refresh_token" {
			http.Error(w, "bad request", http.StatusBadRequest)
			return
		}
		if refreshStatus != http.StatusOK {
			http.Error(w, `{"error":"invalid_grant"}`, refreshStatus)
			return
		}
		_, _ = w.Write([]byte(`{"access_token":"` + validToken + `"}`))
	})
	server := httptest.NewServer(mux)
	t.Cleanup(server.Close)
	return server.URL, server.URL + "/token", &recorded
}

func newMailer(t *testing.T, accounts *fakeAccounts, validToken string, refreshStatus int) (*messaging.Gmail, *[]gmailCall) {
	t.Helper()
	apiURL, tokenURL, calls := fakeGoogle(t, validToken, refreshStatus)
	return messaging.NewGmail(accounts, messaging.GmailConfig{APIURL: apiURL, TokenURL: tokenURL}), calls
}

func newAccounts() *fakeAccounts {
	return &fakeAccounts{account: messaging.ConnectedAccount{ID: "acc-1", Handle: "me@example.com", AccessToken: "old", RefreshToken: "refresh-1"}}
}

var email = messaging.OutboundEmail{
	To: []string{"to@example.com"}, Bcc: []string{"hidden@example.com"},
	Subject: "Hello", HTMLBody: "<p>Hi</p>", InReplyTo: "<abc@mail.gmail.com>",
}

func rawMessage(t *testing.T, call gmailCall) string {
	t.Helper()
	body := call.Body
	if message, ok := body["message"].(map[string]any); ok {
		body = message
	}
	decoded, err := base64.RawURLEncoding.DecodeString(body["raw"].(string))
	if err != nil {
		t.Fatalf("decode raw: %v", err)
	}
	return string(decoded)
}

func TestGmail_SendAndDraft(t *testing.T) {
	t.Parallel()
	tests := []struct {
		name     string
		call     func(*messaging.Gmail) (string, error)
		wantPath string
	}{
		{"send", func(g *messaging.Gmail) (string, error) { return g.Send(t.Context(), "acc-1", email) }, "/gmail/v1/users/me/messages/send"},
		{"draft", func(g *messaging.Gmail) (string, error) { return g.Draft(t.Context(), "acc-1", email) }, "/gmail/v1/users/me/drafts"},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()
			mailer, calls := newMailer(t, newAccounts(), "old", http.StatusOK)
			id, err := tt.call(mailer)
			if err != nil || id != "gmail-id" {
				t.Fatalf("call = %q, %v, want gmail-id, nil", id, err)
			}
			if len(*calls) != 1 || (*calls)[0].Path != tt.wantPath || (*calls)[0].Authorization != "Bearer old" {
				t.Fatalf("calls = %+v", *calls)
			}
			raw := rawMessage(t, (*calls)[0])
			for _, want := range []string{"From: me@example.com\r\n", "To: to@example.com\r\n", "Bcc: hidden@example.com\r\n", "Subject: Hello\r\n", "In-Reply-To: <abc@mail.gmail.com>\r\n", "<p>Hi</p>"} {
				if !strings.Contains(raw, want) {
					t.Errorf("message missing %q:\n%s", want, raw)
				}
			}
		})
	}
}

func TestGmail_RefreshesExpiredToken(t *testing.T) {
	t.Parallel()
	accounts := newAccounts()
	mailer, calls := newMailer(t, accounts, "fresh", http.StatusOK)
	if id, err := mailer.Send(t.Context(), "acc-1", email); err != nil || id != "gmail-id" {
		t.Fatalf("Send = %q, %v", id, err)
	}
	if accounts.account.AccessToken != "fresh" {
		t.Errorf("saved token = %q, want fresh", accounts.account.AccessToken)
	}
	var got []string
	for _, call := range *calls {
		got = append(got, call.Authorization)
	}
	if diff := cmp.Diff([]string{"Bearer old", "Bearer fresh"}, got); diff != "" {
		t.Errorf("authorizations (-want +got):\n%s", diff)
	}
}

func TestGmail_RefreshFailure(t *testing.T) {
	t.Parallel()
	accounts := newAccounts()
	mailer, _ := newMailer(t, accounts, "fresh", http.StatusBadRequest)
	if _, err := mailer.Send(t.Context(), "acc-1", email); !errors.Is(err, messaging.ErrAccountAuthFailed) {
		t.Fatalf("Send error = %v, want ErrAccountAuthFailed", err)
	}
	if accounts.account.AuthFailedAt == nil {
		t.Error("AuthFailedAt not set")
	}
	if _, err := mailer.Draft(t.Context(), "acc-1", email); !errors.Is(err, messaging.ErrAccountAuthFailed) {
		t.Errorf("Draft on failed account error = %v, want ErrAccountAuthFailed", err)
	}
}

func TestGmail_TransientRefreshFailureDoesNotMarkAccount(t *testing.T) {
	t.Parallel()
	accounts := newAccounts()
	mailer, _ := newMailer(t, accounts, "fresh", http.StatusServiceUnavailable)
	_, err := mailer.Send(t.Context(), "acc-1", email)
	if err == nil || errors.Is(err, messaging.ErrAccountAuthFailed) {
		t.Fatalf("Send error = %v, want a transient error", err)
	}
	if accounts.account.AuthFailedAt != nil {
		t.Error("AuthFailedAt set on a transient failure")
	}
}

func TestGmail_RejectsBadEmail(t *testing.T) {
	t.Parallel()
	mailer, calls := newMailer(t, newAccounts(), "old", http.StatusOK)
	bad := []messaging.OutboundEmail{
		{Subject: "no recipients"},
		{To: []string{"not an address"}},
		{To: []string{"to@example.com"}, InReplyTo: "<a>\r\nBcc: evil@example.com"},
	}
	for _, input := range bad {
		if _, err := mailer.Send(t.Context(), "acc-1", input); err == nil {
			t.Errorf("Send(%+v) succeeded, want error", input)
		}
	}
	if len(*calls) != 0 {
		t.Errorf("gmail called %d times for invalid emails", len(*calls))
	}
}
