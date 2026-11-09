package messaging

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"slices"
	"strings"
)

// Renderer renders a campaign template, the tiptap JSON document a campaign stores as its body,
// into the HTML and plain text a recipient gets.
type Renderer interface { // twenty-emails templates; implementation chosen in this phase (PRD open question)
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
	markOrder     = []string{"underline", "bold", "italic", "strike", "link"}
	htmlEscaper   = strings.NewReplacer("&", "&amp;", "<", "&lt;", ">", "&gt;", `"`, "&quot;", "'", "&#x27;")
	allowedSchema = []string{"http:", "https:", "mailto:", "tel:"}
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
		pairs = append(pairs, "{{"+name+"}}", fmt.Sprint(value))
	}
	substitute := strings.NewReplacer(pairs...).Replace

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
			if content == "" {
				content = nbsp
			}
			nodeHTML, nodeText, err := renderMarks(node.Marks, substitute(content))
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

func renderMarks(marks []tiptapMark, content string) (html, text string, err error) {
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
			href = safeURL(href)
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
	if slices.Contains(allowedSchema, strings.ToLower(scheme)+":") {
		return value
	}
	return ""
}

func isLetter(b byte) bool { return (b|0x20) >= 'a' && (b|0x20) <= 'z' }
