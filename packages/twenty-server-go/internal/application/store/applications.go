package store

import (
	"context"
	"fmt"
	"regexp"

	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/twentyhq/twenty/packages/twenty-server-go/internal/metadata"
	"github.com/twentyhq/twenty/packages/twenty-server-go/internal/workspace"
)

var absoluteURL = regexp.MustCompile(`(?i)^https?://`)

var selectApplications = `SELECT jsonb_build_object('id', id, 'name', name, 'description', description, 'logo', logo, 'version', version,
		'universalIdentifier', "universalIdentifier", 'createdAt', ` + iso(`"createdAt"`) + `, 'defaultRoleId', "defaultRoleId")
	FROM core.application WHERE "workspaceId" = $1::uuid AND "deletedAt" IS NULL`

type Application struct {
	ID                  string  `json:"id"`
	Name                string  `json:"name"`
	Description         *string `json:"description"`
	Logo                *string `json:"logo"`
	LogoURL             *string `json:"-"`
	Version             *string `json:"version"`
	UniversalIdentifier string  `json:"universalIdentifier"`
	CreatedAt           string  `json:"createdAt"`
	DefaultRoleID       *string `json:"defaultRoleId"`
}

type Applications struct {
	pool      *pgxpool.Pool
	serverURL string
}

func NewApplications(pool *pgxpool.Pool, serverURL string) *Applications {
	return &Applications{pool: pool, serverURL: serverURL}
}

func (a *Applications) List(ctx context.Context) ([]Application, error) {
	applications, err := queryAll[Application](ctx, a.pool, selectApplications+` ORDER BY "createdAt", id`, workspace.PinnedWorkspaceID)
	if err != nil {
		return nil, err
	}
	for i := range applications {
		applications[i].LogoURL = a.logoURL(applications[i])
	}
	return applications, nil
}

func (a *Applications) Get(ctx context.Context, id, universalIdentifier string) (Application, error) {
	if (id == "") == (universalIdentifier == "") {
		return Application{}, fmt.Errorf("%w: exactly one of id and universalIdentifier is required", metadata.ErrInvalidInput)
	}
	application, err := queryOne[Application](ctx, a.pool, "application not found",
		selectApplications+` AND (id = NULLIF($2, '')::uuid OR "universalIdentifier" = NULLIF($3, '')::uuid)`, workspace.PinnedWorkspaceID, id, universalIdentifier)
	if err != nil {
		return Application{}, err
	}
	application.LogoURL = a.logoURL(application)
	return application, nil
}

func (a *Applications) logoURL(application Application) *string {
	if application.Logo == nil || *application.Logo == "" {
		return nil
	}
	if absoluteURL.MatchString(*application.Logo) {
		return application.Logo
	}
	url := a.serverURL + "/public-assets/" + workspace.PinnedWorkspaceID + "/" + application.ID + "/" + *application.Logo
	return &url
}
