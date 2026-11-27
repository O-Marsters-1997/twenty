package eventstream_test

import (
	"encoding/json"
	"errors"
	"testing"
	"time"

	"github.com/google/go-cmp/cmp"

	"github.com/twentyhq/twenty/packages/twenty-server-go/internal/auth"
	"github.com/twentyhq/twenty/packages/twenty-server-go/internal/eventstream"
	"github.com/twentyhq/twenty/packages/twenty-server-go/internal/frontdoor"
)

func TestSubscriber_Subscribe(t *testing.T) {
	t.Parallel()
	hub := eventstream.NewHub()
	subscriber := eventstream.NewSubscriber(hub)
	ctx := auth.WithPrincipal(t.Context(), auth.Principal{WorkspaceID: workspaceID, UserWorkspaceID: "alice"})
	request := json.RawMessage(`{"variables":{"eventStreamId":"s1"}}`)

	out, err := subscriber.Subscribe(ctx, frontdoor.EndpointMetadata, request)
	if err != nil {
		t.Fatal(err)
	}
	next := func() any {
		select {
		case payload := <-out:
			var decoded any
			if err := json.Unmarshal(payload, &decoded); err != nil {
				t.Fatal(err)
			}
			return decoded
		case <-time.After(5 * time.Second):
			t.Fatal("no payload")
			return nil
		}
	}
	wantFirst := map[string]any{"data": map[string]any{"onEventSubscription": map[string]any{
		"eventStreamId": "s1", "objectRecordEventsWithQueryIds": []any{}, "metadataEvents": []any{}, "queueJobEvents": []any{},
	}}}
	if diff := cmp.Diff(wantFirst, next()); diff != "" {
		t.Errorf("first payload (-want +got):\n%s", diff)
	}

	if _, err := hub.AddQuery(workspaceID, "s1", eventstream.Owner{UserWorkspaceID: "alice"}, "q", map[string]any{"objectNameSingular": "person"}); err != nil {
		t.Fatal(err)
	}
	hub.Publish(workspaceID, eventstream.Event{Action: "created", ObjectNameSingular: "person", RecordID: "p1"})
	got := next().(map[string]any)["data"].(map[string]any)["onEventSubscription"].(map[string]any)["objectRecordEventsWithQueryIds"].([]any)
	if len(got) != 1 || got[0].(map[string]any)["queryIds"].([]any)[0] != "q" {
		t.Errorf("event batch = %v, want one event for query q", got)
	}

	other := auth.WithPrincipal(t.Context(), auth.Principal{WorkspaceID: workspaceID, UserWorkspaceID: "bob"})
	_, err = subscriber.Subscribe(other, frontdoor.EndpointMetadata, request)
	var failure *frontdoor.SubscribeError
	if !errors.As(err, &failure) || failure.SubCode != "EVENT_STREAM_ALREADY_EXISTS" {
		t.Errorf("Subscribe by another user = %v, want EVENT_STREAM_ALREADY_EXISTS", err)
	}
}
