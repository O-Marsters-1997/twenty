package messaging_test

import (
	"testing"
	"time"

	"github.com/google/go-cmp/cmp"

	"github.com/twentyhq/twenty/packages/twenty-server-go/internal/messaging"
)

func sender(handle string) messaging.ThreadSender {
	return messaging.ThreadSender{Handle: &handle}
}

func TestFormatThreads(t *testing.T) {
	t.Parallel()
	thread := messaging.ThreadSummary{ID: "t1", Subject: "Hi", LastMessageBody: "body", LastMessageReceivedAt: time.Unix(0, 0), MessageCount: 3}
	senders := map[string][]messaging.ThreadSender{"t1": {sender("a"), sender("b"), sender("c"), sender("d")}}

	got, err := messaging.FormatThreads([]messaging.ThreadSummary{thread, {ID: "no-senders"}}, senders, map[string]string{"t1": messaging.VisibilitySubject})
	if err != nil {
		t.Fatal(err)
	}
	if len(got) != 1 {
		t.Fatalf("FormatThreads returned %d threads, want only the one with senders", len(got))
	}
	var handles []string
	for _, participant := range got[0].LastTwoParticipants {
		handles = append(handles, participant.Handle)
	}
	if diff := cmp.Diff([]string{"d", "c"}, handles); diff != "" {
		t.Errorf("last two participants (-want +got):\n%s", diff)
	}
	if got[0].FirstParticipant.Handle != "a" || got[0].ParticipantCount != 4 {
		t.Errorf("first participant = %q, count = %d, want a, 4", got[0].FirstParticipant.Handle, got[0].ParticipantCount)
	}
	if got[0].Subject != "Hi" || got[0].LastMessageBody != "FIELD_RESTRICTED_ADDITIONAL_PERMISSIONS_REQUIRED" {
		t.Errorf("subject = %q, body = %q, want the subject kept and body restricted", got[0].Subject, got[0].LastMessageBody)
	}
}

func TestFormatThreads_senderWithoutHandle(t *testing.T) {
	t.Parallel()
	_, err := messaging.FormatThreads([]messaging.ThreadSummary{{ID: "t1"}}, map[string][]messaging.ThreadSender{"t1": {{}}}, nil)
	if err == nil {
		t.Error("FormatThreads with a handle-less sender returned no error")
	}
}
