package files

import (
	"bytes"
	"mime"
	"net/http"
	"path"
	"regexp"
	"slices"
	"strings"
)

const (
	mimeOctetStream = "application/octet-stream"
	mimeSVG         = "image/svg+xml"
	sniffBytes      = 64 * 1024
)

var pathSegment = regexp.MustCompile(`^[a-zA-Z0-9._-]+$`)

var signatureTypes = []string{"image/png", "image/jpeg", "image/gif", "image/webp", "application/pdf", "application/zip", "application/gzip"}

var inlineSafeMIME = []string{
	"image/jpeg", "image/png", "image/gif", "image/webp", "image/avif", "image/bmp", "image/tiff", "application/pdf", "text/plain",
	"audio/mpeg", "audio/wav", "audio/ogg", "video/mp4", "video/webm", "video/ogg", "image/x-icon",
}

func validResourcePath(resourcePath string) bool {
	const maxPath, maxSegment = 1024, 255
	if resourcePath == "" || len(resourcePath) > maxPath {
		return false
	}
	segments := strings.Split(resourcePath, "/")
	for _, segment := range segments {
		if len(segment) > maxSegment || segment == "." || segment == ".." || !pathSegment.MatchString(segment) {
			return false
		}
	}
	return strings.Contains(segments[len(segments)-1], ".")
}

func extension(filename string) string {
	base := path.Base(filename)
	dot := strings.LastIndex(base, ".")
	if dot < 0 {
		return ""
	}
	return base[dot+1:]
}

func detectMIME(prefix []byte, ext string) (string, bool) {
	declared, _, _ := strings.Cut(mime.TypeByExtension("."+strings.ToLower(ext)), ";")
	if declared == mimeSVG {
		return mimeSVG, bytes.Contains(prefix, []byte("<svg"))
	}
	sniffed, _, _ := strings.Cut(http.DetectContentType(prefix), ";")
	switch sniffed {
	case mimeOctetStream, "text/plain", "text/xml", "text/html":
	default:
		return sniffed, true
	}
	switch {
	case declared == "":
		return mimeOctetStream, true
	case slices.Contains(signatureTypes, declared):
		return "", false
	}
	return declared, true
}

func contentDisposition(mimeType string) string {
	if slices.Contains(inlineSafeMIME, mimeType) {
		return "inline"
	}
	return "attachment"
}
