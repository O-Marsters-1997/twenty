package auth

import (
	"bytes"
	"crypto/hmac"
	"crypto/rand"
	"crypto/sha1"
	"crypto/subtle"
	"encoding/base32"
	"encoding/binary"
	"errors"
	"fmt"
	"math"
	"net/url"
	"strings"
	"time"
)

const (
	totpStep         = 30 * time.Second
	totpDigits       = 6
	totpWindow       = 1
	totpSecretBytes  = 10
	totpMinKeyLength = 10

	totpPaddedKeyLength = 20
)

// ErrTwoFactorRequired means the user has a TOTP method and must supply a code.
var ErrTwoFactorRequired = errors.New("two-factor authentication required")

// TOTP verifies and generates codes compatible with Node's otplib authenticator.
// The secret is the string otplib stores: unpadded base32.
type TOTP interface {
	Verify(secretHex, code string) bool
	Generate() (secretHex, otpauthURL string, err error)
}

type totp struct {
	issuer  string
	account string
	now     func() time.Time
}

// NewTOTP returns a TOTP whose generated otpauth URLs label the key issuer:account.
func NewTOTP(issuer, account string) TOTP {
	return &totp{issuer: issuer, account: account, now: time.Now}
}

var totpEncoding = base32.StdEncoding.WithPadding(base32.NoPadding)

func (t *totp) Verify(secretHex, code string) bool {
	key, err := totpEncoding.DecodeString(strings.ToUpper(secretHex))
	if err != nil || len(key) == 0 {
		return false
	}
	if len(key) < totpMinKeyLength {
		key = bytes.Repeat(key, totpPaddedKeyLength)[:totpPaddedKeyLength]
	}
	counter := t.now().Unix() / int64(totpStep.Seconds())
	for delta := int64(-totpWindow); delta <= totpWindow; delta++ {
		if subtle.ConstantTimeCompare([]byte(totpCode(key, counter+delta)), []byte(code)) == 1 {
			return true
		}
	}
	return false
}

func (t *totp) Generate() (string, string, error) {
	key := make([]byte, totpSecretBytes)
	if _, err := rand.Read(key); err != nil {
		return "", "", fmt.Errorf("generate totp secret: %w", err)
	}
	secret := totpEncoding.EncodeToString(key)
	return secret, OTPAuthURL(t.issuer, t.account, secret), nil
}

func OTPAuthURL(issuer, account, secret string) string {
	label := encodeURIComponent(issuer) + ":" + encodeURIComponent(account)
	query := fmt.Sprintf("secret=%s&period=%d&digits=%d&algorithm=SHA1&issuer=%s",
		secret, int(totpStep.Seconds()), totpDigits, encodeURIComponent(issuer))
	return "otpauth://totp/" + label + "?" + query
}

func encodeURIComponent(value string) string {
	return strings.ReplaceAll(url.QueryEscape(value), "+", "%20")
}

func totpCode(key []byte, counter int64) string {
	var message [8]byte
	binary.BigEndian.PutUint64(message[:], uint64(counter))
	mac := hmac.New(sha1.New, key)
	mac.Write(message[:])
	sum := mac.Sum(nil)
	offset := sum[len(sum)-1] & 0x0f
	truncated := binary.BigEndian.Uint32(sum[offset:offset+4]) & 0x7fffffff
	return fmt.Sprintf("%0*d", totpDigits, truncated%uint32(math.Pow10(totpDigits)))
}
