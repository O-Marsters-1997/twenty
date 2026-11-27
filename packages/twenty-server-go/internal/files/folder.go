package files

import "slices"

type Folder string

const (
	FolderAgentChat       Folder = "agent-chat"
	FolderCorePicture     Folder = "core-picture"
	FolderDpa             Folder = "dpa"
	FolderEmailAttachment Folder = "email-attachment"
	FolderEmailImage      Folder = "email-image"
	FolderFilesField      Folder = "files-field"
	FolderPublicAsset     Folder = "public-asset"
	FolderWorkflow        Folder = "workflow"
)

const (
	immutableCacheControl   = "private, max-age=86400, immutable"
	publicAssetCacheControl = "public, max-age=3600"
)

type folderConfig struct {
	graphQLName       string
	ignoreTokenExpiry bool
	cacheControl      string
	allowedMIME       []string
	directUpload      bool
	servedByID        bool
}

var folderConfigs = map[Folder]folderConfig{
	FolderAgentChat:       {graphQLName: "AgentChat", cacheControl: immutableCacheControl, directUpload: true, servedByID: true},
	FolderCorePicture:     {graphQLName: "CorePicture", ignoreTokenExpiry: true, cacheControl: immutableCacheControl, allowedMIME: []string{"image/gif", "image/jpeg", "image/png", "image/svg+xml", "image/webp"}, directUpload: true, servedByID: true},
	FolderDpa:             {graphQLName: "Dpa", cacheControl: immutableCacheControl, servedByID: true},
	FolderEmailAttachment: {graphQLName: "EmailAttachment", cacheControl: immutableCacheControl, directUpload: true, servedByID: true},
	FolderEmailImage:      {graphQLName: "EmailImage", ignoreTokenExpiry: true, cacheControl: immutableCacheControl, allowedMIME: []string{"image/gif", "image/jpeg", "image/png", "image/webp"}, directUpload: true, servedByID: true},
	FolderFilesField:      {graphQLName: "FilesField", cacheControl: immutableCacheControl, directUpload: true, servedByID: true},
	FolderPublicAsset:     {graphQLName: "PublicAsset", ignoreTokenExpiry: true, cacheControl: publicAssetCacheControl},
	FolderWorkflow:        {graphQLName: "Workflow", cacheControl: immutableCacheControl, directUpload: true, servedByID: true},
}

var unsupportedFolders = map[string]Folder{
	"AppTarball": "app-tarball", "BuiltFrontComponent": "built-front-component", "BuiltLogicFunction": "built-logic-function",
	"Dependencies": "dependencies", "GeneratedSdkClient": "generated-sdk-client", "RecordExport": "record-export", "Source": "source",
}

func FolderFromGraphQL(name string) (Folder, bool) {
	for folder, config := range folderConfigs {
		if config.graphQLName == name {
			return folder, true
		}
	}
	folder, found := unsupportedFolders[name]
	return folder, found
}

func (f Folder) allowsMIME(mimeType string) bool {
	allowed := folderConfigs[f].allowedMIME
	return allowed == nil || slices.Contains(allowed, mimeType)
}
