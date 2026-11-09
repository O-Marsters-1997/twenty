package messaging

import (
	"context"
	"errors"
	"fmt"
	"time"

	"github.com/riverqueue/river"
)

func CalendarSyncPeriodicJob(interval time.Duration) *river.PeriodicJob {
	return river.NewPeriodicJob(
		river.PeriodicInterval(interval),
		func() (river.JobArgs, *river.InsertOpts) { return EnqueueCalendarSyncArgs{}, nil },
		&river.PeriodicJobOpts{RunOnStart: true},
	)
}

type SyncCalendarChannelArgs struct {
	ChannelID string `json:"channelId"`
}

func (SyncCalendarChannelArgs) Kind() string { return "calendar_channel_sync" }

// EnqueueCalendarSyncArgs is the periodic River job that fans out one SyncCalendarChannelArgs per active channel.
type EnqueueCalendarSyncArgs struct{}

func (EnqueueCalendarSyncArgs) Kind() string { return "calendar_sync_enqueue" }

type Enqueuer func(ctx context.Context, args river.JobArgs) error

type SyncCalendarChannelWorker struct {
	river.WorkerDefaults[SyncCalendarChannelArgs]
	Syncer *CalendarSyncer
}

func (w *SyncCalendarChannelWorker) Work(ctx context.Context, job *river.Job[SyncCalendarChannelArgs]) error {
	err := w.Syncer.SyncChannel(ctx, job.Args.ChannelID)
	if errors.Is(err, ErrAccountAuthFailed) {
		return river.JobCancel(err)
	}
	return err
}

type EnqueueCalendarSyncWorker struct {
	river.WorkerDefaults[EnqueueCalendarSyncArgs]
	Channels CalendarChannels
	Queue    Enqueuer
}

func (w *EnqueueCalendarSyncWorker) Work(ctx context.Context, _ *river.Job[EnqueueCalendarSyncArgs]) error {
	ids, err := w.Channels.ActiveIDs(ctx)
	if err != nil {
		return fmt.Errorf("list active calendar channels: %w", err)
	}
	var errs []error
	for _, id := range ids {
		if err := w.Queue(ctx, SyncCalendarChannelArgs{ChannelID: id}); err != nil {
			errs = append(errs, fmt.Errorf("enqueue calendar channel %s: %w", id, err))
		}
	}
	return errors.Join(errs...)
}
