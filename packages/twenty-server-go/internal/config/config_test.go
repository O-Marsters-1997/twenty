package config_test

import (
	"log/slog"
	"testing"
	"time"

	"github.com/twentyhq/twenty/packages/twenty-server-go/internal/config"
)

func env(values map[string]string) func(string) string {
	return func(key string) string { return values[key] }
}

func TestLoad(t *testing.T) {
	t.Run("applies defaults", func(t *testing.T) {
		cfg, err := config.Load(env(map[string]string{}))
		if err != nil {
			t.Fatal(err)
		}
		if cfg.ListenAddr != ":3000" {
			t.Errorf("ListenAddr = %q, want :3000", cfg.ListenAddr)
		}
		if cfg.LogLevel != slog.LevelInfo {
			t.Errorf("LogLevel = %v, want info", cfg.LogLevel)
		}
		if cfg.RecoveryCodeTTL != time.Hour {
			t.Errorf("RecoveryCodeTTL = %v, want 1h", cfg.RecoveryCodeTTL)
		}
		days, err := config.Load(env(map[string]string{"TWO_FACTOR_AUTHENTICATION_RECOVERY_CODE_EXPIRES_IN": "2d"}))
		if err != nil || days.RecoveryCodeTTL != 48*time.Hour {
			t.Errorf("RecoveryCodeTTL for 2d = %v, %v, want 48h", days.RecoveryCodeTTL, err)
		}
	})

	t.Run("rejects bad values", func(t *testing.T) {
		tests := map[string]map[string]string{
			"bad level":        {"LOG_LEVEL": "loud"},
			"bad recovery ttl": {"TWO_FACTOR_AUTHENTICATION_RECOVERY_CODE_EXPIRES_IN": "soon"},
		}
		for name, values := range tests {
			t.Run(name, func(t *testing.T) {
				if _, err := config.Load(env(values)); err == nil {
					t.Error("Load() error = nil, want error")
				}
			})
		}
	})
}
