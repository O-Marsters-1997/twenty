package auth_test

import (
	"errors"
	"strings"
	"testing"

	"github.com/twentyhq/twenty/packages/twenty-server-go/internal/auth"
)

func TestValidPassword(t *testing.T) {
	tests := []struct {
		name, password string
		want           bool
	}{
		{"seven characters", "1234567", false},
		{"eight characters", "12345678", true},
		{"fifty characters", strings.Repeat("a", 50), true},
		{"fifty-one characters", strings.Repeat("a", 51), false},
		{"newline", "1234567\n8", false},
		{"astral characters count as two units like JS", strings.Repeat("😀", 25), true},
		{"astral characters over the limit", strings.Repeat("😀", 26), false},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if got := auth.ValidPassword(tt.password); got != tt.want {
				t.Errorf("ValidPassword(%q) = %v, want %v", tt.password, got, tt.want)
			}
		})
	}
}

func TestHashNewPassword(t *testing.T) {
	hasher := auth.NewPasswordHasher()
	if _, err := auth.HashNewPassword(hasher, "short"); !errors.Is(err, auth.ErrPasswordInvalid) {
		t.Errorf("HashNewPassword(short) = %v, want ErrPasswordInvalid", err)
	}
	hash, err := auth.HashNewPassword(hasher, "long enough password")
	if err != nil {
		t.Fatal(err)
	}
	if err := hasher.Compare(hash, "long enough password"); err != nil {
		t.Errorf("Compare(HashNewPassword(p), p) = %v, want nil", err)
	}
}
