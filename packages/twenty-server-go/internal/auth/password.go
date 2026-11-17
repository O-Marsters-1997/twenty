package auth

import (
	"errors"
	"fmt"
	"unicode/utf16"

	"golang.org/x/crypto/bcrypt"
)

var ErrPasswordInvalid = errors.New("password too weak")

func ValidPassword(password string) bool {
	units := 0
	for _, r := range password {
		switch r {
		case '\n', '\r', ' ', ' ':
			return false
		}
		units += utf16.RuneLen(r)
	}
	return units >= 8 && units <= 50
}

func HashNewPassword(hasher PasswordHasher, password string) (string, error) {
	if !ValidPassword(password) {
		return "", ErrPasswordInvalid
	}
	return hasher.Hash(password)
}

const bcryptCost = 10

// ErrInvalidCredentials is returned when a password does not match its hash.
var ErrInvalidCredentials = errors.New("invalid credentials")

// PasswordHasher hashes and checks passwords with bcrypt, compatible with
// hashes the Node server wrote.
type PasswordHasher interface {
	Hash(password string) (string, error)
	Compare(hash, password string) error
}

type bcryptHasher struct{}

// NewPasswordHasher returns the bcrypt PasswordHasher.
func NewPasswordHasher() PasswordHasher { return bcryptHasher{} }

func (bcryptHasher) Hash(password string) (string, error) {
	hash, err := bcrypt.GenerateFromPassword([]byte(password), bcryptCost)
	if err != nil {
		return "", fmt.Errorf("hash password: %w", err)
	}
	return string(hash), nil
}

func (bcryptHasher) Compare(hash, password string) error {
	err := bcrypt.CompareHashAndPassword([]byte(hash), []byte(password))
	switch {
	case err == nil:
		return nil
	case errors.Is(err, bcrypt.ErrMismatchedHashAndPassword):
		return ErrInvalidCredentials
	default:
		return fmt.Errorf("compare password: %w", err)
	}
}
