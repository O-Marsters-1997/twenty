package main

import (
	"errors"
	"fmt"
	"os"
	"strconv"
	"strings"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"

	accessstore "github.com/twentyhq/twenty/packages/twenty-server-go/internal/access/store"
	"github.com/twentyhq/twenty/packages/twenty-server-go/internal/files"
)

const defaultUploadTTLSeconds = 900

func fileService(pool *pgxpool.Pool, stack authStack) (*files.Service, error) {
	if storage := strings.ToUpper(os.Getenv("STORAGE_TYPE")); storage != "" && storage != "LOCAL" {
		return nil, errors.New("STORAGE_TYPE must be LOCAL: the Go server has no S3 storage driver")
	}
	fileTokenTTL, err := parseDuration(valueOrDefault(os.Getenv("FILE_TOKEN_EXPIRES_IN"), "1d"))
	if err != nil {
		return nil, fmt.Errorf("FILE_TOKEN_EXPIRES_IN: %w", err)
	}
	uploadSeconds, err := strconv.Atoi(valueOrDefault(os.Getenv("STORAGE_S3_PRESIGNED_URL_EXPIRES_IN"), strconv.Itoa(defaultUploadTTLSeconds)))
	if err != nil || uploadSeconds <= 0 {
		return nil, errors.New("STORAGE_S3_PRESIGNED_URL_EXPIRES_IN must be a positive number of seconds")
	}
	return files.NewService(pool, stack.issuer, accessstore.NewPermissions(pool).Has, files.Config{
		ServerURL:    stack.serverURL,
		StorageRoot:  valueOrDefault(os.Getenv("STORAGE_LOCAL_PATH"), ".local-storage"),
		FileTokenTTL: fileTokenTTL,
		UploadTTL:    time.Duration(uploadSeconds) * time.Second,
	}), nil
}
