import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { UserWorkspaceEntity } from 'src/engine/core-modules/user-workspace/user-workspace.entity';
import { WorkspaceEntity } from 'src/engine/core-modules/workspace/workspace.entity';
import { WorkspaceModule } from 'src/engine/core-modules/workspace/workspace.module';
import { CleanOnboardingWorkspacesCommand } from 'src/engine/workspace-manager/workspace-cleaner/commands/clean-onboarding-workspaces.command';
import { CleanOnboardingWorkspacesCronCommand } from 'src/engine/workspace-manager/workspace-cleaner/commands/clean-onboarding-workspaces.cron.command';
import { DestroyWorkspaceCommand } from 'src/engine/workspace-manager/workspace-cleaner/commands/destroy-workspace.command';
import { DestroySoftDeletedWorkspaceJob } from 'src/engine/workspace-manager/workspace-cleaner/jobs/destroy-soft-deleted-workspace.job';
import { CleanerWorkspaceService } from 'src/engine/workspace-manager/workspace-cleaner/services/cleaner.workspace-service';

@Module({
  imports: [
    TypeOrmModule.forFeature([WorkspaceEntity, UserWorkspaceEntity]),
    WorkspaceModule,
  ],
  providers: [
    DestroyWorkspaceCommand,
    CleanOnboardingWorkspacesCommand,
    CleanOnboardingWorkspacesCronCommand,
    CleanerWorkspaceService,
    DestroySoftDeletedWorkspaceJob,
  ],
  exports: [CleanerWorkspaceService, CleanOnboardingWorkspacesCronCommand],
})
export class WorkspaceCleanerModule {}
