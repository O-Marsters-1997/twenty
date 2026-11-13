package auth

import (
	"crypto/hkdf"
	"crypto/sha256"
	"encoding/hex"
	"errors"
	"fmt"
)

func ResolveSessionCookieSecrets(encryptionKey, fallbackEncryptionKey, appSecret string) ([]string, error) {
	primary := encryptionKey
	if primary == "" {
		primary = appSecret
	}
	if primary == "" {
		return nil, errors.New("derive session cookie secret: set ENCRYPTION_KEY (or APP_SECRET for legacy deployments)")
	}
	var secrets []string
	for _, rawKey := range []string{primary, fallbackEncryptionKey} {
		if rawKey == "" {
			continue
		}
		derived, err := hkdf.Key(sha256.New, []byte(rawKey), make([]byte, 32), "twenty:hmac:v1:session-cookie", 32)
		if err != nil {
			return nil, fmt.Errorf("derive session cookie secret: %w", err)
		}
		secrets = append(secrets, hex.EncodeToString(derived))
	}
	if appSecret != "" {
		legacy := sha256.Sum256([]byte(appSecret + "SESSION_STORE_SECRET"))
		secrets = append(secrets, hex.EncodeToString(legacy[:]))
	}
	return secrets, nil
}
