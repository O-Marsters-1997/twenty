package messaginggql

import (
	"context"
	"errors"

	"github.com/twentyhq/twenty/packages/twenty-server-go/internal/auth"
	"github.com/twentyhq/twenty/packages/twenty-server-go/internal/messaging"
	"github.com/twentyhq/twenty/packages/twenty-server-go/internal/messaging/store"
	"github.com/twentyhq/twenty/packages/twenty-server-go/internal/metadata"
)

var errNoWorkspaceMember = errors.New("no workspace member for the signed-in user")

type Resolver struct {
	Timeline *store.Timeline
	Banners  *store.ReconnectBanners
}

func (r *mutationResolver) DismissReconnectAccountBanner(ctx context.Context, connectedAccountID string) (bool, error) {
	principal, ok := auth.PrincipalFrom(ctx)
	if !ok || principal.UserID == "" {
		return false, auth.ErrUnauthenticated
	}
	if err := r.Banners.Dismiss(ctx, principal.UserID, principal.WorkspaceID, connectedAccountID); err != nil {
		return false, err
	}
	return true, nil
}

func (r *queryResolver) GetTimelineThreadsFromObjectRecord(ctx context.Context, objectNameSingular string, recordID string, page int, pageSize int) (*messaging.TimelineThreadsWithTotal, error) {
	principal, ok := auth.PrincipalFrom(ctx)
	if !ok {
		return nil, auth.ErrUnauthenticated
	}
	if principal.WorkspaceMemberID == "" {
		return nil, errNoWorkspaceMember
	}
	threads, err := r.Timeline.ThreadsForRecord(ctx, principal.UserWorkspaceID, objectNameSingular, recordID, page, pageSize)
	if err != nil {
		return nil, err
	}
	return &threads, nil
}

func (r *queryResolver) GetTimelineThreadsFromPersonID(ctx context.Context, personID string, page int, pageSize int) (*messaging.TimelineThreadsWithTotal, error) {
	return r.GetTimelineThreadsFromObjectRecord(ctx, "person", personID, page, pageSize)
}

func (r *queryResolver) GetTimelineThreadsFromCompanyID(ctx context.Context, companyID string, page int, pageSize int) (*messaging.TimelineThreadsWithTotal, error) {
	return r.GetTimelineThreadsFromObjectRecord(ctx, "company", companyID, page, pageSize)
}

func (r *queryResolver) GetTimelineThreadsFromOpportunityID(ctx context.Context, opportunityID string, page int, pageSize int) (*messaging.TimelineThreadsWithTotal, error) {
	return r.GetTimelineThreadsFromObjectRecord(ctx, "opportunity", opportunityID, page, pageSize)
}

func (r *timelineThreadResolver) LastMessageReceivedAt(_ context.Context, thread *messaging.TimelineThread) (*metadata.Timestamp, error) {
	return &metadata.Timestamp{Time: thread.LastMessageReceivedAt}, nil
}

func (r *Resolver) Mutation() MutationResolver { return &mutationResolver{r} }

func (r *Resolver) Query() QueryResolver { return &queryResolver{r} }

func (r *Resolver) TimelineThread() TimelineThreadResolver { return &timelineThreadResolver{r} }

type (
	mutationResolver       struct{ *Resolver }
	queryResolver          struct{ *Resolver }
	timelineThreadResolver struct{ *Resolver }
)
