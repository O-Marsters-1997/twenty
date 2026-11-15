package files

import (
	"context"
	"errors"
	"fmt"
	"io"
	"io/fs"
	"os"
	"path/filepath"
)

var ErrObjectNotFound = errors.New("storage object not found")

type Storage interface {
	Write(ctx context.Context, key string, body io.Reader) (int64, error)
	Size(ctx context.Context, key string) (int64, error)
	ReadPrefix(ctx context.Context, key string, n int) ([]byte, error)
	Open(ctx context.Context, key string) (io.ReadSeekCloser, error)
	Move(ctx context.Context, from, to string) error
	Delete(ctx context.Context, key string) error
}

type LocalStorage struct{ Root string }

func (s LocalStorage) path(key string) (string, error) {
	if !filepath.IsLocal(key) {
		return "", fmt.Errorf("storage key %q escapes the storage root", key)
	}
	return filepath.Join(s.Root, key), nil
}

func (s LocalStorage) Write(_ context.Context, key string, body io.Reader) (int64, error) {
	target, err := s.path(key)
	if err != nil {
		return 0, err
	}
	if err := os.MkdirAll(filepath.Dir(target), 0o755); err != nil {
		return 0, fmt.Errorf("create storage folder: %w", err)
	}
	partial, err := os.CreateTemp(filepath.Dir(target), ".*.part")
	if err != nil {
		return 0, fmt.Errorf("create partial file: %w", err)
	}
	written, copyErr := io.Copy(partial, body)
	closeErr := partial.Close()
	if err := errors.Join(copyErr, closeErr); err != nil {
		return 0, errors.Join(fmt.Errorf("write storage object: %w", err), os.Remove(partial.Name()))
	}
	if err := os.Rename(partial.Name(), target); err != nil {
		return 0, errors.Join(fmt.Errorf("publish storage object: %w", err), os.Remove(partial.Name()))
	}
	return written, nil
}

func (s LocalStorage) Size(_ context.Context, key string) (int64, error) {
	target, err := s.path(key)
	if err != nil {
		return 0, err
	}
	info, err := os.Stat(target)
	if errors.Is(err, fs.ErrNotExist) {
		return 0, ErrObjectNotFound
	}
	if err != nil {
		return 0, fmt.Errorf("stat storage object: %w", err)
	}
	return info.Size(), nil
}

func (s LocalStorage) ReadPrefix(ctx context.Context, key string, n int) ([]byte, error) {
	object, err := s.Open(ctx, key)
	if err != nil {
		return nil, err
	}
	defer object.Close()
	prefix, err := io.ReadAll(io.LimitReader(object, int64(n)))
	if err != nil {
		return nil, fmt.Errorf("read storage prefix: %w", err)
	}
	return prefix, nil
}

func (s LocalStorage) Open(_ context.Context, key string) (io.ReadSeekCloser, error) {
	target, err := s.path(key)
	if err != nil {
		return nil, err
	}
	object, err := os.Open(target)
	if errors.Is(err, fs.ErrNotExist) {
		return nil, ErrObjectNotFound
	}
	if err != nil {
		return nil, fmt.Errorf("open storage object: %w", err)
	}
	return object, nil
}

func (s LocalStorage) Move(_ context.Context, from, to string) error {
	source, err := s.path(from)
	if err != nil {
		return err
	}
	target, err := s.path(to)
	if err != nil {
		return err
	}
	if err := os.MkdirAll(filepath.Dir(target), 0o755); err != nil {
		return fmt.Errorf("create storage folder: %w", err)
	}
	if err := os.Rename(source, target); errors.Is(err, fs.ErrNotExist) {
		return ErrObjectNotFound
	} else if err != nil {
		return fmt.Errorf("move storage object: %w", err)
	}
	return nil
}

func (s LocalStorage) Delete(_ context.Context, key string) error {
	target, err := s.path(key)
	if err != nil {
		return err
	}
	if err := os.RemoveAll(target); err != nil {
		return fmt.Errorf("delete storage object: %w", err)
	}
	return nil
}
