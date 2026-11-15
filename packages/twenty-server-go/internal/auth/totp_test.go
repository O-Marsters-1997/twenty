package auth

import (
	"net/url"
	"strings"
	"testing"
	"time"
)

// Codes below were produced by otplib 12.0.1 authenticator.clone({window: 1})
// at epoch 1700000000000 ms +/- 30s steps.
var totpFixtureTime = time.UnixMilli(1700000000000)

func TestTOTP_Verify(t *testing.T) {
	tests := []struct {
		name   string
		secret string
		code   string
		want   bool
	}{
		{"current step", "HA2UGS2PEEZFWGTA", "010395", true},
		{"previous step", "HA2UGS2PEEZFWGTA", "785837", true},
		{"next step", "HA2UGS2PEEZFWGTA", "111675", true},
		{"two steps ahead", "HA2UGS2PEEZFWGTA", "942948", false},
		{"other secret current", "JBSWY3DPEHPK3PXP", "324550", true},
		{"other secret previous", "JBSWY3DPEHPK3PXP", "822542", true},
		{"other secret next", "JBSWY3DPEHPK3PXP", "367665", true},
		{"other secret two behind", "JBSWY3DPEHPK3PXP", "968785", false},
		{"other secret two ahead", "JBSWY3DPEHPK3PXP", "870960", false},
		{"short secret padded current", "JBSWY3DPEE", "945962", true},
		{"short secret padded next", "JBSWY3DPEE", "572278", true},
		{"wrong secret", "JBSWY3DPEHPK3PXP", "010395", false},
		{"invalid secret", "not base32!", "010395", false},
		{"empty code", "HA2UGS2PEEZFWGTA", "", false},
	}
	auth := &totp{now: func() time.Time { return totpFixtureTime }}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if got := auth.Verify(tt.secret, tt.code); got != tt.want {
				t.Errorf("Verify(%q, %q) = %v, want %v", tt.secret, tt.code, got, tt.want)
			}
		})
	}
}

func TestTOTP_Generate(t *testing.T) {
	auth := NewTOTP("Twenty", "me@x.com").(*totp)
	secret, otpauthURL, err := auth.Generate()
	if err != nil {
		t.Fatalf("Generate() error = %v", err)
	}

	parsed, err := url.Parse(otpauthURL)
	if err != nil {
		t.Fatalf("parse %q: %v", otpauthURL, err)
	}
	if parsed.Scheme != "otpauth" || parsed.Host != "totp" || parsed.Path != "/Twenty:me@x.com" || !strings.Contains(otpauthURL, "Twenty:me%40x.com") {
		t.Errorf("Generate() url = %q, want otpauth://totp/Twenty:me@x.com", otpauthURL)
	}
	if got := parsed.Query().Get("secret"); got != secret {
		t.Errorf("Generate() url secret = %q, want %q", got, secret)
	}
	if !strings.Contains(otpauthURL, "period=30&digits=6&algorithm=SHA1&issuer=Twenty") {
		t.Errorf("Generate() url = %q, missing otplib parameters", otpauthURL)
	}
	if len(secret) != 16 {
		t.Errorf("Generate() secret = %q, want 16 base32 characters like otplib", secret)
	}

	key, err := totpEncoding.DecodeString(secret)
	if err != nil {
		t.Fatalf("decode secret %q: %v", secret, err)
	}
	code := totpCode(key, auth.now().Unix()/30)
	if !auth.Verify(secret, code) {
		t.Errorf("Verify(generated secret, current code) = false, want true")
	}
}
