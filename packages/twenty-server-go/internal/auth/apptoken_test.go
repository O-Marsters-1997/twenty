package auth_test

import (
	"context"
	"errors"
	"testing"
	"time"

	"github.com/twentyhq/twenty/packages/twenty-server-go/internal/auth"
)

var tokenNow = time.Date(2026, 1, 1, 12, 0, 0, 0, time.UTC)

func TestHashAppToken(t *testing.T) {
	want := "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad"
	if got := auth.HashAppToken("abc"); got != want {
		t.Errorf("HashAppToken(abc) = %s, want %s", got, want)
	}
}

func TestIssueAppToken(t *testing.T) {
	first, err := auth.IssueAppToken(tokenNow, time.Hour)
	if err != nil {
		t.Fatal(err)
	}
	second, err := auth.IssueAppToken(tokenNow, time.Hour)
	if err != nil {
		t.Fatal(err)
	}
	if len(first.Plain) != 64 || first.Hash != auth.HashAppToken(first.Plain) || first.Plain == second.Plain {
		t.Errorf("IssueAppToken = %+v", first)
	}
	if !first.ExpiresAt.Equal(tokenNow.Add(time.Hour)) {
		t.Errorf("ExpiresAt = %v, want now+1h", first.ExpiresAt)
	}
}

func TestValidateEmailVerification(t *testing.T) {
	valid := auth.StoredAppToken{ExpiresAt: tokenNow.Add(time.Minute), Email: "a@b.com"}
	tests := []struct {
		name  string
		token auth.StoredAppToken
		email string
		want  error
	}{
		{"valid", valid, "a@b.com", nil},
		{"expired", auth.StoredAppToken{ExpiresAt: tokenNow.Add(-time.Minute), Email: "a@b.com"}, "a@b.com", auth.ErrTokenExpired},
		{"missing email", auth.StoredAppToken{ExpiresAt: tokenNow.Add(time.Minute)}, "a@b.com", auth.ErrEmailMissing},
		{"other email", valid, "c@d.com", auth.ErrEmailMismatch},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if got := auth.ValidateEmailVerification(tt.token, tt.email, tokenNow); !errors.Is(got, tt.want) {
				t.Errorf("ValidateEmailVerification = %v, want %v", got, tt.want)
			}
		})
	}
}

func TestValidatePasswordReset(t *testing.T) {
	revoked := tokenNow
	tests := []struct {
		name  string
		token auth.StoredAppToken
		want  error
	}{
		{"valid", auth.StoredAppToken{ExpiresAt: tokenNow.Add(time.Minute)}, nil},
		{"expired", auth.StoredAppToken{ExpiresAt: tokenNow.Add(-time.Minute)}, auth.ErrTokenInvalid},
		{"expiring exactly now", auth.StoredAppToken{ExpiresAt: tokenNow}, auth.ErrTokenInvalid},
		{"revoked", auth.StoredAppToken{ExpiresAt: tokenNow.Add(time.Minute), RevokedAt: &revoked}, auth.ErrTokenInvalid},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if got := auth.ValidatePasswordReset(tt.token, tokenNow); !errors.Is(got, tt.want) {
				t.Errorf("ValidatePasswordReset = %v, want %v", got, tt.want)
			}
		})
	}
}

type fakeResetRequests struct {
	found             bool
	resolveErr        error
	rotated, notified []auth.IssuedAppToken
}

func (f *fakeResetRequests) Resolve(context.Context, string, string) (auth.ResetTarget, bool, error) {
	return auth.ResetTarget{}, f.found, f.resolveErr
}

func (f *fakeResetRequests) Rotate(_ context.Context, _ auth.ResetTarget, token auth.IssuedAppToken) error {
	f.rotated = append(f.rotated, token)
	return nil
}

func (f *fakeResetRequests) Notify(_ context.Context, _ auth.ResetTarget, token auth.IssuedAppToken) error {
	f.notified = append(f.notified, token)
	return nil
}

func TestRequestPasswordReset(t *testing.T) {
	ctx := context.Background()

	t.Run("an unknown email succeeds without storing or sending anything", func(t *testing.T) {
		fake := &fakeResetRequests{}
		if err := auth.RequestPasswordReset(ctx, fake, tokenNow, 5*time.Minute, "nobody@b.com", ""); err != nil {
			t.Errorf("RequestPasswordReset = %v, want nil", err)
		}
		if len(fake.rotated)+len(fake.notified) != 0 {
			t.Errorf("rotated %d, notified %d, want none", len(fake.rotated), len(fake.notified))
		}
	})

	t.Run("a known email rotates then emails the same token", func(t *testing.T) {
		fake := &fakeResetRequests{found: true}
		if err := auth.RequestPasswordReset(ctx, fake, tokenNow, 5*time.Minute, "a@b.com", ""); err != nil {
			t.Fatal(err)
		}
		if len(fake.rotated) != 1 || len(fake.notified) != 1 || fake.rotated[0] != fake.notified[0] {
			t.Errorf("rotated %v, notified %v, want one identical token each", fake.rotated, fake.notified)
		}
	})

	t.Run("infrastructure errors surface", func(t *testing.T) {
		boom := errors.New("db down")
		fake := &fakeResetRequests{resolveErr: boom}
		if err := auth.RequestPasswordReset(ctx, fake, tokenNow, time.Minute, "a@b.com", ""); !errors.Is(err, boom) {
			t.Errorf("RequestPasswordReset = %v, want db down", err)
		}
	})
}
