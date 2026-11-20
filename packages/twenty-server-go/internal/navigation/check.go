package navigation

import (
	"fmt"
	"net/url"
	"regexp"
	"strings"

	"github.com/google/uuid"

	"github.com/twentyhq/twenty/packages/twenty-server-go/internal/metadata"
)

const maxFolderDepth = 2

var (
	allDigits    = regexp.MustCompile(`^\d+(?:/[a-zA-Z]*)?$`)
	hostnameForm = regexp.MustCompile(`^(([a-z0-9_]|xn--)?[a-z0-9-]{0,61}[a-z0-9]\.){1,10}(xn--)?([a-z0-9][a-z0-9-]{0,60}|[a-z0-9-]{1,30}\.[a-z]{2,})$`)
	ipForm       = regexp.MustCompile(`^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$`)
	controlChars = regexp.MustCompile(`[\x00-\x1f\x7f]`)
)

func invalid(format string, args ...any) error {
	return fmt.Errorf("%w: %s", metadata.ErrInvalidInput, fmt.Sprintf(format, args...))
}

func hasValue(value *string) bool { return value != nil && *value != "" }

func isUUID(value *string) bool {
	if value == nil {
		return false
	}
	_, err := uuid.Parse(*value)
	return err == nil
}

func checkFields(item Item) error {
	switch item.Type {
	case TypeFolder:
		if item.Name == nil || strings.TrimSpace(*item.Name) == "" {
			return invalid("A name is required for FOLDER type")
		}
	case TypeObject:
		if !isUUID(item.TargetObjectMetadataID) {
			return invalid("A valid targetObjectMetadataUniversalIdentifier is required for OBJECT type")
		}
	case TypeView:
		if !isUUID(item.ViewID) {
			return invalid("A valid viewUniversalIdentifier is required for VIEW type")
		}
	case TypeRecord:
		if !isUUID(item.TargetRecordID) {
			return invalid("A valid targetRecordId is required for RECORD type")
		}
		if !isUUID(item.TargetObjectMetadataID) {
			return invalid("A valid targetObjectMetadataUniversalIdentifier is required for RECORD type")
		}
	case TypeLink:
		if !hasValue(item.Link) || !(isURL(*item.Link) || isSafeInternalPath(*item.Link)) {
			return invalid("A valid link is required for LINK type")
		}
	case TypePageLayout:
		if !isUUID(item.PageLayoutID) {
			return invalid("A valid pageLayoutUniversalIdentifier is required for PAGE_LAYOUT type")
		}
	case "":
		return invalid("Navigation menu item type is required")
	default:
		return invalid("Unknown navigation menu item type %s", item.Type)
	}
	return nil
}

func checkPlacement(items map[string]Item, item Item) error {
	if item.FolderID == nil {
		return nil
	}
	if *item.FolderID == item.ID {
		return invalid("Navigation menu item cannot be its own parent")
	}
	visited := map[string]bool{}
	depth := 1
	for parentID := item.FolderID; parentID != nil; depth++ {
		switch {
		case depth > maxFolderDepth:
			return invalid("Navigation menu item hierarchy exceeds maximum depth of %d", maxFolderDepth)
		case *parentID == item.ID, visited[*parentID]:
			return invalid("Circular dependency detected in navigation menu item hierarchy")
		}
		visited[*parentID] = true
		parent, found := items[*parentID]
		if !found {
			break
		}
		parentID = parent.FolderID
	}
	if depth > maxFolderDepth {
		return invalid("Navigation menu item hierarchy exceeds maximum depth of %d", maxFolderDepth)
	}
	if _, found := items[*item.FolderID]; !found {
		return fmt.Errorf("%w: Parent navigation menu item not found", metadata.ErrNotFound)
	}
	return nil
}

func isURL(raw string) bool {
	trimmed := strings.TrimSpace(raw)
	lower := strings.ToLower(trimmed)
	if !strings.HasPrefix(lower, "http://") && !strings.HasPrefix(lower, "https://") {
		trimmed = "https://" + trimmed
	}
	withoutScheme := trimmed[strings.Index(trimmed, "://")+3:]
	if allDigits.MatchString(withoutScheme) {
		return false
	}
	parsed, err := url.Parse(trimmed)
	if err != nil {
		return false
	}
	host := strings.ToLower(parsed.Hostname())
	return hostnameForm.MatchString(host) || ipForm.MatchString(host) || host == "localhost"
}

func isSafeInternalPath(path string) bool {
	return path != "" &&
		(strings.HasPrefix(path, "/") || strings.HasPrefix(path, "#")) &&
		!strings.HasPrefix(path, "//") &&
		!strings.Contains(path, `\`) &&
		!controlChars.MatchString(path)
}
