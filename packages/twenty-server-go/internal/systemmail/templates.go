package systemmail

import (
	"bytes"
	"fmt"
	"html/template"
	"strconv"
	"time"
)

type verificationData struct {
	Link, Title, Body, CallToAction string
}

type passwordResetData struct {
	Link, Title, Duration, CallToAction string
}

var (
	verificationHTML = template.Must(template.New("verification").Parse(
		`<h1>{{.Title}}</h1><p>{{.Body}}</p><p><a href="{{.Link}}">{{.CallToAction}}</a></p>`))
	passwordResetHTML = template.Must(template.New("passwordReset").Parse(
		`<h1>{{.Title}}</h1><p>This link is only valid for the next {{.Duration}}. If the link does not work, you can use the login verification link directly:<br><a href="{{.Link}}">{{.Link}}</a></p><p><a href="{{.Link}}">{{.CallToAction}}</a></p>`))
)

func Verification(link string, isEmailUpdate bool) Message {
	data := verificationData{
		Link:         link,
		Title:        "Confirm your email address",
		Body:         "Thanks for registering for an account on Twenty! Before we get started, we just need to confirm that this is you. Click below to verify your email address.",
		CallToAction: "Verify Email",
	}
	subject := "Welcome to Twenty: Please Confirm Your Email"
	if isEmailUpdate {
		data.Title = "Confirm your new email address"
		data.Body = "We received a request to change the email address associated with your Twenty account. Click below to confirm this change."
		data.CallToAction = "Confirm new email"
		subject = "Please confirm your updated email"
	}
	return Message{
		Subject: subject,
		Text:    data.Title + "\n\n" + data.Body + "\n\n" + link + "\n",
		HTML:    render(verificationHTML, data),
	}
}

func PasswordReset(link string, validFor time.Duration, hasPassword bool) Message {
	data := passwordResetData{Link: link, Title: "Reset your password 🗝", CallToAction: "Reset", Duration: describe(validFor)}
	subject := "Action Needed to Reset Password"
	if !hasPassword {
		data.Title = "Set your password 🗝"
		data.CallToAction = "Set"
		subject = "Action Needed to Set Password"
	}
	return Message{
		Subject: subject,
		Text:    fmt.Sprintf("%s\n\nThis link is only valid for the next %s. If the link does not work, you can use the login verification link directly:\n%s\n", data.Title, data.Duration, link),
		HTML:    render(passwordResetHTML, data),
	}
}

func render(tmpl *template.Template, data any) string {
	var out bytes.Buffer
	if err := tmpl.Execute(&out, data); err != nil {
		panic(fmt.Sprintf("render %s email: %v", tmpl.Name(), err))
	}
	return out.String()
}

func describe(duration time.Duration) string {
	for _, unit := range []struct {
		size time.Duration
		name string
	}{{24 * time.Hour, "day"}, {time.Hour, "hour"}, {time.Minute, "minute"}} {
		if duration >= unit.size {
			count := int(duration.Round(unit.size) / unit.size)
			name := unit.name
			if count != 1 {
				name += "s"
			}
			return strconv.Itoa(count) + " " + name
		}
	}
	return strconv.Itoa(int(duration.Seconds())) + " seconds"
}
