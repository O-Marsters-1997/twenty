package ai_test

import (
	"context"
	"encoding/json"
	"errors"
	"testing"

	"github.com/twentyhq/twenty/packages/twenty-server-go/internal/ai"
	"github.com/twentyhq/twenty/packages/twenty-server-go/internal/messaging"
)

type fakeMailer struct {
	sentFrom, draftedFrom string
	email                 messaging.OutboundEmail
	err                   error
}

func (f *fakeMailer) Send(_ context.Context, account string, email messaging.OutboundEmail) (string, error) {
	f.sentFrom, f.email = account, email
	return "m1", f.err
}

func (f *fakeMailer) Draft(_ context.Context, account string, email messaging.OutboundEmail) (string, error) {
	f.draftedFrom, f.email = account, email
	return "d1", f.err
}

type fakeOwnership map[string]bool

func (f fakeOwnership) OwnedBy(_ context.Context, workspaceMemberID, account string) (bool, error) {
	return f[workspaceMemberID+"/"+account], nil
}

func TestEmailTools(t *testing.T) {
	const input = `{"connectedAccountId":"a1","to":["x@example.com"],"subject":"Hi","htmlBody":"<p>yo</p>"}`
	newTools := func(mailer *fakeMailer) ai.Registry {
		return ai.NewRegistry(ai.NewEmailTools(mailer, fakeOwnership{"wm1/a1": true})...)
	}

	t.Run("registers both tools with valid schemas", func(t *testing.T) {
		registry := newTools(&fakeMailer{})
		for _, name := range []string{"send_email", "draft_email"} {
			tool, ok := registry.Lookup(name)
			if !ok || !json.Valid(tool.Spec().InputSchema) {
				t.Errorf("%s missing or invalid schema", name)
			}
		}
	})

	t.Run("send returns the message id", func(t *testing.T) {
		mailer := &fakeMailer{}
		out, err := call(t, newTools(mailer), "send_email", input)
		if err != nil || string(out) != `{"messageId":"m1"}` {
			t.Fatalf("got %s, %v", out, err)
		}
		if mailer.sentFrom != "a1" || mailer.email.Subject != "Hi" || mailer.email.To[0] != "x@example.com" {
			t.Errorf("mailer got %q %+v", mailer.sentFrom, mailer.email)
		}
	})

	t.Run("draft returns the draft id", func(t *testing.T) {
		mailer := &fakeMailer{}
		out, err := call(t, newTools(mailer), "draft_email", input)
		if err != nil || string(out) != `{"draftId":"d1"}` || mailer.draftedFrom != "a1" {
			t.Fatalf("got %s, %v", out, err)
		}
	})

	t.Run("auth failure becomes a readable tool result", func(t *testing.T) {
		out, err := call(t, newTools(&fakeMailer{err: messaging.ErrAccountAuthFailed}), "send_email", input)
		if err != nil || string(out) != `{"error":"connected account needs reconnecting"}` {
			t.Fatalf("got %s, %v", out, err)
		}
	})

	t.Run("other mailer errors fail the call", func(t *testing.T) {
		if _, err := call(t, newTools(&fakeMailer{err: errors.New("boom")}), "send_email", input); err == nil {
			t.Fatal("want error")
		}
	})

	t.Run("refuses an account the principal does not own", func(t *testing.T) {
		mailer := &fakeMailer{}
		other := `{"connectedAccountId":"a2","to":["x@example.com"],"subject":"Hi","htmlBody":"b"}`
		if _, err := call(t, newTools(mailer), "send_email", other); err == nil {
			t.Fatal("want refusal")
		}
		if mailer.sentFrom != "" {
			t.Error("mailer was called")
		}
	})
}
