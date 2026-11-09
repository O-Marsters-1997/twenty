package store

import "github.com/twentyhq/twenty/packages/twenty-server-go/internal/metadata"

type Account struct {
	ID                         string              `json:"id"`
	Handle                     string              `json:"handle"`
	Provider                   string              `json:"provider"`
	LastCredentialsRefreshedAt *metadata.Timestamp `json:"lastCredentialsRefreshedAt"`
	AuthFailedAt               *metadata.Timestamp `json:"authFailedAt"`
	AuthFailedReason           *string             `json:"authFailedReason"`
	ArchivedAt                 *metadata.Timestamp `json:"archivedAt"`
	HandleAliases              []string            `json:"handleAliases"`
	Scopes                     []string            `json:"scopes"`
	LastSignedInAt             *metadata.Timestamp `json:"lastSignedInAt"`
	UserWorkspaceID            string              `json:"userWorkspaceId"`
	ApplicationID              *string             `json:"applicationId"`
	Name                       *string             `json:"name"`
	Visibility                 string              `json:"visibility"`
	CreatedAt                  metadata.Timestamp  `json:"createdAt"`
	UpdatedAt                  metadata.Timestamp  `json:"updatedAt"`
}

type ApplicationAccount struct {
	Account
	IsOwnedByCurrentUser bool
}

type MessageChannel struct {
	ID                           string              `json:"id"`
	Visibility                   string              `json:"visibility"`
	Handle                       string              `json:"handle"`
	DisplayName                  *string             `json:"displayName"`
	Type                         string              `json:"type"`
	IsContactAutoCreationEnabled bool                `json:"isContactAutoCreationEnabled"`
	ContactAutoCreationPolicy    string              `json:"contactAutoCreationPolicy"`
	MessageFolderImportPolicy    string              `json:"messageFolderImportPolicy"`
	ExcludeNonProfessionalEmails bool                `json:"excludeNonProfessionalEmails"`
	ExcludeGroupEmails           bool                `json:"excludeGroupEmails"`
	PendingGroupEmailsAction     string              `json:"pendingGroupEmailsAction"`
	IsSyncEnabled                bool                `json:"isSyncEnabled"`
	SyncedAt                     *metadata.Timestamp `json:"syncedAt"`
	SyncStatus                   string              `json:"syncStatus"`
	SyncStage                    string              `json:"syncStage"`
	SyncStageStartedAt           *metadata.Timestamp `json:"syncStageStartedAt"`
	ThrottleFailureCount         int                 `json:"throttleFailureCount"`
	ThrottleRetryAfter           *metadata.Timestamp `json:"throttleRetryAfter"`
	ConnectedAccountID           string              `json:"connectedAccountId"`
	CreatedAt                    metadata.Timestamp  `json:"createdAt"`
	UpdatedAt                    metadata.Timestamp  `json:"updatedAt"`
}

type CalendarChannel struct {
	ID                           string              `json:"id"`
	Handle                       string              `json:"handle"`
	SyncStatus                   string              `json:"syncStatus"`
	SyncStage                    string              `json:"syncStage"`
	Visibility                   string              `json:"visibility"`
	IsContactAutoCreationEnabled bool                `json:"isContactAutoCreationEnabled"`
	ContactAutoCreationPolicy    string              `json:"contactAutoCreationPolicy"`
	IsSyncEnabled                bool                `json:"isSyncEnabled"`
	SyncedAt                     *metadata.Timestamp `json:"syncedAt"`
	SyncStageStartedAt           *metadata.Timestamp `json:"syncStageStartedAt"`
	ThrottleFailureCount         int                 `json:"throttleFailureCount"`
	ConnectedAccountID           string              `json:"connectedAccountId"`
	CreatedAt                    metadata.Timestamp  `json:"createdAt"`
	UpdatedAt                    metadata.Timestamp  `json:"updatedAt"`
}

type EmailGroupChannel struct {
	MessageChannel    MessageChannel
	ForwardingAddress string
}
