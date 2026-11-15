package systemmail

import (
	"bytes"
	"context"
	"crypto/tls"
	"errors"
	"fmt"
	"log/slog"
	"mime"
	"mime/multipart"
	"mime/quotedprintable"
	"net"
	"net/mail"
	"net/smtp"
	"net/textproto"
	"strconv"
	"time"

	"github.com/twentyhq/twenty/packages/twenty-server-go/internal/config"
)

const (
	smtpTimeout         = 30 * time.Second
	smtpImplicitTLSPort = 465
)

type Message struct {
	To, Subject, Text, HTML string
}

type Sender interface {
	Send(ctx context.Context, message Message) error
}

func NewSender(cfg config.Email, logger *slog.Logger) (Sender, error) {
	if cfg.Driver == "smtp" {
		if cfg.SMTPHost == "" {
			return nil, errors.New("EMAIL_SMTP_HOST is required when EMAIL_DRIVER is smtp")
		}
		return smtpSender{cfg: cfg}, nil
	}
	return loggerSender{logger: logger}, nil
}

type loggerSender struct{ logger *slog.Logger }

func (s loggerSender) Send(ctx context.Context, message Message) error {
	s.logger.InfoContext(ctx, "system email not sent: EMAIL_DRIVER is logger", "subject", message.Subject)
	return nil
}

type smtpSender struct{ cfg config.Email }

func (s smtpSender) Send(ctx context.Context, message Message) error {
	recipient, err := mail.ParseAddress(message.To)
	if err != nil {
		return fmt.Errorf("parse recipient: %w", err)
	}
	sender := mail.Address{Name: s.cfg.FromName, Address: s.cfg.FromAddress}
	body, err := encode(&sender, recipient, message)
	if err != nil {
		return err
	}

	client, err := s.dial(ctx)
	if err != nil {
		return err
	}
	defer func() { _ = client.Close() }()
	if err := s.deliver(client, sender.Address, recipient.Address, body); err != nil {
		return err
	}
	if err := client.Quit(); err != nil {
		return fmt.Errorf("quit smtp session: %w", err)
	}
	return nil
}

func (s smtpSender) dial(ctx context.Context) (*smtp.Client, error) {
	address := net.JoinHostPort(s.cfg.SMTPHost, strconv.Itoa(s.cfg.SMTPPort))
	dialer := net.Dialer{Timeout: smtpTimeout}
	var conn net.Conn
	var err error
	if s.cfg.SMTPPort == smtpImplicitTLSPort && !s.cfg.SMTPNoTLS {
		tlsDialer := tls.Dialer{NetDialer: &dialer, Config: &tls.Config{ServerName: s.cfg.SMTPHost}}
		conn, err = tlsDialer.DialContext(ctx, "tcp", address)
	} else {
		conn, err = dialer.DialContext(ctx, "tcp", address)
	}
	if err != nil {
		return nil, fmt.Errorf("dial smtp server: %w", err)
	}
	if err := conn.SetDeadline(time.Now().Add(smtpTimeout)); err != nil {
		_ = conn.Close()
		return nil, fmt.Errorf("set smtp deadline: %w", err)
	}
	client, err := smtp.NewClient(conn, s.cfg.SMTPHost)
	if err != nil {
		_ = conn.Close()
		return nil, fmt.Errorf("start smtp session: %w", err)
	}
	return client, nil
}

func (s smtpSender) deliver(client *smtp.Client, from, to string, body []byte) error {
	if !s.cfg.SMTPNoTLS {
		if hasTLS, _ := client.Extension("STARTTLS"); hasTLS {
			if err := client.StartTLS(&tls.Config{ServerName: s.cfg.SMTPHost}); err != nil {
				return fmt.Errorf("start tls: %w", err)
			}
		}
	}
	if s.cfg.SMTPUser != "" {
		if err := client.Auth(smtp.PlainAuth("", s.cfg.SMTPUser, s.cfg.SMTPPassword, s.cfg.SMTPHost)); err != nil {
			return fmt.Errorf("authenticate with smtp server: %w", err)
		}
	}
	if err := client.Mail(from); err != nil {
		return fmt.Errorf("set smtp sender: %w", err)
	}
	if err := client.Rcpt(to); err != nil {
		return fmt.Errorf("set smtp recipient: %w", err)
	}
	data, err := client.Data()
	if err != nil {
		return fmt.Errorf("open smtp data: %w", err)
	}
	if _, err := data.Write(body); err != nil {
		return fmt.Errorf("write smtp data: %w", err)
	}
	if err := data.Close(); err != nil {
		return fmt.Errorf("finish smtp data: %w", err)
	}
	return nil
}

func encode(from, to *mail.Address, message Message) ([]byte, error) {
	var body bytes.Buffer
	alternative := multipart.NewWriter(&body)
	fmt.Fprintf(&body, "From: %s\r\nTo: %s\r\nSubject: %s\r\nDate: %s\r\nMIME-Version: 1.0\r\nContent-Type: multipart/alternative; boundary=%s\r\n\r\n",
		from, to, mime.QEncoding.Encode("utf-8", message.Subject), time.Now().Format(time.RFC1123Z), alternative.Boundary())
	for _, part := range []struct{ contentType, content string }{
		{"text/plain", message.Text},
		{"text/html", message.HTML},
	} {
		writer, err := alternative.CreatePart(textproto.MIMEHeader{
			"Content-Type":              {part.contentType + "; charset=utf-8"},
			"Content-Transfer-Encoding": {"quoted-printable"},
		})
		if err != nil {
			return nil, fmt.Errorf("create mime part: %w", err)
		}
		encoder := quotedprintable.NewWriter(writer)
		if _, err := encoder.Write([]byte(part.content)); err != nil {
			return nil, fmt.Errorf("encode mime part: %w", err)
		}
		if err := encoder.Close(); err != nil {
			return nil, fmt.Errorf("encode mime part: %w", err)
		}
	}
	if err := alternative.Close(); err != nil {
		return nil, fmt.Errorf("close mime message: %w", err)
	}
	return body.Bytes(), nil
}
