package messaging_test

import (
	"testing"

	"github.com/google/go-cmp/cmp"

	"github.com/twentyhq/twenty/packages/twenty-server-go/internal/messaging"
)

func TestResolveAudience(t *testing.T) {
	t.Parallel()
	members := []messaging.ListMember{
		{PersonID: "p1", Email: " Ada@Example.com ", FirstName: "Ada"},
		{PersonID: "p2", Email: "ada@example.com"},
		{PersonID: "p3"},
		{PersonID: "p4", Email: "bounced@example.com"},
		{PersonID: "p5", Email: "out@example.com"},
		{PersonID: "p6", Email: "topic@example.com"},
		{PersonID: "p7", Email: "tracked@example.com"},
	}
	suppressions := []messaging.Suppression{
		{Email: "bounced@example.com", Reason: "BOUNCE"},
		{Email: "out@example.com", Reason: "UNSUBSCRIBE"},
		{Email: "topic@example.com", Reason: "UNSUBSCRIBE", TopicID: "t1"},
		{Email: "tracked@example.com", Reason: "TRACKING"},
	}

	recipients, audience := messaging.ResolveAudience(members, suppressions)

	wantAudience := messaging.Audience{
		TotalMembers: 7, WithoutEmail: 1, DuplicateEmails: 1, HardSuppressed: 1,
		GloballyUnsubscribed: 1, TopicUnsubscribed: 1, TrackingRefused: 1, Sendable: 2,
	}
	if diff := cmp.Diff(wantAudience, audience); diff != "" {
		t.Errorf("audience (-want +got):\n%s", diff)
	}
	wantRecipients := []messaging.Recipient{
		{PersonID: "p1", Email: "ada@example.com", Variables: map[string]any{"name.firstName": "Ada", "name.lastName": ""}},
		{PersonID: "p7", Email: "tracked@example.com", Variables: map[string]any{"name.firstName": "", "name.lastName": ""}},
	}
	if diff := cmp.Diff(wantRecipients, recipients); diff != "" {
		t.Errorf("recipients (-want +got):\n%s", diff)
	}
}
