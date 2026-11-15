package auth_test

import (
	"errors"
	"strings"
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

func TestValidatePassword(t *testing.T) {
	valid := []struct{ name, password string }{
		{"eight characters", "12345678"},
		{"fifty characters", strings.Repeat("a", 50)},
		{"spaces and symbols", "pass word!@#"},
		{"twenty-five emoji count as fifty UTF-16 units", strings.Repeat("😀", 25)},
	}
	for _, tt := range valid {
		t.Run("accepts "+tt.name, func(t *testing.T) {
			if err := auth.ValidatePassword(tt.password); err != nil {
				t.Errorf("ValidatePassword(%q) = %v, want nil", tt.password, err)
			}
		})
	}

	invalid := []struct{ name, password string }{
		{"seven characters", "1234567"},
		{"fifty-one characters", strings.Repeat("a", 51)},
		{"a newline", "1234567\n8"},
		{"a carriage return", "1234567\r8"},
		{"a line separator", "1234567 8"},
		{"twenty-six emoji", strings.Repeat("😀", 26)},
		{"empty", ""},
	}
	for _, tt := range invalid {
		t.Run("rejects "+tt.name, func(t *testing.T) {
			if err := auth.ValidatePassword(tt.password); !errors.Is(err, auth.ErrInvalidPassword) {
				t.Errorf("ValidatePassword(%q) = %v, want ErrInvalidPassword", tt.password, err)
			}
		})
	}
}

func TestNewPasswordHash(t *testing.T) {
	hasher := auth.NewPasswordHasher()

	t.Run("hashes a valid password", func(t *testing.T) {
		hash, err := auth.NewPasswordHash(hasher, "correct horse")
		if err != nil {
			t.Fatal(err)
		}
		if err := hasher.Compare(hash, "correct horse"); err != nil {
			t.Errorf("Compare(NewPasswordHash(p), p) = %v, want nil", err)
		}
	})

	t.Run("refuses a password the rules reject", func(t *testing.T) {
		if _, err := auth.NewPasswordHash(hasher, "short"); !errors.Is(err, auth.ErrInvalidPassword) {
			t.Errorf("NewPasswordHash(short) error = %v, want ErrInvalidPassword", err)
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
