import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';

import { isDefined } from 'twenty-shared/utils';
import { WorkspaceActivationStatus } from 'twenty-shared/workspace';
import { In, Repository } from 'typeorm';

import { InjectMessageQueue } from 'src/engine/core-modules/message-queue/decorators/message-queue.decorator';
import { MessageQueue } from 'src/engine/core-modules/message-queue/message-queue.constants';
import { MessageQueueService } from 'src/engine/core-modules/message-queue/services/message-queue.service';
import { UserWorkspaceEntity } from 'src/engine/core-modules/user-workspace/user-workspace.entity';
import { WorkspaceService } from 'src/engine/core-modules/workspace/services/workspace.service';
import { WorkspaceEntity } from 'src/engine/core-modules/workspace/workspace.entity';
import {
  DestroySoftDeletedWorkspaceJob,
  type DestroySoftDeletedWorkspaceJobData,
} from 'src/engine/workspace-manager/workspace-cleaner/jobs/destroy-soft-deleted-workspace.job';

@Injectable()
export class CleanerWorkspaceService {
  private readonly logger = new Logger(CleanerWorkspaceService.name);

  constructor(
    private readonly workspaceService: WorkspaceService,
    @InjectRepository(WorkspaceEntity)
    private readonly workspaceRepository: Repository<WorkspaceEntity>,
    @InjectRepository(UserWorkspaceEntity)
    private readonly userWorkspaceRepository: Repository<UserWorkspaceEntity>,
    @InjectMessageQueue(MessageQueue.workspaceDestroyQueue)
    private readonly workspaceDestroyQueueService: MessageQueueService,
  ) {}

  private async enqueueWorkspaceDestruction(
    workspaceId: string,
  ): Promise<string | undefined> {
    return this.workspaceDestroyQueueService.add<DestroySoftDeletedWorkspaceJobData>(
      DestroySoftDeletedWorkspaceJob.name,
      { workspaceId },
      { id: `destroy-soft-deleted-workspace-${workspaceId}` },
    );
  }

  async batchCleanOnboardingWorkspaces(
    workspaceIds: string[],
    dryRun = false,
  ): Promise<void> {
    this.logger.log(
      `${dryRun ? 'DRY RUN - ' : ''}batchCleanOnboardingWorkspaces running...`,
    );

    const workspaces = await this.workspaceRepository.find({
      where: {
        id: In(workspaceIds),
        activationStatus: In([
          WorkspaceActivationStatus.PENDING_CREATION,
          WorkspaceActivationStatus.ONGOING_CREATION,
          WorkspaceActivationStatus.CREATED,
        ]),
      },
      withDeleted: true,
    });

    if (workspaces.length !== 0) {
      for (const workspace of workspaces) {
        if (!isDefined(workspace.deletedAt)) {
          this.logger.log(
            `${dryRun ? 'DRY RUN - ' : ''}Soft deleting onboarding workspace ${workspace.id}`,
          );

          if (!dryRun) {
            const userWorkspaces = await this.userWorkspaceRepository.find({
              where: {
                workspaceId: workspace.id,
              },
              withDeleted: true,
            });

            for (const userWorkspace of userWorkspaces) {
              await this.workspaceService.handleRemoveWorkspaceMember(
                workspace.id,
                userWorkspace.userId,
              );
            }

            await this.workspaceService.deleteWorkspace(workspace.id, true);
          }
        } else {
          this.logger.log(
            `${dryRun ? 'DRY RUN - ' : ''}Enqueuing destruction of onboarding workspace ${workspace.id}`,
          );

          if (!dryRun) {
            await this.enqueueWorkspaceDestruction(workspace.id);
          }
        }
      }

      this.logger.log(
        `${dryRun ? 'DRY RUN - ' : ''}batchCleanOnboardingWorkspaces done with ${workspaces.length} workspaces!`,
      );
    }
  }

  async destroySoftDeletedWorkspaces(
    workspaceIds: string[],
    dryRun = false,
  ): Promise<void> {
    this.logger.log(
      `${dryRun ? 'DRY RUN - ' : ''}destroySoftDeletedWorkspaces running...`,
    );

    const workspaces = await this.workspaceRepository.find({
      where: {
        id: In(workspaceIds),
      },
      withDeleted: true,
    });

    for (const workspace of workspaces) {
      if (!isDefined(workspace.deletedAt)) {
        this.logger.warn(
          `${dryRun ? 'DRY RUN - ' : ''}Workspace ${workspace.id} is not soft deleted, skipping`,
        );

        continue;
      }

      this.logger.log(
        `${dryRun ? 'DRY RUN - ' : ''}Destroying workspace ${workspace.id}`,
      );

      if (!dryRun) {
        await this.workspaceService.deleteWorkspace(workspace.id);
      }

      this.logger.log(
        `${dryRun ? 'DRY RUN - ' : ''}Destroyed workspace ${workspace.id}`,
      );
    }
  }
}
