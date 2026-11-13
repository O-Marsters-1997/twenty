package auth

import (
	"context"
	"crypto/rand"
	"crypto/sha256"
	"encoding/base64"
	"encoding/hex"
	"errors"
	"fmt"
	"log/slog"
	"net"
	"net/http"
	"net/url"
	"slices"
	"strings"
	"time"

	"github.com/golang-jwt/jwt/v5"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

const (
	sessionCookieName       = "twenty-session"
	secureSessionCookieName = "__Host-twenty-session"
	sessionTokenPrefix      = "sess_"

	sessionRevokedSuperseded = "SUPERSEDED"

	defaultSessionLifetime    = 180 * 24 * time.Hour
	defaultSessionIdleTimeout = 30 * 24 * time.Hour
)

type SessionOrigin string

const (
	SessionOriginSignIn        SessionOrigin = "sign_in"
	SessionOriginRenewalBridge SessionOrigin = "renewal_bridge"
)

var (
	ErrSessionOriginForbidden = errors.New("auth: request origin may not receive a session cookie")
	ErrInvalidSessionTokens   = errors.New("auth: cannot issue a session from this token pair")
)

type SessionConfig struct {
	ServerURL            string
	FrontendURL          string
	CookieAllowedOrigins []string
	Production           bool
	SameSite             http.SameSite
	TrustProxy           bool
	AbsoluteLifetime     time.Duration
	IdleTimeout          time.Duration
}

type RefreshRevoker interface {
	Revoke(ctx context.Context, refreshToken string) error
}

type UserSession struct {
	pool    *pgxpool.Pool
	cache   CacheStore
	revoker RefreshRevoker
	config  SessionConfig
	logger  *slog.Logger
}

func NewUserSession(pool *pgxpool.Pool, cache CacheStore, revoker RefreshRevoker, config SessionConfig, logger *slog.Logger) *UserSession {
	if config.SameSite == 0 {
		config.SameSite = http.SameSiteLaxMode
	}
	if config.AbsoluteLifetime == 0 {
		config.AbsoluteLifetime = defaultSessionLifetime
	}
	if config.IdleTimeout == 0 {
		config.IdleTimeout = defaultSessionIdleTimeout
	}
	return &UserSession{pool: pool, cache: cache, revoker: revoker, config: config, logger: logger}
}

type sessionScope struct {
	userID          string
	workspaceID     string
	userWorkspaceID string
	authProvider    AuthProvider
}

func (s *UserSession) IssueForTokenPair(ctx context.Context, w http.ResponseWriter, r *http.Request, pair TokenPair, origin SessionOrigin) error {
	if requestOrigin := r.Header.Get("Origin"); requestOrigin != "" && !s.originAllowed(requestOrigin, r) {
		s.logger.Warn("refused to issue a session cookie", "origin", requestOrigin)
		return ErrSessionOriginForbidden
	}
	scope, err := scopeFromAccessToken(pair.AccessToken)
	if err != nil {
		return err
	}
	presented := s.sessionTokenFromRequest(r)
	if presented != "" && origin == SessionOriginRenewalBridge {
		current, found, err := s.activeSession(ctx, presented)
		if err != nil {
			return err
		}
		current.authProvider = scope.authProvider
		if found && current == scope {
			return nil
		}
	}
	token, expiresAt, err := s.createSession(ctx, scope, r)
	if err != nil {
		return err
	}
	cookieName, secure := s.cookieSettings()
	http.SetCookie(w, &http.Cookie{
		Name: cookieName, Value: token, Path: "/", Expires: expiresAt,
		HttpOnly: true, Secure: secure, SameSite: s.config.SameSite,
	})
	if presented == "" {
		return nil
	}
	if err := s.revokeByToken(ctx, presented, sessionRevokedSuperseded); err != nil {
		s.logger.Error("revoke superseded session", "err", err)
	}
	return nil
}

func (s *UserSession) SignOut(ctx context.Context, w http.ResponseWriter, r *http.Request, refreshToken string) error {
	var errs []error
	if token := s.sessionTokenFromRequest(r); token != "" {
		errs = append(errs, s.revokeByToken(ctx, token, signOutRevokedReason))
	}
	if refreshToken != "" {
		if err := s.revoker.Revoke(ctx, refreshToken); !errors.Is(err, ErrInvalidRefreshToken) {
			errs = append(errs, err)
		}
	}
	s.clearCookies(w)
	return errors.Join(errs...)
}

func (s *UserSession) createSession(ctx context.Context, scope sessionScope, r *http.Request) (string, time.Time, error) {
	raw := make([]byte, 32)
	if _, err := rand.Read(raw); err != nil {
		return "", time.Time{}, fmt.Errorf("generate session token: %w", err)
	}
	token := sessionTokenPrefix + base64.RawURLEncoding.EncodeToString(raw)
	expiresAt := time.Now().Add(s.config.AbsoluteLifetime)
	_, err := s.pool.Exec(ctx,
		`INSERT INTO core."userSession" ("tokenHash", "userId", "workspaceId", "userWorkspaceId", "authProvider", "userAgent", "ipAddress", "expiresAt", "lastActiveAt")
		 VALUES ($1, $2::uuid, $3::uuid, $4::uuid, $5, $6, $7, $8, now())`,
		hashSessionToken(token), scope.userID, nullIfEmpty(scope.workspaceID), nullIfEmpty(scope.userWorkspaceID),
		string(scope.authProvider), nullIfEmpty(r.UserAgent()), nullIfEmpty(s.clientIP(r)), expiresAt)
	if err != nil {
		return "", time.Time{}, fmt.Errorf("insert user session: %w", err)
	}
	return token, expiresAt, nil
}

func (s *UserSession) activeSession(ctx context.Context, token string) (sessionScope, bool, error) {
	var scope sessionScope
	var workspaceID, userWorkspaceID *string
	var provider string
	err := s.pool.QueryRow(ctx,
		`SELECT "userId"::text, "workspaceId"::text, "userWorkspaceId"::text, "authProvider" FROM core."userSession"
		 WHERE "tokenHash" = $1 AND "revokedAt" IS NULL AND "expiresAt" > now() AND "lastActiveAt" > now() - make_interval(secs => $2)`,
		hashSessionToken(token), s.config.IdleTimeout.Seconds(),
	).Scan(&scope.userID, &workspaceID, &userWorkspaceID, &provider)
	if errors.Is(err, pgx.ErrNoRows) {
		return sessionScope{}, false, nil
	}
	if err != nil {
		return sessionScope{}, false, fmt.Errorf("look up user session: %w", err)
	}
	scope.authProvider = AuthProvider(provider)
	if workspaceID != nil {
		scope.workspaceID = *workspaceID
	}
	if userWorkspaceID != nil {
		scope.userWorkspaceID = *userWorkspaceID
	}
	return scope, true, nil
}

func (s *UserSession) revokeByToken(ctx context.Context, token, reason string) error {
	hash := hashSessionToken(token)
	if _, err := s.pool.Exec(ctx,
		`UPDATE core."userSession" SET "revokedAt" = now(), "revokedReason" = $2, "updatedAt" = now()
		 WHERE "tokenHash" = $1 AND "revokedAt" IS NULL`, hash, reason,
	); err != nil {
		return fmt.Errorf("revoke user session: %w", err)
	}
	return s.cache.Delete(ctx, hash)
}

func (s *UserSession) revokeAllInWorkspace(ctx context.Context, userID, workspaceID, reason string) error {
	rows, err := s.pool.Query(ctx,
		`UPDATE core."userSession" SET "revokedAt" = now(), "revokedReason" = $3, "updatedAt" = now()
		 WHERE "userId" = $1::uuid AND "workspaceId" = $2::uuid AND "revokedAt" IS NULL RETURNING "tokenHash"`,
		userID, workspaceID, reason)
	if err != nil {
		return fmt.Errorf("revoke user sessions: %w", err)
	}
	hashes, err := pgx.CollectRows(rows, pgx.RowTo[string])
	if err != nil {
		return fmt.Errorf("read revoked user sessions: %w", err)
	}
	if len(hashes) == 0 {
		return nil
	}
	return s.cache.Delete(ctx, hashes...)
}

func (s *UserSession) sessionTokenFromRequest(r *http.Request) string {
	names := []string{secureSessionCookieName}
	if _, secure := s.cookieSettings(); !secure {
		names = append(names, sessionCookieName)
	}
	for _, name := range names {
		cookie, err := r.Cookie(name)
		if err == nil && strings.HasPrefix(cookie.Value, sessionTokenPrefix) {
			return cookie.Value
		}
	}
	return ""
}

func (s *UserSession) cookieSettings() (name string, secure bool) {
	parsed, err := url.Parse(s.config.ServerURL)
	if err == nil && parsed.Scheme == "https" || s.config.SameSite == http.SameSiteNoneMode {
		return secureSessionCookieName, true
	}
	return sessionCookieName, false
}

func (s *UserSession) clearCookies(w http.ResponseWriter) {
	_, secure := s.cookieSettings()
	for _, name := range []string{secureSessionCookieName, sessionCookieName} {
		http.SetCookie(w, &http.Cookie{
			Name: name, Path: "/", Expires: time.Unix(0, 0), MaxAge: -1,
			HttpOnly: true, Secure: secure, SameSite: s.config.SameSite,
		})
	}
}

func (s *UserSession) clientIP(r *http.Request) string {
	if forwarded, _, _ := strings.Cut(r.Header.Get("X-Forwarded-For"), ","); s.config.TrustProxy && strings.TrimSpace(forwarded) != "" {
		return strings.TrimSpace(forwarded)
	}
	host, _, err := net.SplitHostPort(r.RemoteAddr)
	if err != nil {
		return r.RemoteAddr
	}
	return host
}

func (s *UserSession) originAllowed(origin string, r *http.Request) bool {
	comparable := originOf(origin)
	if comparable == "" {
		return false
	}
	return comparable == originOf(s.requestBaseURL(r)) || s.allowedOrigins()[comparable]
}

func (s *UserSession) requestBaseURL(r *http.Request) string {
	scheme, host := "http", r.Host
	if r.TLS != nil {
		scheme = "https"
	}
	if s.config.TrustProxy {
		if proto, _, _ := strings.Cut(r.Header.Get("X-Forwarded-Proto"), ","); proto != "" {
			scheme = strings.TrimSpace(proto)
		}
		if forwardedHost, _, _ := strings.Cut(r.Header.Get("X-Forwarded-Host"), ","); forwardedHost != "" {
			host = strings.TrimSpace(forwardedHost)
		}
	}
	return scheme + "://" + host
}

func (s *UserSession) allowedOrigins() map[string]bool {
	allowed := map[string]bool{}
	candidates := append([]string{s.config.ServerURL, s.config.FrontendURL}, s.config.CookieAllowedOrigins...)
	for _, candidate := range candidates {
		candidate = strings.TrimSpace(candidate)
		origin := originOf(candidate)
		if origin == "" {
			continue
		}
		explicit := slices.ContainsFunc(s.config.CookieAllowedOrigins, func(value string) bool { return strings.TrimSpace(value) == candidate })
		if s.config.Production && isLoopbackOrigin(origin) && !explicit {
			continue
		}
		allowed[origin] = true
	}
	return allowed
}

func scopeFromAccessToken(accessToken string) (sessionScope, error) {
	var tokenClaims claims
	if _, _, err := jwt.NewParser().ParseUnverified(accessToken, &tokenClaims); err != nil {
		return sessionScope{}, ErrInvalidSessionTokens
	}
	scope := sessionScope{userID: tokenClaims.UserID, authProvider: tokenClaims.AuthProvider}
	if scope.userID == "" {
		scope.userID = tokenClaims.Subject
	}
	switch TokenType(tokenClaims.Type) {
	case TokenTypeAccess:
		scope.workspaceID, scope.userWorkspaceID = tokenClaims.WorkspaceID, tokenClaims.UserWorkspaceID
		if (scope.workspaceID == "") != (scope.userWorkspaceID == "") {
			return sessionScope{}, ErrInvalidSessionTokens
		}
	case TokenTypeWorkspaceAgnostic:
	default:
		return sessionScope{}, ErrInvalidSessionTokens
	}
	if scope.userID == "" {
		return sessionScope{}, ErrInvalidSessionTokens
	}
	return scope, nil
}

func hashSessionToken(token string) string {
	sum := sha256.Sum256([]byte(token))
	return hex.EncodeToString(sum[:])
}

func originOf(raw string) string {
	parsed, err := url.Parse(raw)
	if err != nil || parsed.Host == "" || parsed.Scheme != "http" && parsed.Scheme != "https" {
		return ""
	}
	host := strings.ToLower(parsed.Hostname())
	if strings.Contains(host, ":") {
		host = "[" + host + "]"
	}
	defaultPort := map[string]string{"http": "80", "https": "443"}[parsed.Scheme]
	if port := parsed.Port(); port != "" && port != defaultPort {
		host += ":" + port
	}
	return parsed.Scheme + "://" + host
}

func isLoopbackOrigin(origin string) bool {
	parsed, err := url.Parse(origin)
	if err != nil {
		return false
	}
	host := strings.TrimSuffix(parsed.Hostname(), ".")
	if strings.EqualFold(host, "localhost") {
		return true
	}
	ip := net.ParseIP(host)
	return ip != nil && ip.IsLoopback()
}

func nullIfEmpty(value string) *string {
	if value == "" {
		return nil
	}
	return &value
}
