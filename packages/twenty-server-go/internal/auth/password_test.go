package auth_test

import (
	"errors"
	"testing"

	"github.com/twentyhq/twenty/packages/twenty-server-go/internal/auth"
)

// Hashes produced by the Node server's bcrypt package (bcrypt.hashSync, cost 10).
const (
	nodeHashASCII       = "$2b$10$vkix7WuHehRTV2Bma6xRSOHLJxF06FHftiipkq95MySpGaJLvhAGa"
	nodePasswordASCII   = "correct horse battery staple"
	nodeHashUnicode     = "$2b$10$tdhVm9rD9A9tgbgNzXBdQeLgUctz6YUWIDqJkXpO9o.jsVQ5H8AEW"
	nodePasswordUnicode = "pässwörd-密码"
)

func TestPasswordHasher_Compare(t *testing.T) {
	hasher := auth.NewPasswordHasher()

	t.Run("accepts Node-written hashes", func(t *testing.T) {
		for _, tt := range []struct{ hash, password string }{
			{nodeHashASCII, nodePasswordASCII},
			{nodeHashUnicode, nodePasswordUnicode},
		} {
			if err := hasher.Compare(tt.hash, tt.password); err != nil {
				t.Errorf("Compare(%q, %q) = %v, want nil", tt.hash, tt.password, err)
			}
		}
	})

	t.Run("rejects a wrong password", func(t *testing.T) {
		err := hasher.Compare(nodeHashASCII, "wrong")
		if !errors.Is(err, auth.ErrInvalidCredentials) {
			t.Errorf("Compare(wrong) = %v, want ErrInvalidCredentials", err)
		}
	})

	t.Run("a malformed hash is not an invalid-credentials error", func(t *testing.T) {
		err := hasher.Compare("not-a-hash", "x")
		if err == nil || errors.Is(err, auth.ErrInvalidCredentials) {
			t.Errorf("Compare(malformed) = %v, want a non-credentials error", err)
		}
	})
}

func TestPasswordHasher_Hash(t *testing.T) {
	hasher := auth.NewPasswordHasher()
	hash, err := hasher.Hash(nodePasswordUnicode)
	if err != nil {
		t.Fatal(err)
	}
	if err := hasher.Compare(hash, nodePasswordUnicode); err != nil {
		t.Errorf("Compare(Hash(p), p) = %v, want nil", err)
	}
}
