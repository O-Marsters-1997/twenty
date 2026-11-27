package files

import (
	"errors"
	"fmt"
	"io"
	"io/fs"
	"os"
	"path/filepath"
)

var (
	errObjectNotFound = errors.New("storage object not found")
	errObjectTooLarge = errors.New("storage object exceeds its limit")
)

type localStorage struct{ root string }

func (s localStorage) path(key string) (string, error) {
	if !filepath.IsLocal(key) {
		return "", fmt.Errorf("storage key %q escapes the storage root", key)
	}
	return filepath.Join(s.root, key), nil
}

func (s localStorage) write(key string, body io.Reader, limit int64) (int64, error) {
	target, err := s.path(key)
	if err != nil {
		return 0, err
	}
	if err := os.MkdirAll(filepath.Dir(target), 0o750); err != nil {
		return 0, fmt.Errorf("create storage folder: %w", err)
	}
	partial, err := os.CreateTemp(filepath.Dir(target), ".*.part")
	if err != nil {
		return 0, fmt.Errorf("create partial object: %w", err)
	}
	written, copyErr := io.Copy(partial, io.LimitReader(body, limit+1))
	closeErr := partial.Close()
	if err := errors.Join(copyErr, closeErr); err != nil {
		return 0, errors.Join(fmt.Errorf("write storage object: %w", err), os.Remove(partial.Name()))
	}
	if written > limit {
		return 0, errors.Join(errObjectTooLarge, os.Remove(partial.Name()))
	}
	if err := os.Rename(partial.Name(), target); err != nil {
		return 0, errors.Join(fmt.Errorf("publish storage object: %w", err), os.Remove(partial.Name()))
	}
	return written, nil
}

func (s localStorage) size(key string) (int64, error) {
	target, err := s.path(key)
	if err != nil {
		return 0, err
	}
	info, err := os.Stat(target)
	if errors.Is(err, fs.ErrNotExist) {
		return 0, errObjectNotFound
	}
	if err != nil {
		return 0, fmt.Errorf("stat storage object: %w", err)
	}
	return info.Size(), nil
}

func (s localStorage) open(key string) (*os.File, error) {
	target, err := s.path(key)
	if err != nil {
		return nil, err
	}
	object, err := os.Open(target)
	if errors.Is(err, fs.ErrNotExist) {
		return nil, errObjectNotFound
	}
	if err != nil {
		return nil, fmt.Errorf("open storage object: %w", err)
	}
	return object, nil
}

func (s localStorage) readPrefix(key string, count int64) (prefix []byte, err error) {
	object, err := s.open(key)
	if err != nil {
		return nil, err
	}
	defer func() { err = errors.Join(err, object.Close()) }()
	prefix, err = io.ReadAll(io.LimitReader(object, count))
	if err != nil {
		return nil, fmt.Errorf("read storage prefix: %w", err)
	}
	return prefix, nil
}

func (s localStorage) move(from, to string) error {
	source, err := s.path(from)
	if err != nil {
		return err
	}
	target, err := s.path(to)
	if err != nil {
		return err
	}
	if err := os.MkdirAll(filepath.Dir(target), 0o750); err != nil {
		return fmt.Errorf("create storage folder: %w", err)
	}
	if err := os.Rename(source, target); errors.Is(err, fs.ErrNotExist) {
		return errObjectNotFound
	} else if err != nil {
		return fmt.Errorf("move storage object: %w", err)
	}
	return nil
}

func (s localStorage) remove(key string) error {
	target, err := s.path(key)
	if err != nil {
		return err
	}
	if err := os.RemoveAll(target); err != nil {
		return fmt.Errorf("delete storage object: %w", err)
	}
	return nil
}
