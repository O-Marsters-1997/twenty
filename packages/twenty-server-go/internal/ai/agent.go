package ai

import (
	"errors"

	"github.com/twentyhq/twenty/packages/twenty-server-go/internal/metadata"
)

// ErrForbidden marks an operation the caller may not perform, such as assigning a role that cannot go to agents.
var ErrForbidden = errors.New("forbidden")

// AgentRecord is an agent as the metadata GraphQL API exposes it, with the id of its assigned role.
type AgentRecord struct {
	ID                 string             `json:"id"`
	Name               string             `json:"name"`
	Label              string             `json:"label"`
	Icon               *string            `json:"icon"`
	Description        *string            `json:"description"`
	Prompt             string             `json:"prompt"`
	ModelID            string             `json:"modelId"`
	ResponseFormat     any                `json:"responseFormat"`
	RoleID             *string            `json:"roleId"`
	IsCustom           bool               `json:"isCustom"`
	IsSystem           bool               `json:"isSystem"`
	ApplicationID      *string            `json:"applicationId"`
	CreatedAt          metadata.Timestamp `json:"createdAt"`
	UpdatedAt          metadata.Timestamp `json:"updatedAt"`
	ModelConfiguration any                `json:"modelConfiguration"`
	Triggers           []any              `json:"triggers"`
}
