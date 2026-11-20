package workspace

import (
	"net/url"
	"regexp"
	"strconv"
	"strings"
)

const MaxAllowedIframeOrigins = 20

var (
	iframeOriginShape    = regexp.MustCompile(`(?i)^https?://[^/?#@]+/?$`)
	iframeOriginHostname = regexp.MustCompile(`(?i)^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)*$`)
	iframeOriginUnsafe   = regexp.MustCompile(`[\s*\\]`)
)

// NormalizeIframeOrigin ports twenty-shared's normalizeAllowedIframeOrigin.
func NormalizeIframeOrigin(value string) (string, bool) {
	if len(value) > 300 || iframeOriginUnsafe.MatchString(value) || !iframeOriginShape.MatchString(value) {
		return "", false
	}
	parsed, err := url.Parse(value)
	if err != nil || !iframeOriginHostname.MatchString(parsed.Hostname()) {
		return "", false
	}
	scheme := strings.ToLower(parsed.Scheme)
	host := strings.ToLower(parsed.Hostname())
	if rawPort := parsed.Port(); rawPort != "" {
		port, err := strconv.Atoi(rawPort)
		if err != nil || port > 65535 {
			return "", false
		}
		if port != map[string]int{"http": 80, "https": 443}[scheme] {
			host += ":" + strconv.Itoa(port)
		}
	}
	return scheme + "://" + host, true
}
