package systemmail

import (
	"context"
	"net/smtp"
	"strings"
	"testing"
)

func TestSMTPSender_Send(t *testing.T) {
	var gotAddr, gotFrom string
	var gotTo []string
	var gotMsg string
	var gotAuth smtp.Auth
	sender := smtpSender{
		config: SMTPConfig{Host: "smtp.example.com", Port: "587", User: "u", Password: "p", FromName: "Twenty", FromAddress: "noreply@example.com"},
		send: func(addr string, auth smtp.Auth, from string, to []string, msg []byte) error {
			gotAddr, gotAuth, gotFrom, gotTo, gotMsg = addr, auth, from, to, string(msg)
			return nil
		},
	}

	err := sender.Send(context.Background(), Message{To: "a@b.com", Subject: "Hi", Text: "plain", HTML: "<b>html</b>"})
	if err != nil {
		t.Fatal(err)
	}
	if gotAddr != "smtp.example.com:587" || gotFrom != "noreply@example.com" || len(gotTo) != 1 || gotTo[0] != "a@b.com" || gotAuth == nil {
		t.Errorf("envelope = %q %q %v auth=%v", gotAddr, gotFrom, gotTo, gotAuth)
	}
	for _, want := range []string{"From: \"Twenty\" <noreply@example.com>", "To: a@b.com", "Subject: Hi", "text/plain", "text/html", "plain", "<b>html</b>"} {
		if !strings.Contains(gotMsg, want) {
			t.Errorf("message missing %q:\n%s", want, gotMsg)
		}
	}
}

func TestSMTPSender_NoAuthWithoutUser(t *testing.T) {
	var gotAuth smtp.Auth = smtp.PlainAuth("", "x", "y", "z")
	sender := smtpSender{config: SMTPConfig{Host: "h", Port: "25"}, send: func(_ string, auth smtp.Auth, _ string, _ []string, _ []byte) error {
		gotAuth = auth
		return nil
	}}
	if err := sender.Send(context.Background(), Message{To: "a@b.com"}); err != nil {
		t.Fatal(err)
	}
	if gotAuth != nil {
		t.Errorf("auth = %v, want nil", gotAuth)
	}
}

func TestVerificationEmail(t *testing.T) {
	signup, err := VerificationEmail("a@b.com", "https://x/verify?a=1&b=2", false)
	if err != nil {
		t.Fatal(err)
	}
	if signup.Subject != "Welcome to Twenty: Please Confirm Your Email" || !strings.Contains(signup.Text, "https://x/verify?a=1&b=2") || !strings.Contains(signup.HTML, "Verify Email") {
		t.Errorf("signup = %+v", signup)
	}
	update, err := VerificationEmail("a@b.com", "https://x", true)
	if err != nil {
		t.Fatal(err)
	}
	if update.Subject != "Please confirm your updated email" || !strings.Contains(update.HTML, "Confirm new email") {
		t.Errorf("update = %+v", update)
	}
}

func TestResetEmail(t *testing.T) {
	reset, err := ResetEmail("a@b.com", "https://x/reset/t", "5 minutes", true)
	if err != nil {
		t.Fatal(err)
	}
	if reset.Subject != "Action Needed to Reset Password" || !strings.Contains(reset.HTML, "next 5 minutes") || !strings.Contains(reset.HTML, "Reset your password") {
		t.Errorf("reset = %+v", reset)
	}
	set, err := ResetEmail("a@b.com", "https://x", "5 minutes", false)
	if err != nil {
		t.Fatal(err)
	}
	if set.Subject != "Action Needed to Set Password" || !strings.Contains(set.Text, "Set your password") {
		t.Errorf("set = %+v", set)
	}
}
