package membership

import (
	"context"
	"errors"
	"fmt"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgconn"
	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/twentyhq/twenty/packages/twenty-server-go/internal/workspace"
)

var (
	ErrEmailTaken        = errors.New("email already in use")
	ErrUserNotFound      = errors.New("user not found")
	ErrWorkspaceNotFound = errors.New("workspace not found")
)

const uniqueViolation = "23505"

// Store holds the primitives sign-up and invitation flows compose.
type Store struct{ pool *pgxpool.Pool }

func New(pool *pgxpool.Pool) *Store { return &Store{pool: pool} }

type NewUser struct {
	Email           string
	FirstName       string
	LastName        string
	Locale          string
	PasswordHash    string
	IsEmailVerified bool
}

func (s *Store) CreateUser(ctx context.Context, user NewUser) (string, error) {
	locale := user.Locale
	if locale == "" {
		locale = "en"
	}
	var id string
	err := s.pool.QueryRow(ctx,
		`INSERT INTO core."user" (email, "firstName", "lastName", locale, "passwordHash", "isEmailVerified")
		 VALUES ($1, $2, $3, $4, NULLIF($5, ''), $6) RETURNING id::text`,
		user.Email, user.FirstName, user.LastName, locale, user.PasswordHash, user.IsEmailVerified,
	).Scan(&id)
	var pgErr *pgconn.PgError
	switch {
	case errors.As(err, &pgErr) && pgErr.Code == uniqueViolation:
		return "", ErrEmailTaken
	case err != nil:
		return "", fmt.Errorf("insert user: %w", err)
	}
	return id, nil
}

func (s *Store) AddUserToWorkspace(ctx context.Context, userID, workspaceID string) (string, error) {
	if _, err := uuid.Parse(userID); err != nil {
		return "", ErrUserNotFound
	}
	if workspaceID != workspace.PinnedWorkspaceID {
		return "", ErrWorkspaceNotFound
	}
	tx, err := s.pool.Begin(ctx)
	if err != nil {
		return "", fmt.Errorf("begin add user to workspace: %w", err)
	}
	defer func() { _ = tx.Rollback(ctx) }()

	var email, firstName, lastName, locale string
	err = tx.QueryRow(ctx,
		`SELECT email::text, "firstName", "lastName", locale FROM core."user" WHERE id = $1::uuid AND "deletedAt" IS NULL`, userID,
	).Scan(&email, &firstName, &lastName, &locale)
	if errors.Is(err, pgx.ErrNoRows) {
		return "", ErrUserNotFound
	}
	if err != nil {
		return "", fmt.Errorf("look up user: %w", err)
	}

	var defaultRoleID *string
	var applicationID string
	err = tx.QueryRow(ctx,
		`SELECT "defaultRoleId"::text, "workspaceCustomApplicationId"::text FROM core.workspace WHERE id = $1::uuid AND "deletedAt" IS NULL`, workspaceID,
	).Scan(&defaultRoleID, &applicationID)
	if errors.Is(err, pgx.ErrNoRows) {
		return "", ErrWorkspaceNotFound
	}
	if err != nil {
		return "", fmt.Errorf("look up workspace: %w", err)
	}

	var userWorkspaceID string
	err = tx.QueryRow(ctx,
		`INSERT INTO core."userWorkspace" ("userId", "workspaceId", locale) VALUES ($1::uuid, $2::uuid, $3)
		 ON CONFLICT ("userId", "workspaceId") WHERE "deletedAt" IS NULL DO NOTHING RETURNING id::text`,
		userID, workspaceID, locale,
	).Scan(&userWorkspaceID)
	if errors.Is(err, pgx.ErrNoRows) {
		if err := tx.QueryRow(ctx,
			`SELECT id::text FROM core."userWorkspace" WHERE "userId" = $1::uuid AND "workspaceId" = $2::uuid AND "deletedAt" IS NULL`,
			userID, workspaceID,
		).Scan(&userWorkspaceID); err != nil {
			return "", fmt.Errorf("look up user workspace: %w", err)
		}
		return userWorkspaceID, nil
	}
	if err != nil {
		return "", fmt.Errorf("insert user workspace: %w", err)
	}

	if _, err := tx.Exec(ctx,
		`INSERT INTO `+workspace.SchemaName()+`."workspaceMember" ("userId", "userEmail", "nameFirstName", "nameLastName", locale)
		 VALUES ($1::uuid, $2, $3, $4, $5)`,
		userID, email, firstName, lastName, locale,
	); err != nil {
		return "", fmt.Errorf("insert workspace member: %w", err)
	}

	if defaultRoleID != nil {
		if _, err := tx.Exec(ctx,
			`INSERT INTO core."roleTarget" ("workspaceId", "roleId", "userWorkspaceId", "universalIdentifier", "applicationId")
			 VALUES ($1::uuid, $2::uuid, $3::uuid, gen_random_uuid(), $4::uuid)`,
			workspaceID, *defaultRoleID, userWorkspaceID, applicationID,
		); err != nil {
			return "", fmt.Errorf("assign default role: %w", err)
		}
	}

	if _, err := tx.Exec(ctx,
		`INSERT INTO core."keyValuePair" ("userId", "workspaceId", key, value, type)
		 SELECT $1::uuid, $2::uuid, 'ONBOARDING_CREATE_PROFILE_PENDING', 'true'::jsonb, 'USER_VARIABLE'
		 WHERE NOT EXISTS (SELECT 1 FROM core."keyValuePair"
		     WHERE "userId" = $1::uuid AND "workspaceId" = $2::uuid AND key = 'ONBOARDING_CREATE_PROFILE_PENDING' AND "deletedAt" IS NULL)`,
		userID, workspaceID,
	); err != nil {
		return "", fmt.Errorf("flag onboarding: %w", err)
	}

	if err := tx.Commit(ctx); err != nil {
		return "", fmt.Errorf("commit add user to workspace: %w", err)
	}
	return userWorkspaceID, nil
}
