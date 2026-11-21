package navigation

import (
	"errors"

	"github.com/twentyhq/twenty/packages/twenty-server-go/internal/metadata"
)

var ErrPermissionDenied = errors.New("permission denied")

const (
	TypeFolder     = "FOLDER"
	TypeObject     = "OBJECT"
	TypeView       = "VIEW"
	TypeRecord     = "RECORD"
	TypeLink       = "LINK"
	TypePageLayout = "PAGE_LAYOUT"
)

type Item struct {
	ID                     string
	Type                   string
	UserWorkspaceID        *string
	TargetRecordID         *string
	TargetObjectMetadataID *string
	ViewID                 *string
	FolderID               *string
	PageLayoutID           *string
	Name                   *string
	Link                   *string
	Icon                   *string
	Color                  *string
	Position               float64
	ApplicationID          string
	CreatedAt              metadata.Timestamp
	UpdatedAt              metadata.Timestamp
}

type CreateInput struct {
	ID                     *string
	UserWorkspaceID        *string
	TargetRecordID         *string
	TargetObjectMetadataID *string
	ViewID                 *string
	Type                   string
	Name                   *string
	Link                   *string
	Icon                   *string
	Color                  *string
	FolderID               *string
	PageLayoutID           *string
	Position               *float64
}

type RecordIdentifier struct {
	ID              string
	LabelIdentifier string
	ImageIdentifier *string
}
