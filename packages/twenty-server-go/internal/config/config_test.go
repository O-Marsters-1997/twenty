package config

import (
	"log/slog"
	"testing"
)

func env(values map[string]string) func(string) string {
	return func(key string) string { return values[key] }
}

func TestLoadDefaults(t *testing.T) {
	cfg, err := Load(env(map[string]string{"NODE_UPSTREAM_URL": "http://localhost:3001"}))
	if err != nil {
		t.Fatal(err)
	}
	if cfg.ListenAddr != ":3000" || cfg.LogLevel != slog.LevelInfo || cfg.NodeUpstreamURL.Host != "localhost:3001" {
		t.Errorf("unexpected config %+v", cfg)
	}
}

func TestLoadRejectsBadValues(t *testing.T) {
	tests := map[string]map[string]string{
		"missing upstream": {},
		"no scheme":        {"NODE_UPSTREAM_URL": "localhost:3001"},
		"bad level":        {"NODE_UPSTREAM_URL": "http://n:1", "LOG_LEVEL": "loud"},
	}
	for name, values := range tests {
		t.Run(name, func(t *testing.T) {
			if _, err := Load(env(values)); err == nil {
				t.Error("expected error")
			}
		})
	}
}
