package systemmail_test

import (
	"bufio"
	"errors"
	"io"
	"log/slog"
	"mime"
	"mime/multipart"
	"mime/quotedprintable"
	"net"
	"net/mail"
	"strconv"
	"strings"
	"testing"
	"time"

	"github.com/twentyhq/twenty/packages/twenty-server-go/internal/config"
	"github.com/twentyhq/twenty/packages/twenty-server-go/internal/systemmail"
)

func TestVerification(t *testing.T) {
	tests := []struct {
		name          string
		isEmailUpdate bool
		wantSubject   string
		wantCTA       string
	}{
		{"sign-up", false, "Welcome to Twenty: Please Confirm Your Email", "Verify Email"},
		{"email update", true, "Please confirm your updated email", "Confirm new email"},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			message := systemmail.Verification("https://app.example.com/verify-email?token=a&b", tt.isEmailUpdate)
			if message.Subject != tt.wantSubject {
				t.Errorf("Subject = %q, want %q", message.Subject, tt.wantSubject)
			}
			if !strings.Contains(message.HTML, tt.wantCTA) || !strings.Contains(message.Text, "token=a&b") {
				t.Errorf("message = %+v, want CTA %q and the raw link in text", message, tt.wantCTA)
			}
			if !strings.Contains(message.HTML, "token=a&amp;b") {
				t.Errorf("HTML = %q, want the link escaped", message.HTML)
			}
		})
	}
}

func TestPasswordReset(t *testing.T) {
	tests := []struct {
		name        string
		hasPassword bool
		wantSubject string
	}{
		{"reset", true, "Action Needed to Reset Password"},
		{"set", false, "Action Needed to Set Password"},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			message := systemmail.PasswordReset("https://app.example.com/reset-password/tok", 5*time.Minute, tt.hasPassword)
			if message.Subject != tt.wantSubject {
				t.Errorf("Subject = %q, want %q", message.Subject, tt.wantSubject)
			}
			if !strings.Contains(message.Text, "next 5 minutes") || !strings.Contains(message.Text, "/reset-password/tok") {
				t.Errorf("Text = %q, want the duration and link", message.Text)
			}
		})
	}
}

func TestNewSender_logger(t *testing.T) {
	var logged strings.Builder
	logger := slog.New(slog.NewTextHandler(&logged, nil))
	sender, err := systemmail.NewSender(config.Email{Driver: "logger"}, logger)
	if err != nil {
		t.Fatal(err)
	}
	if err := sender.Send(t.Context(), systemmail.Message{To: "a@example.com", Subject: "hi"}); err != nil {
		t.Fatal(err)
	}
	if !strings.Contains(logged.String(), "a@example.com") {
		t.Errorf("log = %q, want the recipient", logged.String())
	}
}

func TestNewSender_smtp(t *testing.T) {
	t.Run("delivers a multipart message", func(t *testing.T) {
		server := startSMTPServer(t)
		sender, err := systemmail.NewSender(server.config(t), slog.New(slog.DiscardHandler))
		if err != nil {
			t.Fatal(err)
		}
		message := systemmail.Message{To: "ada@example.com", Subject: "Héllo", Text: "plain body", HTML: "<p>html body</p>"}
		if err := sender.Send(t.Context(), message); err != nil {
			t.Fatal(err)
		}

		got := <-server.received
		if got.from != "noreply@example.com" || got.to != "ada@example.com" {
			t.Errorf("envelope = %q -> %q, want noreply@example.com -> ada@example.com", got.from, got.to)
		}
		parsed, err := mail.ReadMessage(strings.NewReader(got.data))
		if err != nil {
			t.Fatal(err)
		}
		if subject, _ := new(mime.WordDecoder).DecodeHeader(parsed.Header.Get("Subject")); subject != "Héllo" {
			t.Errorf("Subject = %q, want Héllo", subject)
		}
		if from := parsed.Header.Get("From"); !strings.Contains(from, "noreply@example.com") {
			t.Errorf("From = %q, want the configured sender", from)
		}
		_, params, err := mime.ParseMediaType(parsed.Header.Get("Content-Type"))
		if err != nil {
			t.Fatal(err)
		}
		reader := multipart.NewReader(parsed.Body, params["boundary"])
		var bodies []string
		for {
			part, err := reader.NextPart()
			if errors.Is(err, io.EOF) {
				break
			}
			if err != nil {
				t.Fatal(err)
			}
			body, err := io.ReadAll(quotedprintable.NewReader(part))
			if err != nil {
				t.Fatal(err)
			}
			bodies = append(bodies, string(body))
		}
		if len(bodies) != 2 || bodies[0] != "plain body" || bodies[1] != "<p>html body</p>" {
			t.Errorf("parts = %q, want the text then the html body", bodies)
		}
	})

	t.Run("rejects a recipient that would inject headers", func(t *testing.T) {
		server := startSMTPServer(t)
		sender, err := systemmail.NewSender(server.config(t), slog.New(slog.DiscardHandler))
		if err != nil {
			t.Fatal(err)
		}
		err = sender.Send(t.Context(), systemmail.Message{To: "a@example.com\r\nBcc: b@example.com", Subject: "x"})
		if err == nil {
			t.Error("Send() error = nil, want an invalid recipient error")
		}
	})

	t.Run("requires a host", func(t *testing.T) {
		if _, err := systemmail.NewSender(config.Email{Driver: "smtp"}, slog.New(slog.DiscardHandler)); err == nil {
			t.Error("NewSender() error = nil, want an error for the missing host")
		}
	})
}

type smtpDelivery struct{ from, to, data string }

type smtpServer struct {
	addr     net.Addr
	received chan smtpDelivery
}

func (s smtpServer) config(t *testing.T) config.Email {
	t.Helper()
	host, port, err := net.SplitHostPort(s.addr.String())
	if err != nil {
		t.Fatal(err)
	}
	portNumber, err := strconv.Atoi(port)
	if err != nil {
		t.Fatal(err)
	}
	return config.Email{Driver: "smtp", SMTPHost: host, SMTPPort: portNumber, SMTPNoTLS: true, FromAddress: "noreply@example.com", FromName: "Felix"}
}

func startSMTPServer(t *testing.T) smtpServer {
	t.Helper()
	listener, err := net.Listen("tcp", "127.0.0.1:0")
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() { _ = listener.Close() })
	server := smtpServer{addr: listener.Addr(), received: make(chan smtpDelivery, 1)}
	go func() {
		conn, err := listener.Accept()
		if err != nil {
			return
		}
		defer func() { _ = conn.Close() }()
		reader := bufio.NewReader(conn)
		reply := func(line string) { _, _ = io.WriteString(conn, line+"\r\n") }
		var delivery smtpDelivery
		reply("220 fake ESMTP")
		for {
			line, err := reader.ReadString('\n')
			if err != nil {
				return
			}
			line = strings.TrimSpace(line)
			switch verb := strings.ToUpper(line); {
			case strings.HasPrefix(verb, "EHLO"), strings.HasPrefix(verb, "RSET"):
				reply("250 fake")
			case strings.HasPrefix(verb, "MAIL FROM:"):
				delivery.from = strings.Trim(line[len("MAIL FROM:"):], "<> ")
				reply("250 ok")
			case strings.HasPrefix(verb, "RCPT TO:"):
				delivery.to = strings.Trim(line[len("RCPT TO:"):], "<> ")
				reply("250 ok")
			case verb == "DATA":
				reply("354 go")
				var data strings.Builder
				for {
					dataLine, err := reader.ReadString('\n')
					if err != nil || dataLine == ".\r\n" {
						break
					}
					data.WriteString(dataLine)
				}
				delivery.data = data.String()
				server.received <- delivery
				reply("250 queued")
			case verb == "QUIT":
				reply("221 bye")
				return
			default:
				reply("502 unsupported")
			}
		}
	}()
	return server
}
