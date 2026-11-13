package googleauth

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"log/slog"
	"net/http"
	"net/url"
	"strings"

	"github.com/twentyhq/twenty/packages/twenty-server-go/internal/auth"
)

const (
	DefaultAuthEndpoint     = "https://accounts.google.com/o/oauth2/v2/auth"
	DefaultTokenEndpoint    = "https://oauth2.googleapis.com/token"
	DefaultUserInfoEndpoint = "https://www.googleapis.com/oauth2/v3/userinfo"

	Path         = "/auth/google"
	RedirectPath = "/auth/google/redirect"

	googleProvider auth.AuthProvider = "google"
	verifyPath                       = "/verify"
)

type Config struct {
	ClientID         string
	ClientSecret     string
	CallbackURL      string
	FrontURL         *url.URL
	AuthEndpoint     string
	TokenEndpoint    string
	UserInfoEndpoint string
}

type LoginIssuer interface {
	IssueLoginForEmail(ctx context.Context, email string, provider auth.AuthProvider) (string, error)
}

type Handler struct {
	config Config
	issuer LoginIssuer
	client *http.Client
	logger *slog.Logger
}

func NewHandler(config Config, issuer LoginIssuer, client *http.Client, logger *slog.Logger) *Handler {
	if config.AuthEndpoint == "" {
		config.AuthEndpoint = DefaultAuthEndpoint
	}
	if config.TokenEndpoint == "" {
		config.TokenEndpoint = DefaultTokenEndpoint
	}
	if config.UserInfoEndpoint == "" {
		config.UserInfoEndpoint = DefaultUserInfoEndpoint
	}
	if client == nil {
		client = http.DefaultClient
	}
	return &Handler{config: config, issuer: issuer, client: client, logger: logger}
}

func (h *Handler) Register(mux *http.ServeMux) {
	mux.HandleFunc("GET "+Path, h.start)
	mux.HandleFunc("GET "+RedirectPath, h.callback)
}

type state struct {
	WorkspaceInviteHash string `json:"workspaceInviteHash,omitempty"`
	WorkspaceID         string `json:"workspaceId,omitempty"`
	Action              string `json:"action,omitempty"`
	Locale              string `json:"locale,omitempty"`
	ReturnToPath        string `json:"returnToPath,omitempty"`
}

func (h *Handler) start(w http.ResponseWriter, r *http.Request) {
	query := r.URL.Query()
	encoded, err := json.Marshal(state{
		WorkspaceInviteHash: query.Get("workspaceInviteHash"),
		WorkspaceID:         query.Get("workspaceId"),
		Action:              query.Get("action"),
		Locale:              query.Get("locale"),
		ReturnToPath:        query.Get("returnToPath"),
	})
	if err != nil {
		h.fail(w, r, fmt.Errorf("encode state: %w", err))
		return
	}
	target, err := url.Parse(h.config.AuthEndpoint)
	if err != nil {
		h.fail(w, r, fmt.Errorf("parse auth endpoint: %w", err))
		return
	}
	target.RawQuery = url.Values{
		"response_type": {"code"},
		"client_id":     {h.config.ClientID},
		"redirect_uri":  {h.config.CallbackURL},
		"scope":         {"email profile"},
		"prompt":        {"select_account"},
		"state":         {string(encoded)},
	}.Encode()
	http.Redirect(w, r, target.String(), http.StatusFound)
}

func (h *Handler) callback(w http.ResponseWriter, r *http.Request) {
	query := r.URL.Query()
	if query.Get("error") == "access_denied" {
		h.redirectError(w, r, "Google OAuth access denied")
		return
	}
	if query.Get("code") == "" {
		h.redirectError(w, r, "Authentication error: missing authorization code")
		return
	}

	userInfo, err := h.exchange(r.Context(), query.Get("code"))
	if err != nil {
		h.fail(w, r, err)
		return
	}
	if !userInfo.EmailVerified || userInfo.Email == "" {
		h.redirectError(w, r, "Please verify your email address with Google")
		return
	}

	var oauthState state
	if err := json.Unmarshal([]byte(query.Get("state")), &oauthState); err != nil {
		h.logger.Warn("parse google oauth state", "err", err)
	}

	token, err := h.issuer.IssueLoginForEmail(r.Context(), userInfo.Email, googleProvider)
	if errors.Is(err, auth.ErrUnknownUser) {
		h.redirectError(w, r, "No account exists for "+strings.ToLower(userInfo.Email))
		return
	}
	if err != nil {
		h.fail(w, r, err)
		return
	}

	params := url.Values{"loginToken": {token}}
	if strings.HasPrefix(oauthState.ReturnToPath, "/") {
		params.Set("returnToPath", oauthState.ReturnToPath)
	}
	http.Redirect(w, r, h.frontURL(params), http.StatusFound)
}

type profile struct {
	Email         string `json:"email"`
	EmailVerified bool   `json:"email_verified"`
}

func (h *Handler) exchange(ctx context.Context, code string) (profile, error) {
	form := url.Values{
		"grant_type":    {"authorization_code"},
		"code":          {code},
		"client_id":     {h.config.ClientID},
		"client_secret": {h.config.ClientSecret},
		"redirect_uri":  {h.config.CallbackURL},
	}
	request, err := http.NewRequestWithContext(ctx, http.MethodPost, h.config.TokenEndpoint, strings.NewReader(form.Encode()))
	if err != nil {
		return profile{}, fmt.Errorf("build token request: %w", err)
	}
	request.Header.Set("Content-Type", "application/x-www-form-urlencoded")
	var tokens struct {
		AccessToken string `json:"access_token"`
	}
	if err := h.doJSON(request, &tokens); err != nil {
		return profile{}, fmt.Errorf("exchange authorization code: %w", err)
	}

	request, err = http.NewRequestWithContext(ctx, http.MethodGet, h.config.UserInfoEndpoint, nil)
	if err != nil {
		return profile{}, fmt.Errorf("build userinfo request: %w", err)
	}
	request.Header.Set("Authorization", "Bearer "+tokens.AccessToken)
	var userInfo profile
	if err := h.doJSON(request, &userInfo); err != nil {
		return profile{}, fmt.Errorf("fetch google profile: %w", err)
	}
	return userInfo, nil
}

func (h *Handler) doJSON(request *http.Request, into any) (err error) {
	response, err := h.client.Do(request)
	if err != nil {
		return err
	}
	defer func() { err = errors.Join(err, response.Body.Close()) }()
	if response.StatusCode != http.StatusOK {
		return fmt.Errorf("unexpected status %d", response.StatusCode)
	}
	return json.NewDecoder(response.Body).Decode(into)
}

func (h *Handler) fail(w http.ResponseWriter, r *http.Request, err error) {
	h.logger.Error("google login", "err", err)
	h.redirectError(w, r, "Authentication error: Google sign-in failed")
}

func (h *Handler) redirectError(w http.ResponseWriter, r *http.Request, message string) {
	http.Redirect(w, r, h.frontURL(url.Values{"errorMessage": {message}}), http.StatusFound)
}

func (h *Handler) frontURL(params url.Values) string {
	target := *h.config.FrontURL
	target.Path = verifyPath
	target.RawQuery = params.Encode()
	return target.String()
}
