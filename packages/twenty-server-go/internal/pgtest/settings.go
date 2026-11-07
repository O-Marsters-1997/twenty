package pgtest

import (
	"net/url"

	"github.com/twentyhq/twenty/packages/twenty-server-go/internal/migrations"
)

const (
	containerName = "twenty-pgtest-v1"
	image         = "postgres:16-alpine"
)

var (
	migrationFiles = migrations.FS
	migrate        = migrations.Up
	dsnParams      = url.Values{"pool_max_conns": {"4"}}
)
