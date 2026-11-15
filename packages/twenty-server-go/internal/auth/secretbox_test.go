package auth_test

import (
	"strings"
	"testing"

	"github.com/twentyhq/twenty/packages/twenty-server-go/internal/auth"
)

const (
	secretWorkspaceID = "20202020-1c25-4d02-bf25-6aeccf7ea419"
	nodeEnvelope      = "enc:v2:4d4fe905:wYyVrvgcl7TlGxUbG0haaoh4HqlC2S1YIfOv0RW7kD/o5ECRkOIVnf/WjKM="
)

func TestSecretCipher_Decrypt(t *testing.T) {
	t.Parallel()

	t.Run("reads an envelope produced by Node", func(t *testing.T) {
		t.Parallel()
		got, err := auth.NewSecretCipher("test-encryption-key", "", "").Decrypt(nodeEnvelope, secretWorkspaceID)
		if err != nil || got != "HA2UGS2PEEZFWGTA" {
			t.Errorf("Decrypt() = %q, %v, want the plaintext Node encrypted", got, err)
		}
	})

	t.Run("falls back to the fallback key", func(t *testing.T) {
		t.Parallel()
		got, err := auth.NewSecretCipher("new-key", "test-encryption-key", "").Decrypt(nodeEnvelope, secretWorkspaceID)
		if err != nil || got != "HA2UGS2PEEZFWGTA" {
			t.Errorf("Decrypt() = %q, %v", got, err)
		}
	})

	t.Run("rejects malformed input", func(t *testing.T) {
		t.Parallel()
		cipher := auth.NewSecretCipher("test-encryption-key", "", "")
		for _, envelope := range []string{"", "plain", "enc:v2:4d4fe905", "enc:v2:4d4fe905:%%%", "enc:v2:00000000:AAAA"} {
			if _, err := cipher.Decrypt(envelope, secretWorkspaceID); err == nil {
				t.Errorf("Decrypt(%q) succeeded", envelope)
			}
		}
	})
}

func TestSecretCipher_Encrypt(t *testing.T) {
	t.Parallel()

	t.Run("round trips under the same workspace only", func(t *testing.T) {
		t.Parallel()
		cipher := auth.NewSecretCipher("", "", "app-secret")
		envelope, err := cipher.Encrypt("JBSWY3DPEHPK3PXP", secretWorkspaceID)
		if err != nil {
			t.Fatal(err)
		}
		if !strings.HasPrefix(envelope, "enc:v2:") {
			t.Errorf("Encrypt() = %q, want the enc:v2 prefix the column check requires", envelope)
		}
		if got, err := cipher.Decrypt(envelope, secretWorkspaceID); err != nil || got != "JBSWY3DPEHPK3PXP" {
			t.Errorf("Decrypt() = %q, %v", got, err)
		}
		if _, err := cipher.Decrypt(envelope, "other-workspace"); err == nil {
			t.Error("Decrypt() under another workspace succeeded")
		}
	})

	t.Run("fails without a key", func(t *testing.T) {
		t.Parallel()
		if _, err := auth.NewSecretCipher("", "", "").Encrypt("secret", secretWorkspaceID); err == nil {
			t.Error("Encrypt() with no key succeeded")
		}
	})
}
