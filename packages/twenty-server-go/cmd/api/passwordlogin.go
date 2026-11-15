package main

import (
	"errors"
	"fmt"
	"os"
	"strings"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/twentyhq/twenty/packages/twenty-server-go/internal/auth"
	"github.com/twentyhq/twenty/packages/twenty-server-go/internal/config"
)

func passwordLogin(pool *pgxpool.Pool, cfg config.Config, stack authStack) (*auth.PasswordLogin, error) {
	if os.Getenv("CAPTCHA_DRIVER") != "" {
		return nil, errors.New("CAPTCHA_DRIVER is set, but Go cannot verify captcha tokens for password login yet")
	}
	fileTokenTTL, err := parseDuration(valueOrDefault(os.Getenv("FILE_TOKEN_EXPIRES_IN"), "1d"))
	if err != nil {
		return nil, fmt.Errorf("FILE_TOKEN_EXPIRES_IN: %w", err)
	}
	return auth.NewPasswordLogin(pool, auth.NewPasswordHasher(), stack.issuer, stack.origins, auth.PasswordLoginConfig{
		FrontURL:                  stack.frontURL,
		ServerURL:                 stack.serverURL,
		MultiWorkspace:            cfg.MultiWorkspace,
		EmailVerificationRequired: os.Getenv("IS_EMAIL_VERIFICATION_REQUIRED") == "true",
		FileTokenTTL:              fileTokenTTL,
	}), nil
}

func valueOrDefault(value, fallback string) string {
	if value == "" {
		return fallback
	}
	return value
}

func optionalDuration(name string) (time.Duration, error) {
	value := os.Getenv(name)
	if value == "" {
		return 0, nil
	}
	duration, err := parseDuration(value)
	if err != nil {
		return 0, fmt.Errorf("%s: %w", name, err)
	}
	return duration, nil
}

func parseDuration(text string) (time.Duration, error) {
	days, hasDays := strings.CutSuffix(text, "d")
	if hasDays {
		text = days + "h"
	}
	duration, err := time.ParseDuration(text)
	if err != nil || duration <= 0 {
		return 0, fmt.Errorf("%q must be a positive duration like 1h or 2d", text)
	}
	if hasDays {
		duration *= 24
	}
	return duration, nil
}
