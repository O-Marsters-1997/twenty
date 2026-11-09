package messaging

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"slices"
	"strconv"
	"strings"

	"github.com/riverqueue/river"
)

// Renderer renders a campaign template, the tiptap JSON document a campaign stores as its body,
// into the HTML and plain text a recipient gets.
type Renderer interface {
	Render(ctx context.Context, template string, variables map[string]any) (html, text string, err error)
}

// ErrUnsupportedNode is returned for a template node the Go renderer cannot reproduce; failing the
// send beats delivering a campaign with part of its body missing.
var ErrUnsupportedNode = errors.New("campaign template uses an unsupported node")

// GoRenderer ports the twenty-emails campaign renderer (docs/adr/0001-campaign-renderer-in-go.md).
type GoRenderer struct{}

type tiptapNode struct {
	Type    string         `json:"type"`
	Text    string         `json:"text"`
	Attrs   map[string]any `json:"attrs"`
	Marks   []tiptapMark   `json:"marks"`
	Content []tiptapNode   `json:"content"`
}

type tiptapMark struct {
	Type  string         `json:"type"`
	Attrs map[string]any `json:"attrs"`
}

const (
	htmlHead = `<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd"><html dir="ltr" lang="en"><head><meta content="text/html; charset=UTF-8" http-equiv="Content-Type"/><meta name="x-apple-disable-message-reformatting"/><style>blockquote,h1,h2,h3,img,li,ol,p,ul{margin-top:0;margin-bottom:0}</style></head><body dir="ltr" lang="en"><table border="0" width="100%" cellPadding="0" cellSpacing="0" role="presentation" align="center"><tbody><tr><td dir="ltr" lang="en">`
	htmlTail = `</td></tr></tbody></table></body></html>`
	pStyle   = `font-size:14px;line-height:1.5;margin:0;padding:0;margin-top:0;margin-bottom:0;margin-left:0;margin-right:0`
	nbsp     = " "
)

var (
	headingFontSizes = map[int]string{1: "32px", 2: "24px", 3: "16px"}
	// underline is applied first (innermost) and link last, as twenty-emails sorts marks.
	markOrder      = []string{"underline", "bold", "italic", "strike", "link"}
	htmlEscaper    = strings.NewReplacer("&", "&amp;", "<", "&lt;", ">", "&gt;", `"`, "&quot;", "'", "&#x27;")
	allowedSchemes = []string{"http:", "https:", "mailto:", "tel:"}
)

func (GoRenderer) Render(ctx context.Context, template string, variables map[string]any) (string, string, error) {
	if err := ctx.Err(); err != nil {
		return "", "", err
	}
	var doc tiptapNode
	if err := json.Unmarshal([]byte(template), &doc); err != nil {
		return "", "", fmt.Errorf("parse campaign template: %w", err)
	}
	pairs := make([]string, 0, 2*len(variables))
	for name, value := range variables {
		pairs = append(pairs, "{{"+name+"}}", stringify(value))
	}
	substitute := strings.NewReplacer(pairs...).Replace

	if _, themed := doc.Attrs["canvasTheme"]; themed {
		return "", "", fmt.Errorf("%w: canvasTheme", ErrUnsupportedNode)
	}

	var html strings.Builder
	var blocks []string
	html.WriteString(htmlHead)
	for _, block := range doc.Content {
		blockHTML, blockText, err := renderBlock(block, substitute)
		if err != nil {
			return "", "", err
		}
		html.WriteString(blockHTML)
		blocks = append(blocks, blockText)
	}
	html.WriteString(htmlTail)
	return html.String(), strings.Join(blocks, "\n\n"), nil
}

func renderBlock(node tiptapNode, substitute func(string) string) (html, text string, err error) {
	if _, styled := node.Attrs["style"]; styled {
		return "", "", fmt.Errorf("%w: %s style", ErrUnsupportedNode, node.Type)
	}
	switch node.Type {
	case "paragraph":
		inlineHTML, inlineText, err := renderInline(node.Content, substitute)
		if err != nil {
			return "", "", err
		}
		if inlineHTML == "" {
			inlineHTML, inlineText = nbsp, nbsp
		}
		return `<p style="` + pStyle + `">` + inlineHTML + `</p>`, inlineText, nil
	case "heading":
		level, _ := node.Attrs["level"].(float64)
		size, ok := headingFontSizes[int(level)]
		if !ok {
			return "", "", fmt.Errorf("%w: heading level %v", ErrUnsupportedNode, node.Attrs["level"])
		}
		inlineHTML, inlineText, err := renderInline(node.Content, substitute)
		if err != nil {
			return "", "", err
		}
		tag := fmt.Sprintf("h%d", int(level))
		return fmt.Sprintf(`<%s style="font-size:%s">%s</%s>`, tag, size, inlineHTML, tag), strings.ToUpper(inlineText), nil
	}
	return "", "", fmt.Errorf("%w: %s", ErrUnsupportedNode, node.Type)
}

func renderInline(nodes []tiptapNode, substitute func(string) string) (html, text string, err error) {
	var htmlOut, textOut strings.Builder
	for _, node := range nodes {
		switch node.Type {
		case "text":
			content := node.Text
			if content == "" && len(node.Marks) > 0 {
				content = nbsp
			}
			nodeHTML, nodeText, err := renderMarks(node.Marks, substitute(content), substitute)
			if err != nil {
				return "", "", err
			}
			htmlOut.WriteString(nodeHTML)
			textOut.WriteString(nodeText)
		case "variableTag":
			variable, ok := node.Attrs["variable"].(string)
			if !ok {
				variable = nbsp
			}
			variable = substitute(variable)
			htmlOut.WriteString(htmlEscaper.Replace(variable))
			textOut.WriteString(variable)
		case "hardBreak":
			htmlOut.WriteString("<br/>")
			textOut.WriteString("\n")
		default:
			return "", "", fmt.Errorf("%w: %s", ErrUnsupportedNode, node.Type)
		}
	}
	return htmlOut.String(), textOut.String(), nil
}

func renderMarks(marks []tiptapMark, content string, substitute func(string) string) (html, text string, err error) {
	html, text = htmlEscaper.Replace(content), content
	sorted := slices.Clone(marks)
	slices.SortStableFunc(sorted, func(a, b tiptapMark) int {
		return slices.Index(markOrder, a.Type) - slices.Index(markOrder, b.Type)
	})
	for _, mark := range sorted {
		switch mark.Type {
		case "bold":
			html = "<strong>" + html + "</strong>"
		case "italic":
			html = "<em>" + html + "</em>"
		case "underline":
			html = `<span style="text-decoration:underline">` + html + `</span>`
		case "strike":
			html = `<span style="text-decoration:line-through">` + html + `</span>`
		case "link":
			href, _ := mark.Attrs["href"].(string)
			href = safeURL(substitute(href))
			if href == "" {
				html = `<a target="_blank" rel="noopener noreferrer" style="text-decoration:underline">` + html + `</a>`
				continue
			}
			html = `<a href="` + htmlEscaper.Replace(href) + `" target="_blank" rel="noopener noreferrer" style="text-decoration:underline">` + html + `</a>`
			text += " " + href
		default:
			return "", "", fmt.Errorf("%w: mark %s", ErrUnsupportedNode, mark.Type)
		}
	}
	return html, text, nil
}

func safeURL(value string) string {
	if strings.TrimSpace(value) == "" {
		return ""
	}
	stripped := strings.Map(func(r rune) rune {
		if r <= ' ' {
			return -1
		}
		return r
	}, value)
	scheme, _, found := strings.Cut(stripped, ":")
	if !found || strings.ContainsAny(scheme, "/?#") || scheme == "" || !isLetter(scheme[0]) {
		return value
	}
	if slices.Contains(allowedSchemes, strings.ToLower(scheme)+":") {
		return value
	}
	return ""
}

func stringify(value any) string {
	switch typed := value.(type) {
	case nil:
		return ""
	case float64:
		return strconv.FormatFloat(typed, 'f', -1, 64)
	}
	return fmt.Sprint(value)
}

func isLetter(b byte) bool { return (b|0x20) >= 'a' && (b|0x20) <= 'z' }

// DeliveryStatus mirrors the campaignDelivery state enum.
type DeliveryStatus string

const (
	DeliveryQueued  DeliveryStatus = "QUEUED"
	DeliverySending DeliveryStatus = "SENDING"
	DeliverySent    DeliveryStatus = "SENT"
	DeliveryFailed  DeliveryStatus = "FAILED"
	DeliverySkipped DeliveryStatus = "SKIPPED"
)

// CampaignStatus is the terminal messageCampaign status a finished send settles to.
type CampaignStatus string

const (
	CampaignSent           CampaignStatus = "SENT"
	CampaignSentWithErrors CampaignStatus = "SENT_WITH_ERRORS"
)

// ProviderOutcome is what an outbound delivery event reports about one sent message.
type ProviderOutcome string

type Campaign struct {
	ID, Subject, Template, ConnectedAccountID string
}

type Recipient struct {
	PersonID  string
	Email     string
	Variables map[string]any
}

type Delivery struct {
	ID, CampaignID, Email string
	Variables             map[string]any
	Status                DeliveryStatus
}

type DeliverySettlement struct {
	Status                                   DeliveryStatus
	SkipReason, FailureReason, ProviderMsgID string
}

type CampaignCounts struct{ Total, InProgress, Failed, Skipped int }

// CampaignStore is the persistence campaign sending needs.
type CampaignStore interface {
	Campaign(ctx context.Context, id string) (Campaign, error)
	Recipients(ctx context.Context, campaignID string) ([]Recipient, error)
	// SuppressedAddresses lists lower-cased addresses from messageSuppression and blocklist.
	SuppressedAddresses(ctx context.Context) ([]string, error)
	// CreateDeliveries inserts QUEUED deliveries for recipients without one and returns the IDs of all
	// the campaign's QUEUED deliveries, so a retried fan-out enqueues the same set.
	CreateDeliveries(ctx context.Context, campaignID string, recipients []Recipient) ([]string, error)
	Delivery(ctx context.Context, id string) (Delivery, error)
	Settle(ctx context.Context, deliveryID string, settlement DeliverySettlement) error
	// RecordOutcome stamps the delivery sent as providerMessageID and returns its campaign, or "" when none matches.
	RecordOutcome(ctx context.Context, providerMessageID string, outcome ProviderOutcome) (campaignID string, err error)
	Counts(ctx context.Context, campaignID string) (CampaignCounts, error)
	Finish(ctx context.Context, campaignID string, status CampaignStatus) error
}

var ErrDeliveryNotFound = errors.New("campaign delivery not found")

// Campaigns fans a campaign out into deliveries and sends each one.
type Campaigns struct {
	Store    CampaignStore
	Renderer Renderer
	Mailer   Mailer
	Queue    func(ctx context.Context, args river.JobArgs) error
}

// Send creates a delivery per non-suppressed recipient and enqueues each as a DeliverCampaignMessageArgs job.
func (c *Campaigns) Send(ctx context.Context, campaignID string) error {
	recipients, err := c.Store.Recipients(ctx, campaignID)
	if err != nil {
		return fmt.Errorf("list campaign recipients: %w", err)
	}
	suppressed, err := c.Store.SuppressedAddresses(ctx)
	if err != nil {
		return fmt.Errorf("list suppressed addresses: %w", err)
	}
	allowed := slices.DeleteFunc(slices.Clone(recipients), func(recipient Recipient) bool {
		return slices.Contains(suppressed, strings.ToLower(recipient.Email))
	})
	ids, err := c.Store.CreateDeliveries(ctx, campaignID, allowed)
	if err != nil {
		return fmt.Errorf("create deliveries: %w", err)
	}
	var errs []error
	for _, id := range ids {
		if err := c.Queue(ctx, DeliverCampaignMessageArgs{DeliveryID: id}); err != nil {
			errs = append(errs, fmt.Errorf("enqueue delivery %s: %w", id, err))
		}
	}
	if err := errors.Join(errs...); err != nil {
		return err
	}
	return c.finishIfDone(ctx, campaignID)
}

// Deliver renders and sends one delivery. A send error is returned for retry unless lastAttempt, which settles it FAILED.
func (c *Campaigns) Deliver(ctx context.Context, deliveryID string, lastAttempt bool) error {
	delivery, err := c.Store.Delivery(ctx, deliveryID)
	if err != nil {
		return fmt.Errorf("load delivery: %w", err)
	}
	if delivery.Status != DeliveryQueued && delivery.Status != DeliverySending {
		return nil
	}
	suppressed, err := c.Store.SuppressedAddresses(ctx)
	if err != nil {
		return fmt.Errorf("list suppressed addresses: %w", err)
	}
	if slices.Contains(suppressed, strings.ToLower(delivery.Email)) {
		return c.settle(ctx, delivery, DeliverySettlement{Status: DeliverySkipped, SkipReason: "SUPPRESSED"})
	}
	campaign, err := c.Store.Campaign(ctx, delivery.CampaignID)
	if err != nil {
		return fmt.Errorf("load campaign: %w", err)
	}
	html, _, err := c.Renderer.Render(ctx, campaign.Template, delivery.Variables)
	if err != nil {
		return c.fail(ctx, delivery, "CONFIGURATION_ERROR", fmt.Errorf("render delivery %s: %w", deliveryID, errors.Join(err, ErrDeliveryFailed)))
	}
	messageID, err := c.Mailer.Send(ctx, campaign.ConnectedAccountID, OutboundEmail{
		To: []string{delivery.Email}, Subject: campaign.Subject, HTMLBody: html,
	})
	switch {
	case errors.Is(err, ErrAccountAuthFailed):
		return c.fail(ctx, delivery, "INSUFFICIENT_PERMISSIONS", fmt.Errorf("send delivery %s: %w", deliveryID, errors.Join(err, ErrDeliveryFailed)))
	case err != nil && lastAttempt:
		return c.fail(ctx, delivery, "TEMPORARY_ERROR", fmt.Errorf("send delivery %s: %w", deliveryID, err))
	case err != nil:
		return fmt.Errorf("send delivery %s: %w", deliveryID, err)
	}
	return c.settle(ctx, delivery, DeliverySettlement{Status: DeliverySent, ProviderMsgID: messageID})
}

func (c *Campaigns) fail(ctx context.Context, delivery Delivery, reason string, cause error) error {
	return errors.Join(cause, c.settle(ctx, delivery, DeliverySettlement{Status: DeliveryFailed, FailureReason: reason}))
}

// RecordOutcome applies an outbound delivery event and settles the campaign if it was the last open delivery.
func (c *Campaigns) RecordOutcome(ctx context.Context, providerMessageID string, outcome ProviderOutcome) error {
	campaignID, err := c.Store.RecordOutcome(ctx, providerMessageID, outcome)
	if err != nil {
		return fmt.Errorf("record provider outcome: %w", err)
	}
	if campaignID == "" {
		return nil
	}
	return c.finishIfDone(ctx, campaignID)
}

// ErrDeliveryFailed marks a delivery that is already settled FAILED and must not be retried.
var ErrDeliveryFailed = errors.New("campaign delivery failed permanently")

func (c *Campaigns) settle(ctx context.Context, delivery Delivery, settlement DeliverySettlement) error {
	if err := c.Store.Settle(ctx, delivery.ID, settlement); err != nil {
		return fmt.Errorf("settle delivery %s: %w", delivery.ID, err)
	}
	return c.finishIfDone(ctx, delivery.CampaignID)
}

func (c *Campaigns) finishIfDone(ctx context.Context, campaignID string) error {
	counts, err := c.Store.Counts(ctx, campaignID)
	if err != nil {
		return fmt.Errorf("count deliveries: %w", err)
	}
	status := CampaignSent
	switch {
	case counts.InProgress > 0:
		return nil
	case counts.Total == 0, counts.Failed > 0, counts.Skipped > 0:
		status = CampaignSentWithErrors
	}
	if err := c.Store.Finish(ctx, campaignID, status); err != nil {
		return fmt.Errorf("finish campaign: %w", err)
	}
	return nil
}
