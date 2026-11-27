// Package systemmail sends Twenty's own transactional email over SMTP.
package systemmail

import (
	"bytes"
	"context"
	"fmt"
	htmltemplate "html/template"
	"mime"
	"mime/multipart"
	"mime/quotedprintable"
	"net/mail"
	"net/smtp"
	"net/textproto"
	"strings"
)

// Message is one outbound system email.
type Message struct {
	To, Subject, Text, HTML string
}

// Sender delivers system email.
type Sender interface {
	Send(ctx context.Context, message Message) error
}

// SMTPConfig mirrors the EMAIL_* and EMAIL_SMTP_* server variables.
type SMTPConfig struct {
	Host, Port, User, Password string
	FromName, FromAddress      string
}

type smtpSender struct {
	config SMTPConfig
	send   func(addr string, auth smtp.Auth, from string, to []string, msg []byte) error
}

// NewSMTPSender returns a Sender that relays through the configured SMTP server.
func NewSMTPSender(config SMTPConfig) Sender {
	return smtpSender{config: config, send: smtp.SendMail}
}

func (s smtpSender) Send(ctx context.Context, message Message) error {
	if err := ctx.Err(); err != nil {
		return fmt.Errorf("send email: %w", err)
	}
	var auth smtp.Auth
	if s.config.User != "" {
		auth = smtp.PlainAuth("", s.config.User, s.config.Password, s.config.Host)
	}
	raw, err := s.encode(message)
	if err != nil {
		return err
	}
	addr := s.config.Host + ":" + s.config.Port
	if err := s.send(addr, auth, s.config.FromAddress, []string{message.To}, raw); err != nil {
		return fmt.Errorf("send email: %w", err)
	}
	return nil
}

func (s smtpSender) encode(message Message) ([]byte, error) {
	from := mail.Address{Name: s.config.FromName, Address: s.config.FromAddress}
	var body bytes.Buffer
	writer := multipart.NewWriter(&body)
	for _, part := range []struct{ contentType, content string }{
		{"text/plain", message.Text},
		{"text/html", message.HTML},
	} {
		partWriter, err := writer.CreatePart(textproto.MIMEHeader{
			"Content-Type":              {part.contentType + "; charset=utf-8"},
			"Content-Transfer-Encoding": {"quoted-printable"},
		})
		if err != nil {
			return nil, fmt.Errorf("encode email: %w", err)
		}
		encoder := quotedprintable.NewWriter(partWriter)
		if _, err := encoder.Write([]byte(part.content)); err != nil {
			return nil, fmt.Errorf("encode email: %w", err)
		}
		if err := encoder.Close(); err != nil {
			return nil, fmt.Errorf("encode email: %w", err)
		}
	}
	if err := writer.Close(); err != nil {
		return nil, fmt.Errorf("encode email: %w", err)
	}

	var raw bytes.Buffer
	fmt.Fprintf(&raw, "From: %s\r\nTo: %s\r\nSubject: %s\r\nMIME-Version: 1.0\r\nContent-Type: multipart/alternative; boundary=%s\r\n\r\n",
		from.String(), message.To, mime.QEncoding.Encode("utf-8", message.Subject), writer.Boundary())
	raw.Write(body.Bytes())
	return raw.Bytes(), nil
}

var (
	verificationTemplate = htmltemplate.Must(htmltemplate.New("verification").Parse(
		`<h1>{{.Title}}</h1><p>{{.Body}}</p><p><a href="{{.Link}}">{{.Action}}</a></p>`))
	resetTemplate = htmltemplate.Must(htmltemplate.New("reset").Parse(
		`<h1>{{.Title}}</h1><p>This link is only valid for the next {{.Duration}}. If the link does not work, you can use the login verification link directly:<br><a href="{{.Link}}">{{.Link}}</a></p><p><a href="{{.Link}}">{{.Action}}</a></p>`))
)

// VerificationEmail builds the English email-verification message; isEmailUpdate selects the change-of-address wording.
func VerificationEmail(to, link string, isEmailUpdate bool) (Message, error) {
	data := struct{ Title, Body, Link, Action string }{
		Title:  "Confirm your email address",
		Body:   "Thanks for registering for an account on Twenty! Before we get started, we just need to confirm that this is you. Click below to verify your email address.",
		Link:   link,
		Action: "Verify Email",
	}
	subject := "Welcome to Twenty: Please Confirm Your Email"
	if isEmailUpdate {
		data.Title = "Confirm your new email address"
		data.Body = "We received a request to change the email address associated with your Twenty account. Click below to confirm this change."
		data.Action = "Confirm new email"
		subject = "Please confirm your updated email"
	}
	return render(verificationTemplate, to, subject, data.Title+"\n\n"+data.Body+"\n\n"+data.Action+": "+link, data)
}

// ResetEmail builds the English password-reset message; hasPassword selects reset versus set wording.
func ResetEmail(to, link, duration string, hasPassword bool) (Message, error) {
	verb := "Set"
	if hasPassword {
		verb = "Reset"
	}
	data := struct{ Title, Duration, Link, Action string }{
		Title:    verb + " your password 🗝",
		Duration: duration,
		Link:     link,
		Action:   verb,
	}
	text := fmt.Sprintf("%s\n\nThis link is only valid for the next %s. If the link does not work, you can use the login verification link directly:\n%s", data.Title, duration, link)
	return render(resetTemplate, to, "Action Needed to "+verb+" Password", text, data)
}

func InvitationEmail(to, link, senderName, workspaceName string) (Message, error) {
	data := struct{ Title, Body, Link, Action string }{
		Title:  "Join your team on Twenty",
		Body:   senderName + " has invited you to join a workspace called " + workspaceName + ".",
		Link:   link,
		Action: "Accept invite",
	}
	return render(verificationTemplate, to, data.Title, data.Title+"\n\n"+data.Body+"\n\n"+data.Action+": "+link, data)
}

func render(tmpl *htmltemplate.Template, to, subject, text string, data any) (Message, error) {
	var html strings.Builder
	if err := tmpl.Execute(&html, data); err != nil {
		return Message{}, fmt.Errorf("render %s email: %w", tmpl.Name(), err)
	}
	return Message{To: to, Subject: subject, Text: text, HTML: html.String()}, nil
}
