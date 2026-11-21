package store

import (
	"cmp"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"maps"
	"slices"
	"strings"

	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/twentyhq/twenty/packages/twenty-server-go/internal/auth"
	"github.com/twentyhq/twenty/packages/twenty-server-go/internal/metadata"
)

var ErrPermissionDenied = errors.New("entity performing the request does not have permission")

type Application struct {
	ID                  string
	Name                string
	Description         *string
	LogoURL             *string
	Version             *string
	UniversalIdentifier string
	CreatedAt           metadata.Timestamp
	DefaultRoleID       *string
}

type EmitThrough struct {
	RelationFieldUniversalIdentifier  string
	TriggerFieldUniversalIdentifiers  []string
	HappensAtFieldUniversalIdentifier *string
}

type Emit struct {
	On                        string
	ObjectUniversalIdentifier *string
	Through                   *EmitThrough
}

type TimelineActivityType struct {
	ID                                              string
	UniversalIdentifier                             string
	Name                                            string
	Label                                           string
	Emit                                            *Emit
	Action                                          *string
	Icon                                            *string
	FrontComponentUniversalIdentifier               *string
	ObjectUniversalIdentifier                       *string
	ReplacesTimelineActivityTypeUniversalIdentifier *string
	IsActive                                        bool
	ApplicationID                                   *string
	CreatedAt                                       metadata.Timestamp
	UpdatedAt                                       metadata.Timestamp
}

type Store struct {
	pool      *pgxpool.Pool
	serverURL string
}

func New(pool *pgxpool.Pool, serverURL string) *Store {
	return &Store{pool: pool, serverURL: serverURL}
}

// AuthorizeApplications allows a role that can update all settings or holds the APPLICATIONS flag.
func (s *Store) AuthorizeApplications(ctx context.Context, principal auth.Principal) error {
	var granted bool
	if err := s.pool.QueryRow(ctx, `SELECT EXISTS (
		SELECT 1 FROM core."roleTarget" rt JOIN core.role r ON r.id = rt."roleId"
		WHERE rt."workspaceId" = $1::uuid
			AND (rt."userWorkspaceId" = NULLIF($2, '')::uuid OR rt."apiKeyId" = NULLIF($3, '')::uuid)
			AND (r."canUpdateAllSettings" OR EXISTS (
				SELECT 1 FROM core."rolePermissionFlag" rpf JOIN core."permissionFlag" pf ON pf.id = rpf."permissionFlagId"
				WHERE rpf."roleId" = r.id AND pf.key = 'APPLICATIONS')))`,
		principal.WorkspaceID, principal.UserWorkspaceID, principal.APIKeyID).Scan(&granted); err != nil {
		return fmt.Errorf("look up applications permission: %w", err)
	}
	if !granted {
		return ErrPermissionDenied
	}
	return nil
}

func (s *Store) Applications(ctx context.Context, workspaceID string) ([]*Application, error) {
	rows, err := s.pool.Query(ctx,
		`SELECT id::text, name, description, logo, version, "universalIdentifier"::text, "createdAt", "defaultRoleId"::text
		 FROM core.application WHERE "workspaceId" = $1::uuid AND "deletedAt" IS NULL ORDER BY "createdAt", id`, workspaceID)
	if err != nil {
		return nil, fmt.Errorf("query applications: %w", err)
	}
	defer rows.Close()
	applications := []*Application{}
	for rows.Next() {
		var application Application
		var logo *string
		if err := rows.Scan(&application.ID, &application.Name, &application.Description, &logo, &application.Version,
			&application.UniversalIdentifier, &application.CreatedAt.Time, &application.DefaultRoleID); err != nil {
			return nil, fmt.Errorf("scan application: %w", err)
		}
		application.LogoURL = s.logoURL(workspaceID, application.ID, logo)
		applications = append(applications, &application)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("read applications: %w", err)
	}
	return applications, nil
}

func (s *Store) logoURL(workspaceID, applicationID string, logo *string) *string {
	if logo == nil || *logo == "" {
		return nil
	}
	if lower := strings.ToLower(*logo); strings.HasPrefix(lower, "http://") || strings.HasPrefix(lower, "https://") {
		return logo
	}
	url := fmt.Sprintf("%s/public-assets/%s/%s/%s", s.serverURL, workspaceID, applicationID, *logo)
	return &url
}

func (s *Store) TimelineActivityTypes(ctx context.Context, workspaceID string) ([]*TimelineActivityType, error) {
	rows, err := s.pool.Query(ctx,
		`SELECT t.id::text, t."universalIdentifier"::text, t.name, t.label, t.action, t.icon,
			t."objectUniversalIdentifier"::text, t."frontComponentUniversalIdentifier"::text,
			t."targetRelationFieldUniversalIdentifier"::text, t."triggerFieldUniversalIdentifiers"::text[],
			t."happensAtFieldUniversalIdentifier"::text, t."replacesTimelineActivityTypeUniversalIdentifier"::text,
			t."isActive", t."applicationId"::text, t."createdAt", t."updatedAt", t.overrides,
			owner."universalIdentifier"::text
		 FROM core."timelineActivityType" t
		 JOIN core.application owner ON owner.id = t."applicationId"
		 WHERE t."workspaceId" = $1::uuid`, workspaceID)
	if err != nil {
		return nil, fmt.Errorf("query timeline activity types: %w", err)
	}
	defer rows.Close()
	types := []*TimelineActivityType{}
	for rows.Next() {
		var t TimelineActivityType
		var through EmitThrough
		var relationField *string
		var overrides []byte
		var owner string
		if err := rows.Scan(&t.ID, &t.UniversalIdentifier, &t.Name, &t.Label, &t.Action, &t.Icon,
			&t.ObjectUniversalIdentifier, &t.FrontComponentUniversalIdentifier, &relationField,
			&through.TriggerFieldUniversalIdentifiers, &through.HappensAtFieldUniversalIdentifier,
			&t.ReplacesTimelineActivityTypeUniversalIdentifier, &t.IsActive, &t.ApplicationID,
			&t.CreatedAt.Time, &t.UpdatedAt.Time, &overrides, &owner); err != nil {
			return nil, fmt.Errorf("scan timeline activity type: %w", err)
		}
		if t.Action != nil {
			t.Emit = &Emit{On: *t.Action, ObjectUniversalIdentifier: t.ObjectUniversalIdentifier}
			if relationField != nil {
				through.RelationFieldUniversalIdentifier = *relationField
				t.Emit.Through = &through
			}
		}
		applyOverrides(&t, overrides, owner)
		types = append(types, &t)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("read timeline activity types: %w", err)
	}
	slices.SortStableFunc(types, func(a, b *TimelineActivityType) int {
		return cmp.Or(strings.Compare(strings.ToLower(a.Name), strings.ToLower(b.Name)), strings.Compare(b.Name, a.Name))
	})
	return types, nil
}

var overrideEntryKeys = []string{"translations", "label", "icon", "isActive"}

func applyOverrides(t *TimelineActivityType, raw []byte, owner string) {
	var top map[string]json.RawMessage
	if len(raw) == 0 || json.Unmarshal(raw, &top) != nil {
		return
	}
	entries := []map[string]json.RawMessage{}
	if slices.ContainsFunc(overrideEntryKeys, func(key string) bool { _, ok := top[key]; return ok }) {
		entries = append(entries, top)
	} else {
		authors := slices.Sorted(maps.Keys(top))
		authors = append(slices.DeleteFunc(authors, func(author string) bool { return author == owner }), owner)
		for _, author := range authors {
			var entry map[string]json.RawMessage
			if json.Unmarshal(top[author], &entry) == nil {
				entries = append(entries, entry)
			}
		}
	}
	read := func(property string) (json.RawMessage, bool) {
		for _, entry := range entries {
			if value, ok := entry[property]; ok {
				return value, true
			}
		}
		return nil, false
	}
	if value, ok := read("label"); ok {
		var label string
		if json.Unmarshal(value, &label) == nil {
			t.Label = label
		}
	}
	if value, ok := read("icon"); ok {
		var icon *string
		if json.Unmarshal(value, &icon) == nil {
			t.Icon = icon
		}
	}
	if value, ok := read("isActive"); ok {
		var active bool
		if json.Unmarshal(value, &active) == nil {
			t.IsActive = active
		}
	}
}
