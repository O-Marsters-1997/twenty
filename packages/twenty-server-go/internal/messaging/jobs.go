package messaging

import (
	"context"
	"errors"
	"fmt"

	"github.com/riverqueue/river"
)

// SyncMessageChannelArgs is the River job that imports one channel's new messages.
type SyncMessageChannelArgs struct {
	ChannelID string `json:"channelId"`
}

func (SyncMessageChannelArgs) Kind() string { return "messaging_sync_channel" }

// InsertOpts keeps a channel from queueing a second sync while one is waiting.
func (SyncMessageChannelArgs) InsertOpts() river.InsertOpts {
	return river.InsertOpts{UniqueOpts: river.UniqueOpts{ByArgs: true}}
}

// EnqueueMessageSyncsArgs is the periodic River job that fans out one sync per active channel.
type EnqueueMessageSyncsArgs struct{}

func (EnqueueMessageSyncsArgs) Kind() string { return "messaging_enqueue_syncs" }

type SyncMessageChannelWorker struct {
	river.WorkerDefaults[SyncMessageChannelArgs]
	Syncer *Syncer
}

func (w *SyncMessageChannelWorker) Work(ctx context.Context, job *river.Job[SyncMessageChannelArgs]) error {
	err := w.Syncer.Sync(ctx, job.Args.ChannelID)
	if errors.Is(err, ErrChannelNotFound) || errors.Is(err, ErrAccountAuthFailed) {
		return river.JobCancel(err)
	}
	if err != nil {
		return fmt.Errorf("sync channel %s: %w", job.Args.ChannelID, err)
	}
	return nil
}

type EnqueueMessageSyncsWorker struct {
	river.WorkerDefaults[EnqueueMessageSyncsArgs]
	Store SyncStore
	Queue func(ctx context.Context, args river.JobArgs) error
}

func (w *EnqueueMessageSyncsWorker) Work(ctx context.Context, _ *river.Job[EnqueueMessageSyncsArgs]) error {
	ids, err := w.Store.ActiveChannelIDs(ctx)
	if err != nil {
		return fmt.Errorf("list active channels: %w", err)
	}
	var errs []error
	for _, id := range ids {
		if err := w.Queue(ctx, SyncMessageChannelArgs{ChannelID: id}); err != nil {
			errs = append(errs, fmt.Errorf("enqueue sync for channel %s: %w", id, err))
		}
	}
	return errors.Join(errs...)
}
