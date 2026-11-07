import { Module } from '@nestjs/common';
import { ModuleRef } from '@nestjs/core';
import { TypeOrmModule } from '@nestjs/typeorm';

import { TypeORMModule } from 'src/database/typeorm/typeorm.module';
import { WorkspaceCacheModule } from 'src/engine/workspace-cache/workspace-cache.module';
import { AuthModule } from 'src/engine/core-modules/auth/auth.module';
import { PendingWakeUpModule } from 'src/engine/core-modules/pending-wake-up/pending-wake-up.module';
import { EmailSenderJob } from 'src/engine/core-modules/email/email-sender.job';
import { EmailModule } from 'src/engine/core-modules/email/email.module';
import { RecordExportModule } from 'src/engine/core-modules/record-export/record-export.module';
import { EmailingModule } from 'src/modules/emailing/emailing.module';
import { AddPeopleToMessageListJob } from 'src/modules/emailing/jobs/add-people-to-message-list.job';
import { MaterializeCampaignChunkJob } from 'src/modules/emailing/jobs/materialize-campaign-chunk.job';
import { MaterializeCampaignJob } from 'src/modules/emailing/jobs/materialize-campaign.job';
import { ReconcileWorkspaceCampaignStatsJob } from 'src/modules/emailing/jobs/reconcile-workspace-campaign-stats.job';
import { RefreshCampaignStatsJob } from 'src/modules/emailing/jobs/refresh-campaign-stats.job';
import { SendCampaignEmailBatchJob } from 'src/modules/emailing/jobs/send-campaign-email-batch.job';
import { SendCampaignEmailJob } from 'src/modules/emailing/jobs/send-campaign-email.job';
import { SendScheduledCampaignJob } from 'src/modules/emailing/jobs/send-scheduled-campaign.job';
import { EventLogIngestionModule } from 'src/engine/core-modules/event-logs/ingest/event-log-ingestion.module';
import { FeatureFlagModule } from 'src/engine/core-modules/feature-flag/feature-flag.module';
import { UserWorkspaceModule } from 'src/engine/core-modules/user-workspace/user-workspace.module';
import { UpdateWorkspaceMemberEmailJob } from 'src/engine/core-modules/user/jobs/update-workspace-member-email.job';
import { UserVarsModule } from 'src/engine/core-modules/user/user-vars/user-vars.module';
import { UserModule } from 'src/engine/core-modules/user/user.module';
import { HandleWorkspaceMemberDeletedJob } from 'src/engine/core-modules/workspace/handle-workspace-member-deleted.job';
import { WorkspaceEntity } from 'src/engine/core-modules/workspace/workspace.entity';
import { WorkspaceModule } from 'src/engine/core-modules/workspace/workspace.module';
import { AiAgentTriggerModule } from 'src/engine/metadata-modules/ai/ai-agent-trigger/ai-agent-trigger.module';
import { AiChatModule } from 'src/engine/metadata-modules/ai/ai-chat/ai-chat.module';
import { NavigationMenuItemModule } from 'src/engine/metadata-modules/navigation-menu-item/navigation-menu-item.module';
import { ObjectMetadataModule } from 'src/engine/metadata-modules/object-metadata/object-metadata.module';
import { WebhookJobModule } from 'src/engine/metadata-modules/webhook/jobs/webhook-job.module';
import { DeferredWorkspaceMigrationActionRecoveryCronJob } from 'src/engine/workspace-manager/workspace-migration/workspace-migration-runner/crons/jobs/deferred-workspace-migration-action-recovery.cron.job';
import { RunDeferredWorkspaceMigrationActionsJob } from 'src/engine/workspace-manager/workspace-migration/workspace-migration-runner/jobs/run-deferred-workspace-migration-actions.job';
import { WorkspaceMigrationRunnerModule } from 'src/engine/workspace-manager/workspace-migration/workspace-migration-runner/workspace-migration-runner.module';
import { SubscriptionsModule } from 'src/engine/subscriptions/subscriptions.module';
import { CleanOnboardingWorkspacesJob } from 'src/engine/workspace-manager/workspace-cleaner/crons/clean-onboarding-workspaces.job';
import { CleanWorkspaceDeletionWarningUserVarsJob } from 'src/engine/workspace-manager/workspace-cleaner/jobs/clean-workspace-deletion-warning-user-vars.job';
import { WorkspaceCleanerModule } from 'src/engine/workspace-manager/workspace-cleaner/workspace-cleaner.module';
import { CalendarEventParticipantManagerModule } from 'src/modules/calendar/calendar-event-participant-manager/calendar-event-participant-manager.module';
import { CalendarModule } from 'src/modules/calendar/calendar.module';
import { AutoCompaniesAndContactsCreationJobModule } from 'src/modules/contact-creation-manager/jobs/auto-companies-and-contacts-creation-job.module';
import { MessagingModule } from 'src/modules/messaging/messaging.module';
import { TimelineJobModule } from 'src/modules/timeline/jobs/timeline-job.module';
import { TimelineActivityModule } from 'src/modules/timeline/timeline-activity.module';
import { WorkflowModule } from 'src/modules/workflow/workflow.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([WorkspaceEntity]),
    ObjectMetadataModule,
    RecordExportModule,
    TypeORMModule,
    UserModule,
    UserVarsModule,
    EmailModule,
    UserWorkspaceModule,
    WorkspaceModule,
    AuthModule,
    MessagingModule,
    CalendarModule,
    CalendarEventParticipantManagerModule,
    TimelineActivityModule,
    FeatureFlagModule,
    AutoCompaniesAndContactsCreationJobModule,
    TimelineJobModule,
    WebhookJobModule,
    WorkflowModule,
    NavigationMenuItemModule,
    WorkspaceCleanerModule,
    WorkspaceCacheModule,
    SubscriptionsModule,
    EventLogIngestionModule,
    AiAgentTriggerModule,
    AiChatModule,
    EmailingModule,
    PendingWakeUpModule,
    WorkspaceMigrationRunnerModule,
  ],
  providers: [
    CleanOnboardingWorkspacesJob,
    EmailSenderJob,
    SendCampaignEmailJob,
    AddPeopleToMessageListJob,
    SendCampaignEmailBatchJob,
    MaterializeCampaignJob,
    MaterializeCampaignChunkJob,
    SendScheduledCampaignJob,
    RefreshCampaignStatsJob,
    ReconcileWorkspaceCampaignStatsJob,
    HandleWorkspaceMemberDeletedJob,
    CleanWorkspaceDeletionWarningUserVarsJob,
    UpdateWorkspaceMemberEmailJob,
    RunDeferredWorkspaceMigrationActionsJob,
    DeferredWorkspaceMigrationActionRecoveryCronJob,
  ],
})
export class JobsModule {
  static moduleRef: ModuleRef;

  constructor(private moduleRef: ModuleRef) {
    JobsModule.moduleRef = this.moduleRef;
  }
}
