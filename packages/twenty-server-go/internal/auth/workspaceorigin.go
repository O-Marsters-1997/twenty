package auth

import (
	"context"
	"errors"
	"fmt"
	"net/url"
	"strings"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

var ErrWorkspaceNotFound = errors.New("auth: no workspace for this origin")

type OriginWorkspace struct {
	ID        string
	Subdomain string
}

type OriginConfig struct {
	MultiWorkspace   bool
	FrontURL         string
	DefaultSubdomain string
	SeedWorkspaceID  string
}

type OriginResolver struct {
	pool   *pgxpool.Pool
	config OriginConfig
}

func NewOriginResolver(pool *pgxpool.Pool, config OriginConfig) *OriginResolver {
	return &OriginResolver{pool: pool, config: config}
}

func (r *OriginResolver) ByOriginOrDefault(ctx context.Context, origin string) (OriginWorkspace, error) {
	if !r.config.MultiWorkspace {
		return r.defaultWorkspace(ctx)
	}
	subdomain, err := r.subdomainFromURL(origin)
	if err != nil {
		return OriginWorkspace{}, err
	}
	if subdomain == "" {
		return OriginWorkspace{}, ErrWorkspaceNotFound
	}
	var found OriginWorkspace
	err = r.pool.QueryRow(ctx,
		`SELECT id::text, subdomain FROM core.workspace WHERE subdomain = $1 AND "deletedAt" IS NULL`, subdomain,
	).Scan(&found.ID, &found.Subdomain)
	if errors.Is(err, pgx.ErrNoRows) {
		return OriginWorkspace{}, ErrWorkspaceNotFound
	}
	if err != nil {
		return OriginWorkspace{}, fmt.Errorf("look up workspace by subdomain: %w", err)
	}
	return found, nil
}

func (r *OriginResolver) defaultWorkspace(ctx context.Context) (OriginWorkspace, error) {
	var found OriginWorkspace
	err := r.pool.QueryRow(ctx,
		`SELECT id::text, subdomain FROM core.workspace WHERE "deletedAt" IS NULL
		 ORDER BY id::text = $1 DESC, "createdAt" DESC LIMIT 1`, r.config.SeedWorkspaceID,
	).Scan(&found.ID, &found.Subdomain)
	if errors.Is(err, pgx.ErrNoRows) {
		return OriginWorkspace{}, ErrWorkspaceNotFound
	}
	if err != nil {
		return OriginWorkspace{}, fmt.Errorf("look up default workspace: %w", err)
	}
	return found, nil
}

func (r *OriginResolver) subdomainFromURL(rawURL string) (string, error) {
	parsed, err := url.Parse(rawURL)
	if err != nil || parsed.Hostname() == "" {
		return "", fmt.Errorf("parse origin %q", rawURL)
	}
	frontURL, err := url.Parse(r.config.FrontURL)
	if err != nil {
		return "", fmt.Errorf("parse front url: %w", err)
	}
	frontDomain := frontURL.Hostname()
	hostname := strings.ToLower(parsed.Hostname())
	if hostname == frontDomain || !strings.HasSuffix(hostname, "."+frontDomain) {
		return "", nil
	}
	subdomain := strings.TrimSuffix(hostname, "."+frontDomain)
	if subdomain == r.config.DefaultSubdomain {
		return "", nil
	}
	return subdomain, nil
}
