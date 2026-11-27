package filesgql

import (
	"context"

	"github.com/twentyhq/twenty/packages/twenty-server-go/internal/auth"
	"github.com/twentyhq/twenty/packages/twenty-server-go/internal/files"
)

type Resolver struct {
	Files *files.Service
}

func principalFrom(ctx context.Context) (auth.Principal, error) {
	principal, ok := auth.PrincipalFrom(ctx)
	if !ok {
		return auth.Principal{}, auth.ErrUnauthenticated
	}
	return principal, nil
}

func (r *mutationResolver) CreateFileUpload(ctx context.Context, filename string, size float64, fileFolder string, fieldMetadataID, fieldMetadataUniversalIdentifier *string) (*files.UploadTarget, error) {
	principal, err := principalFrom(ctx)
	if err != nil {
		return nil, err
	}
	folder, _ := files.FolderFromGraphQL(fileFolder)
	target, err := r.Files.CreateUpload(ctx, principal, files.CreateUploadInput{
		Filename:         filename,
		Size:             size,
		Folder:           folder,
		FieldMetadataID:  deref(fieldMetadataID),
		FieldMetadataUID: deref(fieldMetadataUniversalIdentifier),
	})
	return &target, err
}

func (r *mutationResolver) CompleteFileUpload(ctx context.Context, fileID string) (*files.SignedFile, error) {
	return complete(ctx, func(principal auth.Principal) (files.SignedFile, error) {
		return r.Files.Complete(ctx, principal, fileID)
	})
}

func (r *mutationResolver) CompleteWorkspaceLogoUpload(ctx context.Context, fileID string) (*files.SignedFile, error) {
	return complete(ctx, func(principal auth.Principal) (files.SignedFile, error) {
		return r.Files.CompleteWorkspaceLogo(ctx, principal, fileID)
	})
}

func (r *mutationResolver) CompleteWorkspaceMemberProfilePictureUpload(ctx context.Context, fileID string) (*files.SignedFile, error) {
	return complete(ctx, func(principal auth.Principal) (files.SignedFile, error) {
		return r.Files.CompleteProfilePicture(ctx, principal, fileID)
	})
}

func (r *mutationResolver) CreateNewWorkspaceLogoUpload(ctx context.Context, workspaceID, filename string, size float64) (*files.UploadTarget, error) {
	principal, err := principalFrom(ctx)
	if err != nil {
		return nil, err
	}
	target, err := r.Files.CreateNewWorkspaceLogoUpload(ctx, principal, workspaceID, filename, size)
	return &target, err
}

func (r *mutationResolver) CompleteNewWorkspaceLogoUpload(ctx context.Context, workspaceID, fileID string) (*files.SignedFile, error) {
	return complete(ctx, func(principal auth.Principal) (files.SignedFile, error) {
		return r.Files.CompleteNewWorkspaceLogoUpload(ctx, principal, workspaceID, fileID)
	})
}

func (r *queryResolver) Empty(context.Context) (*bool, error) { return nil, nil }

func complete(ctx context.Context, run func(auth.Principal) (files.SignedFile, error)) (*files.SignedFile, error) {
	principal, err := principalFrom(ctx)
	if err != nil {
		return nil, err
	}
	signed, err := run(principal)
	return &signed, err
}

func deref(value *string) string {
	if value == nil {
		return ""
	}
	return *value
}

func (r *Resolver) Mutation() MutationResolver { return &mutationResolver{r} }
func (r *Resolver) Query() QueryResolver       { return &queryResolver{r} }

type (
	mutationResolver struct{ *Resolver }
	queryResolver    struct{ *Resolver }
)
