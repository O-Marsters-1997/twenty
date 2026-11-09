package main

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"log/slog"
	"time"

	"github.com/riverqueue/river"

	"github.com/twentyhq/twenty/packages/twenty-server-go/internal/workflow"
	"github.com/twentyhq/twenty/packages/twenty-server-go/internal/workflow/store"
)

const cronSyncInterval = time.Minute

type cronTriggerWorker struct {
	river.WorkerDefaults[workflow.CronTriggerArgs]
	launcher *workflow.Launcher
}

func (w *cronTriggerWorker) Work(ctx context.Context, job *river.Job[workflow.CronTriggerArgs]) error {
	_, err := w.launcher.Launch(ctx, job.Args.TriggerID, workflow.TriggerTypeCron, nil)
	if errors.Is(err, workflow.ErrNotLaunchable) || errors.Is(err, store.ErrNotFound) {
		return river.JobCancel(err)
	}
	if err != nil {
		return fmt.Errorf("launch cron trigger %s: %w", job.Args.TriggerID, err)
	}
	return nil
}

type activeVersionSource interface {
	ActiveVersions(ctx context.Context) ([]store.Version, error)
}

type cronScheduler struct {
	source    activeVersionSource
	bundle    *river.PeriodicJobBundle
	logger    *slog.Logger
	scheduled map[string]string
}

func newCronScheduler(source activeVersionSource, bundle *river.PeriodicJobBundle, logger *slog.Logger) *cronScheduler {
	return &cronScheduler{source: source, bundle: bundle, logger: logger, scheduled: map[string]string{}}
}

func (s *cronScheduler) sync(ctx context.Context) error {
	versions, err := s.source.ActiveVersions(ctx)
	if err != nil {
		return fmt.Errorf("list active versions: %w", err)
	}
	desired := map[string]string{}
	for _, version := range versions {
		if !isCronTrigger(version) {
			continue
		}
		desired[version.ID] = string(version.Trigger)
	}
	for id := range s.scheduled {
		if desired[id] != s.scheduled[id] {
			s.bundle.RemoveByID(id)
			delete(s.scheduled, id)
		}
	}
	for id, trigger := range desired {
		if _, ok := s.scheduled[id]; ok {
			continue
		}
		schedule, err := workflow.CronSchedule([]byte(trigger))
		if err != nil {
			s.logger.Warn("skip cron trigger", "trigger_id", id, "err", err)
			continue
		}
		s.bundle.Add(river.NewPeriodicJob(
			schedule,
			func() (river.JobArgs, *river.InsertOpts) { return workflow.CronTriggerArgs{TriggerID: id}, nil },
			&river.PeriodicJobOpts{ID: id},
		))
		s.scheduled[id] = trigger
	}
	return nil
}

func (s *cronScheduler) run(ctx context.Context) {
	ticker := time.NewTicker(cronSyncInterval)
	defer ticker.Stop()
	for {
		if err := s.sync(ctx); err != nil && ctx.Err() == nil {
			s.logger.Error("sync cron triggers", "err", err)
		}
		select {
		case <-ctx.Done():
			return
		case <-ticker.C:
		}
	}
}

func isCronTrigger(version store.Version) bool {
	var definition struct {
		Type workflow.TriggerType `json:"type"`
	}
	return json.Unmarshal(version.Trigger, &definition) == nil && definition.Type == workflow.TriggerTypeCron
}
