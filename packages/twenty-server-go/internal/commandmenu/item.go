package commandmenu

import (
	"errors"

	"github.com/twentyhq/twenty/packages/twenty-server-go/internal/metadata"
)

var ErrPermissionDenied = errors.New("permission denied")

type PathPayload struct{ Path string }

func (PathPayload) IsCommandMenuItemPayload() {}

type Item struct {
	ID                                string
	UniversalIdentifier               string
	ApplicationID                     string
	WorkflowVersionID                 *string
	CoreWorkflowVersionID             *string
	EngineComponentKey                string
	Label                             string
	Icon                              *string
	ShortLabel                        *string
	Position                          float64
	IsPinned                          bool
	Payload                           *PathPayload
	HotKeys                           []string
	ConditionalAvailabilityExpression *string
	ConditionalPinnedExpression       *string
	AvailabilityType                  string
	AvailabilityObjectMetadataID      *string
	NavigationTargetObjectMetadataID  *string
	PageLayoutID                      *string
	IsActive                          bool
	CreatedAt                         metadata.Timestamp
	UpdatedAt                         metadata.Timestamp
}
