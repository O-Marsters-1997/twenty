package messaging

import "errors"

type SyncCursor string

var ErrSyncCursorExpired = errors.New("sync cursor expired")
