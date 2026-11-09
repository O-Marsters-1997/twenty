package auth_test

import (
	"errors"
	"testing"

	"github.com/twentyhq/twenty/packages/twenty-server-go/internal/auth"
)

var nodeWrittenHashes = []struct{ name, hash, password string }{
	{"ascii", "$2b$10$vkix7WuHehRTV2Bma6xRSOHLJxF06FHftiipkq95MySpGaJLvhAGa", "correct horse battery staple"},
	{"unicode", "$2b$10$tdhVm9rD9A9tgbgNzXBdQeLgUctz6YUWIDqJkXpO9o.jsVQ5H8AEW", "pässwörd-密码"},
}

func TestPasswordHasher_Compare(t *testing.T) {
	hasher := auth.NewPasswordHasher()

	for _, tt := range nodeWrittenHashes {
		t.Run("accepts Node-written "+tt.name, func(t *testing.T) {
			if err := hasher.Compare(tt.hash, tt.password); err != nil {
				t.Errorf("Compare(%q, %q) = %v, want nil", tt.hash, tt.password, err)
			}
		})
	}

	t.Run("rejects a wrong password", func(t *testing.T) {
		err := hasher.Compare(nodeWrittenHashes[0].hash, "wrong")
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
	password := nodeWrittenHashes[1].password
	hash, err := hasher.Hash(password)
	if err != nil {
		t.Fatal(err)
	}
	if err := hasher.Compare(hash, password); err != nil {
		t.Errorf("Compare(Hash(p), p) = %v, want nil", err)
	}
}
