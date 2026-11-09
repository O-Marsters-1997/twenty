package workflow_test

import (
	"context"
	"encoding/json"
	"errors"
	"io"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/google/go-cmp/cmp"
	"github.com/twentyhq/twenty/packages/twenty-server-go/internal/messaging"
	"github.com/twentyhq/twenty/packages/twenty-server-go/internal/workflow"
)

type fakeMailer struct {
	sentTo, draftedTo string
	got               messaging.OutboundEmail
	err               error
}

func (f *fakeMailer) Send(_ context.Context, account string, email messaging.OutboundEmail) (string, error) {
	f.sentTo, f.got = account, email
	return "msg-1", f.err
}

func (f *fakeMailer) Draft(_ context.Context, account string, email messaging.OutboundEmail) (string, error) {
	f.draftedTo, f.got = account, email
	return "draft-1", f.err
}

const emailSettings = `{"connectedAccountId":"acc-1","to":["a@x.com"],"subject":"Hi","htmlBody":"<p>yo</p>"}`

func TestEmailActions(t *testing.T) {
	wantEmail := messaging.OutboundEmail{To: []string{"a@x.com"}, Subject: "Hi", HTMLBody: "<p>yo</p>"}

	t.Run("send returns the message id", func(t *testing.T) {
		mailer := &fakeMailer{}
		action := workflow.NewSendEmailAction(mailer)
		out, err := action.Run(t.Context(), workflow.StepInput{Settings: json.RawMessage(emailSettings)})
		if err != nil {
			t.Fatalf("Run() error = %v", err)
		}
		if diff := cmp.Diff(map[string]string{"messageId": "msg-1"}, out.Result); diff != "" {
			t.Errorf("Run() result (-want +got):\n%s", diff)
		}
		if diff := cmp.Diff(wantEmail, mailer.got); diff != "" {
			t.Errorf("mailer email (-want +got):\n%s", diff)
		}
		if mailer.sentTo != "acc-1" {
			t.Errorf("mailer account = %q, want acc-1", mailer.sentTo)
		}
		if action.Type() != workflow.ActionTypeSendEmail {
			t.Errorf("Type() = %q, want SEND_EMAIL", action.Type())
		}
	})

	t.Run("draft returns the draft id", func(t *testing.T) {
		mailer := &fakeMailer{}
		action := workflow.NewDraftEmailAction(mailer)
		out, err := action.Run(t.Context(), workflow.StepInput{Settings: json.RawMessage(emailSettings)})
		if err != nil {
			t.Fatalf("Run() error = %v", err)
		}
		if diff := cmp.Diff(map[string]string{"draftId": "draft-1"}, out.Result); diff != "" {
			t.Errorf("Run() result (-want +got):\n%s", diff)
		}
		if diff := cmp.Diff(wantEmail, mailer.got); diff != "" {
			t.Errorf("mailer email (-want +got):\n%s", diff)
		}
		if mailer.draftedTo != "acc-1" || action.Type() != workflow.ActionTypeDraftEmail {
			t.Errorf("drafted to %q, type %q", mailer.draftedTo, action.Type())
		}
	})

	t.Run("auth failure is a step error, not a run error", func(t *testing.T) {
		action := workflow.NewSendEmailAction(&fakeMailer{err: messaging.ErrAccountAuthFailed})
		out, err := action.Run(t.Context(), workflow.StepInput{Settings: json.RawMessage(emailSettings)})
		if err != nil || out.Error == "" {
			t.Errorf("Run() = %+v, %v; want step Error and nil error", out, err)
		}
	})

	t.Run("mailer failure is returned", func(t *testing.T) {
		boom := errors.New("boom")
		action := workflow.NewSendEmailAction(&fakeMailer{err: boom})
		if _, err := action.Run(t.Context(), workflow.StepInput{Settings: json.RawMessage(emailSettings)}); !errors.Is(err, boom) {
			t.Errorf("Run() error = %v, want %v", err, boom)
		}
	})

	t.Run("bad settings are rejected", func(t *testing.T) {
		action := workflow.NewSendEmailAction(&fakeMailer{})
		if _, err := action.Run(t.Context(), workflow.StepInput{Settings: json.RawMessage(`[`)}); err == nil {
			t.Error("Run() error = nil, want decode error")
		}
	})
}

func TestHTTPRequestAction(t *testing.T) {
	var gotMethod, gotHeader, gotBody string
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		body, err := io.ReadAll(r.Body)
		if err != nil {
			t.Errorf("read request body: %v", err)
		}
		gotMethod, gotHeader, gotBody = r.Method, r.Header.Get("X-Token"), string(body)
		w.WriteHeader(http.StatusTeapot)
		_, _ = w.Write([]byte("short"))
	}))
	t.Cleanup(server.Close)
	action := workflow.NewHTTPRequestAction(server.Client())

	run := func(t *testing.T, settings string) (workflow.StepOutput, error) {
		t.Helper()
		return action.Run(t.Context(), workflow.StepInput{Settings: json.RawMessage(settings)})
	}

	t.Run("sends method, headers and string body, returns status and body", func(t *testing.T) {
		out, err := run(t, `{"url":"`+server.URL+`","method":"PUT","headers":{"X-Token":"abc"},"body":"hello"}`)
		if err != nil {
			t.Fatalf("Run() error = %v", err)
		}
		want := map[string]any{"status": http.StatusTeapot, "body": "short"}
		if diff := cmp.Diff(want, out.Result); diff != "" {
			t.Errorf("Run() result (-want +got):\n%s", diff)
		}
		if gotMethod != "PUT" || gotHeader != "abc" || gotBody != "hello" {
			t.Errorf("server saw %q %q %q, want PUT abc hello", gotMethod, gotHeader, gotBody)
		}
	})

	t.Run("sends a JSON object body as-is", func(t *testing.T) {
		if _, err := run(t, `{"url":"`+server.URL+`","method":"POST","body":{"a":1}}`); err != nil {
			t.Fatalf("Run() error = %v", err)
		}
		if gotBody != `{"a":1}` {
			t.Errorf("server body = %q, want {\"a\":1}", gotBody)
		}
	})

	t.Run("unreachable server is an error", func(t *testing.T) {
		if _, err := run(t, `{"url":"http://127.0.0.1:1","method":"GET"}`); err == nil {
			t.Error("Run() error = nil, want transport error")
		}
	})
}
