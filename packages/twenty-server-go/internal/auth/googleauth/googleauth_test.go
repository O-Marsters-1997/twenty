package googleauth_test

import (
	"context"
	"encoding/json"
	"io"
	"log/slog"
	"net/http"
	"net/http/httptest"
	"net/url"
	"testing"

	"github.com/google/go-cmp/cmp"

	"github.com/twentyhq/twenty/packages/twenty-server-go/internal/auth"
	"github.com/twentyhq/twenty/packages/twenty-server-go/internal/auth/googleauth"
)

type fakeIssuer struct {
	users    map[string]bool
	provider auth.AuthProvider
}

func (f *fakeIssuer) IssueLoginForEmail(_ context.Context, email string, provider auth.AuthProvider) (string, error) {
	f.provider = provider
	if !f.users[email] {
		return "", auth.ErrUnknownUser
	}
	return "login-token-for-" + email, nil
}

func newFakeGoogle(t *testing.T, profile map[string]any) *httptest.Server {
	t.Helper()
	mux := http.NewServeMux()
	mux.HandleFunc("POST /token", func(w http.ResponseWriter, r *http.Request) {
		if err := r.ParseForm(); err != nil || r.PostForm.Get("code") != "good-code" || r.PostForm.Get("client_secret") != "secret" {
			http.Error(w, "bad", http.StatusBadRequest)
			return
		}
		_ = json.NewEncoder(w).Encode(map[string]string{"access_token": "google-access"})
	})
	mux.HandleFunc("GET /userinfo", func(w http.ResponseWriter, r *http.Request) {
		if r.Header.Get("Authorization") != "Bearer google-access" {
			http.Error(w, "bad", http.StatusUnauthorized)
			return
		}
		_ = json.NewEncoder(w).Encode(profile)
	})
	server := httptest.NewServer(mux)
	t.Cleanup(server.Close)
	return server
}

func newRouter(t *testing.T, google *httptest.Server, issuer *fakeIssuer) http.Handler {
	t.Helper()
	front, err := url.Parse("https://app.example.com")
	if err != nil {
		t.Fatal(err)
	}
	mux := http.NewServeMux()
	googleauth.NewHandler(googleauth.Config{
		ClientID:         "client-id",
		ClientSecret:     "secret",
		CallbackURL:      "https://api.example.com/auth/google/redirect",
		FrontURL:         front,
		AuthEndpoint:     google.URL + "/auth",
		TokenEndpoint:    google.URL + "/token",
		UserInfoEndpoint: google.URL + "/userinfo",
	}, issuer, google.Client(), slog.New(slog.NewTextHandler(io.Discard, nil))).Register(mux)
	return mux
}

func get(t *testing.T, handler http.Handler, target string) *httptest.ResponseRecorder {
	t.Helper()
	recorder := httptest.NewRecorder()
	handler.ServeHTTP(recorder, httptest.NewRequest(http.MethodGet, target, nil))
	return recorder
}

func TestHandler_Start(t *testing.T) {
	t.Parallel()
	google := newFakeGoogle(t, nil)
	router := newRouter(t, google, &fakeIssuer{})

	recorder := get(t, router, "/auth/google?returnToPath=/settings&action=sign-in")

	if recorder.Code != http.StatusFound {
		t.Fatalf("GET /auth/google status = %d, want %d", recorder.Code, http.StatusFound)
	}
	location, err := url.Parse(recorder.Header().Get("Location"))
	if err != nil {
		t.Fatal(err)
	}
	want := map[string]string{
		"response_type": "code",
		"client_id":     "client-id",
		"redirect_uri":  "https://api.example.com/auth/google/redirect",
		"scope":         "email profile",
		"prompt":        "select_account",
		"state":         `{"action":"sign-in","returnToPath":"/settings"}`,
	}
	got := map[string]string{}
	for key := range want {
		got[key] = location.Query().Get(key)
	}
	if diff := cmp.Diff(want, got); diff != "" {
		t.Errorf("authorize URL params (-want +got):\n%s", diff)
	}
	if location.Host != google.Listener.Addr().String() {
		t.Errorf("authorize URL host = %q, want the provider", location.Host)
	}
}

func TestHandler_Callback(t *testing.T) {
	t.Parallel()
	verified := map[string]any{"email": "ada@example.com", "email_verified": true}
	tests := []struct {
		name    string
		profile map[string]any
		query   string
		want    string
	}{
		{
			name:    "known user gets a login token",
			profile: verified,
			query:   "code=good-code&state=" + url.QueryEscape(`{"returnToPath":"/settings"}`),
			want:    "https://app.example.com/verify?loginToken=login-token-for-ada%40example.com&returnToPath=%2Fsettings",
		},
		{
			name:    "returnToPath without a leading slash is dropped",
			profile: verified,
			query:   "code=good-code&state=" + url.QueryEscape(`{"returnToPath":"https://evil.example"}`),
			want:    "https://app.example.com/verify?loginToken=login-token-for-ada%40example.com",
		},
		{
			name:    "cancelled login",
			profile: verified,
			query:   "error=access_denied",
			want:    "https://app.example.com/verify?errorMessage=Google+OAuth+access+denied",
		},
		{
			name:    "unverified email",
			profile: map[string]any{"email": "ada@example.com", "email_verified": false},
			query:   "code=good-code",
			want:    "https://app.example.com/verify?errorMessage=Please+verify+your+email+address+with+Google",
		},
		{
			name:    "unknown user",
			profile: map[string]any{"email": "new@example.com", "email_verified": true},
			query:   "code=good-code",
			want:    "https://app.example.com/verify?errorMessage=No+account+exists+for+new%40example.com",
		},
		{
			name:    "rejected code",
			profile: verified,
			query:   "code=bad-code",
			want:    "https://app.example.com/verify?errorMessage=Authentication+error%3A+Google+sign-in+failed",
		},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()
			issuer := &fakeIssuer{users: map[string]bool{"ada@example.com": true}}
			router := newRouter(t, newFakeGoogle(t, tt.profile), issuer)

			recorder := get(t, router, "/auth/google/redirect?"+tt.query)

			if recorder.Code != http.StatusFound {
				t.Errorf("status = %d, want %d", recorder.Code, http.StatusFound)
			}
			if got := recorder.Header().Get("Location"); got != tt.want {
				t.Errorf("Location = %q, want %q", got, tt.want)
			}
		})
	}

	t.Run("login token carries the google provider", func(t *testing.T) {
		t.Parallel()
		issuer := &fakeIssuer{users: map[string]bool{"ada@example.com": true}}
		get(t, newRouter(t, newFakeGoogle(t, verified), issuer), "/auth/google/redirect?code=good-code")
		if issuer.provider != "google" {
			t.Errorf("provider = %q, want google", issuer.provider)
		}
	})
}

