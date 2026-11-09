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

type SendCampaignArgs struct {
	CampaignID string `json:"campaignId"`
}

func (SendCampaignArgs) Kind() string { return "messaging_send_campaign" }

type DeliverCampaignMessageArgs struct {
	DeliveryID string `json:"deliveryId"`
}

func (DeliverCampaignMessageArgs) Kind() string { return "messaging_deliver_campaign_message" }

func (DeliverCampaignMessageArgs) InsertOpts() river.InsertOpts {
	return river.InsertOpts{UniqueOpts: river.UniqueOpts{ByArgs: true}}
}

type SendCampaignWorker struct {
	river.WorkerDefaults[SendCampaignArgs]
	Campaigns *Campaigns
}

func (w *SendCampaignWorker) Work(ctx context.Context, job *river.Job[SendCampaignArgs]) error {
	if err := w.Campaigns.Send(ctx, job.Args.CampaignID); err != nil {
		return fmt.Errorf("send campaign %s: %w", job.Args.CampaignID, err)
	}
	return nil
}

type DeliverCampaignMessageWorker struct {
	river.WorkerDefaults[DeliverCampaignMessageArgs]
	Campaigns *Campaigns
}

func (w *DeliverCampaignMessageWorker) Work(ctx context.Context, job *river.Job[DeliverCampaignMessageArgs]) error {
	err := w.Campaigns.Deliver(ctx, job.Args.DeliveryID, job.Attempt >= job.MaxAttempts)
	if errors.Is(err, ErrDeliveryFailed) || errors.Is(err, ErrDeliveryNotFound) {
		return river.JobCancel(err)
	}
	return err
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
