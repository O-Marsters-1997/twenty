package auth

import (
	"crypto/aes"
	"crypto/cipher"
	"crypto/hkdf"
	"crypto/rand"
	"crypto/sha256"
	"encoding/base64"
	"encoding/hex"
	"errors"
	"fmt"
	"strings"
)

const instanceEncryptionScope = "instance"

var errMalformedEnvelope = errors.New("malformed secret envelope")

type SecretCipher struct {
	primary  string
	fallback string
}

func NewSecretCipher(encryptionKey, fallbackEncryptionKey, appSecret string) *SecretCipher {
	primary := encryptionKey
	if primary == "" {
		primary = appSecret
	}
	return &SecretCipher{primary: primary, fallback: fallbackEncryptionKey}
}

func (c *SecretCipher) Encrypt(plaintext, workspaceID string) (string, error) {
	if c.primary == "" {
		return "", errors.New("encrypt secret: no encryption key configured")
	}
	aead, err := newScopedAEAD(c.primary, workspaceID)
	if err != nil {
		return "", err
	}
	nonce := make([]byte, aead.NonceSize())
	if _, err := rand.Read(nonce); err != nil {
		return "", fmt.Errorf("encrypt secret: %w", err)
	}
	payload := aead.Seal(nonce, nonce, []byte(plaintext), nil)
	return envelopePrefix + encryptionKeyID(c.primary) + ":" + base64.StdEncoding.EncodeToString(payload), nil
}

func (c *SecretCipher) Decrypt(envelope, workspaceID string) (string, error) {
	rest, hasPrefix := strings.CutPrefix(envelope, envelopePrefix)
	keyID, encoded, hasKeyID := strings.Cut(rest, ":")
	if !hasPrefix || !hasKeyID {
		return "", fmt.Errorf("decrypt secret: %w", errMalformedEnvelope)
	}
	var rawKey string
	for _, candidate := range []string{c.primary, c.fallback} {
		if candidate != "" && encryptionKeyID(candidate) == keyID {
			rawKey = candidate
			break
		}
	}
	if rawKey == "" {
		return "", errors.New("decrypt secret: no encryption key matches the envelope")
	}
	aead, err := newScopedAEAD(rawKey, workspaceID)
	if err != nil {
		return "", err
	}
	data, err := base64.StdEncoding.DecodeString(encoded)
	if err != nil || len(data) < aead.NonceSize() {
		return "", fmt.Errorf("decrypt secret: %w", errMalformedEnvelope)
	}
	plaintext, err := aead.Open(nil, data[:aead.NonceSize()], data[aead.NonceSize():], nil)
	if err != nil {
		return "", fmt.Errorf("decrypt secret: %w", err)
	}
	return string(plaintext), nil
}

func encryptionKeyID(rawKey string) string {
	sum := sha256.Sum256([]byte(rawKey))
	return hex.EncodeToString(sum[:])[:8]
}

func newScopedAEAD(rawKey, workspaceID string) (cipher.AEAD, error) {
	scope := workspaceID
	if scope == "" {
		scope = instanceEncryptionScope
	}
	derived, err := hkdf.Key(sha256.New, []byte(rawKey), make([]byte, 32), "twenty:enc:v2:"+scope, 32)
	if err != nil {
		return nil, fmt.Errorf("derive secret key: %w", err)
	}
	block, err := aes.NewCipher(derived)
	if err != nil {
		return nil, fmt.Errorf("create secret cipher: %w", err)
	}
	aead, err := cipher.NewGCM(block)
	if err != nil {
		return nil, fmt.Errorf("create secret cipher: %w", err)
	}
	return aead, nil
}
