import { Injectable, Logger } from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';

import { isDefined } from 'twenty-shared/utils';
import { type DataSource, type QueryRunner, type Repository } from 'typeorm';

import { ApplicationEntity } from 'src/engine/core-modules/application/application.entity';
import { ApplicationLookupService } from 'src/engine/core-modules/application/application-lookup/application-lookup.service';
import {
  ApplicationException,
  ApplicationExceptionCode,
} from 'src/engine/core-modules/application/application.exception';
import { WORKSPACE_CUSTOM_APPLICATION_NAME } from 'src/engine/core-modules/application/constants/workspace-custom-application.constant';
import { type FlatApplication } from 'src/engine/core-modules/application/types/flat-application.type';
import { FileStorageService } from 'src/engine/core-modules/file-storage/services/file-storage.service';
import { WorkspaceEntity } from 'src/engine/core-modules/workspace/workspace.entity';
import { AgentEntity } from 'src/engine/metadata-modules/ai/ai-agent/entities/agent.entity';
import { CommandMenuItemEntity } from 'src/engine/metadata-modules/command-menu-item/entities/command-menu-item.entity';
import { ALL_FLAT_ENTITY_MAPS_PROPERTIES } from 'src/engine/metadata-modules/flat-entity/constant/all-flat-entity-maps-properties.constant';
import { ObjectMetadataEntity } from 'src/engine/metadata-modules/object-metadata/object-metadata.entity';
import { serializeApplicationForBroadcast } from 'src/engine/core-modules/application/utils/serialize-application-for-broadcast.util';
import { WorkspaceEventBroadcaster } from 'src/engine/subscriptions/workspace-event-broadcaster/workspace-event-broadcaster.service';
import { InjectWorkspaceScopedRepository } from 'src/engine/twenty-orm/workspace-scoped-repository/inject-workspace-scoped-repository.decorator';
import { WorkspaceScopedRepository } from 'src/engine/twenty-orm/workspace-scoped-repository/workspace-scoped-repository';
import { WorkspaceCacheService } from 'src/engine/workspace-cache/services/workspace-cache.service';
import { TWENTY_STANDARD_APPLICATION } from 'src/engine/workspace-manager/twenty-standard-application/constants/twenty-standard-applications';
import { type QueryDeepPartialEntity } from 'typeorm/query-builder/QueryPartialEntity';

@Injectable()
export class ApplicationService {
  private readonly logger = new Logger(ApplicationService.name);

  constructor(
    @InjectDataSource()
    private readonly coreDataSource: DataSource,
    @InjectWorkspaceScopedRepository(ApplicationEntity)
    private readonly applicationRepository: WorkspaceScopedRepository<ApplicationEntity>,
    private readonly workspaceCacheService: WorkspaceCacheService,
    private readonly fileStorageService: FileStorageService,
    @InjectRepository(WorkspaceEntity)
    private readonly workspaceRepository: Repository<WorkspaceEntity>,
    @InjectWorkspaceScopedRepository(AgentEntity)
    private readonly agentRepository: WorkspaceScopedRepository<AgentEntity>,
    @InjectWorkspaceScopedRepository(CommandMenuItemEntity)
    private readonly commandMenuItemRepository: WorkspaceScopedRepository<CommandMenuItemEntity>,
    @InjectWorkspaceScopedRepository(ObjectMetadataEntity)
    private readonly objectMetadataRepository: WorkspaceScopedRepository<ObjectMetadataEntity>,
    private readonly workspaceEventBroadcaster: WorkspaceEventBroadcaster,
    private readonly applicationLookupService: ApplicationLookupService,
  ) {}

  async findApplicationRoleId(
    applicationId: string,
    workspaceId: string,
  ): Promise<string> {
    const application = await this.applicationRepository.findOne(workspaceId, {
      where: { id: applicationId },
    });

    if (!isDefined(application) || !isDefined(application.defaultRoleId)) {
      throw new ApplicationException(
        `Could not find application ${applicationId}`,
        ApplicationExceptionCode.APPLICATION_NOT_FOUND,
      );
    }

    return application.defaultRoleId;
  }

  async findWorkspaceTwentyStandardAndCustomApplicationOrThrow({
    workspace: workspaceInput,
    workspaceId,
  }:
    | {
        workspaceId: string;
        workspace?: never;
      }
    | {
        workspace: WorkspaceEntity;
        workspaceId?: never;
      }) {
    const workspace = isDefined(workspaceInput)
      ? workspaceInput
      : await this.workspaceRepository.findOne({
          select: ['id', 'workspaceCustomApplicationId'],
          where: {
            id: workspaceId,
          },
          withDeleted: true,
        });

    if (!isDefined(workspace)) {
      throw new ApplicationException(
        `Could not find workspace ${workspaceId}`,
        ApplicationExceptionCode.APPLICATION_NOT_FOUND,
      );
    }

    const { flatApplicationMaps } =
      await this.workspaceCacheService.getOrRecompute(workspace.id, [
        'flatApplicationMaps',
      ]);

    const twentyStandardApplicationId =
      flatApplicationMaps.idByUniversalIdentifier[
        TWENTY_STANDARD_APPLICATION.universalIdentifier
      ];

    if (!isDefined(twentyStandardApplicationId)) {
      throw new ApplicationException(
        `Could not find workspace Standard applicationId in cache ${workspaceId}`,
        ApplicationExceptionCode.APPLICATION_NOT_FOUND,
      );
    }

    const twentyStandardFlatApplication =
      flatApplicationMaps.byId[twentyStandardApplicationId];
    const workspaceCustomFlatApplication =
      flatApplicationMaps.byId[workspace.workspaceCustomApplicationId];

    if (
      !isDefined(twentyStandardFlatApplication) ||
      !isDefined(workspaceCustomFlatApplication)
    ) {
      throw new ApplicationException(
        `Could not find workspace custom and standard applications ${workspace.id}`,
        ApplicationExceptionCode.APPLICATION_NOT_FOUND,
      );
    }

    return {
      twentyStandardFlatApplication,
      workspaceCustomFlatApplication,
    };
  }

  async findManyApplications(
    workspaceId: string,
  ): Promise<ApplicationEntity[]> {
    return this.applicationRepository.find(workspaceId);
  }

  async findManyInstalledFlatApplications(
    workspaceId: string,
  ): Promise<FlatApplication[]> {
    const { flatApplicationMaps } =
      await this.workspaceCacheService.getOrRecompute(workspaceId, [
        'flatApplicationMaps',
      ]);

    return Object.values(flatApplicationMaps.byId).filter(
      (flatApplication): flatApplication is FlatApplication =>
        isDefined(flatApplication) && !isDefined(flatApplication.deletedAt),
    );
  }

  async findOneApplicationWithRelations({
    id,
    universalIdentifier,
    workspaceId,
  }: {
    id?: string;
    universalIdentifier?: string;
    workspaceId: string;
  }): Promise<ApplicationEntity | null> {
    if (!isDefined(id) && !isDefined(universalIdentifier)) {
      throw new ApplicationException(
        `Either id or universalIdentifier must be provided to find application.`,
        ApplicationExceptionCode.APPLICATION_NOT_FOUND,
      );
    }

    const application = await this.applicationRepository.findOne(workspaceId, {
      where: isDefined(id) ? { id } : { universalIdentifier },
    });

    if (!isDefined(application)) {
      return null;
    }

    const [
      agents,
      commandMenuItems,
      objects,
    ] = await Promise.all([
      this.agentRepository.find(workspaceId, {
        where: { applicationId: application.id },
      }),
      this.commandMenuItemRepository.find(workspaceId, {
        where: { applicationId: application.id },
      }),
      this.objectMetadataRepository.find(workspaceId, {
        where: { applicationId: application.id },
      }),
    ]);

    application.agents = agents;
    application.commandMenuItems = commandMenuItems;
    application.objects = objects;

    return application;
  }

  async findOneApplicationWithRelationsOrThrow({
    id,
    universalIdentifier,
    workspaceId,
  }: {
    id?: string;
    universalIdentifier?: string;
    workspaceId: string;
  }): Promise<ApplicationEntity> {
    const application = await this.findOneApplicationWithRelations({
      id,
      universalIdentifier,
      workspaceId,
    });

    if (!isDefined(application)) {
      throw new ApplicationException(
        `Application with id ${id} or universalIdentifier ${universalIdentifier} not found`,
        ApplicationExceptionCode.APPLICATION_NOT_FOUND,
      );
    }

    return application;
  }

  async findPrimaryPublicDomainName({
    applicationId,
    workspaceId,
  }: {
    applicationId: string;
    workspaceId: string;
  }): Promise<string | null> {
    const application = await this.applicationRepository.findOne(workspaceId, {
      where: { id: applicationId },
      relations: ['primaryPublicDomain'],
    });

    return application?.primaryPublicDomain?.domain ?? null;
  }

  async findTwentyStandardApplicationOrThrow(workspaceId: string): Promise<{
    application: ApplicationEntity;
    workspace: WorkspaceEntity;
  }> {
    const workspace = await this.workspaceRepository.findOne({
      where: { id: workspaceId },
    });

    if (!isDefined(workspace)) {
      throw new ApplicationException(
        `Could not find workspace ${workspaceId}`,
        ApplicationExceptionCode.APPLICATION_NOT_FOUND,
      );
    }

    const { twentyStandardFlatApplication } =
      await this.findWorkspaceTwentyStandardAndCustomApplicationOrThrow({
        workspace,
      });

    const application = await this.applicationRepository.findOne(workspace.id, {
      where: {
        id: twentyStandardFlatApplication.id,
      },
    });

    if (!isDefined(application)) {
      throw new ApplicationException(
        `Standard application not found for workspace ${workspace.id}`,
        ApplicationExceptionCode.APPLICATION_NOT_FOUND,
      );
    }

    return { application, workspace };
  }

  async createTwentyStandardApplication(
    {
      workspaceId,
      skipCacheInvalidation = false,
    }: {
      workspaceId: string;
      skipCacheInvalidation?: boolean;
    },
    queryRunner?: QueryRunner,
  ) {
    const existingApplication =
      await this.applicationLookupService.findByUniversalIdentifier({
        universalIdentifier: TWENTY_STANDARD_APPLICATION.universalIdentifier,
        workspaceId,
      });

    if (isDefined(existingApplication)) {
      return existingApplication;
    }

    const twentyStandardApplication = await this.create(
      {
        ...TWENTY_STANDARD_APPLICATION,
        workspaceId,
      },
      queryRunner,
    );

    if (!skipCacheInvalidation) {
      await this.workspaceCacheService.invalidateAndRecompute(workspaceId, [
        'flatApplicationMaps',
      ]);
    }

    return twentyStandardApplication;
  }

  async createWorkspaceCustomApplication(
    {
      workspaceId,
      applicationId,
    }: {
      workspaceId: string;
      applicationId: string;
    },
    queryRunner?: QueryRunner,
  ) {
    return this.create(
      {
        description: null,
        name: WORKSPACE_CUSTOM_APPLICATION_NAME,
        version: '1.0.1',
        universalIdentifier: applicationId,
        workspaceId,
        id: applicationId,
      },
      queryRunner,
    );
  }

  private async broadcastApplicationEvent({
    type,
    application,
    updatedFields,
  }: {
    type: 'created' | 'updated' | 'deleted';
    application: ApplicationEntity;
    updatedFields?: string[];
  }): Promise<void> {
    const serializedApplication = serializeApplicationForBroadcast(application);

    try {
      await this.workspaceEventBroadcaster.broadcast({
        workspaceId: application.workspaceId,
        events: [
          {
            type,
            entityName: 'application',
            recordId: application.id,
            properties: {
              ...(isDefined(updatedFields) ? { updatedFields } : {}),
              ...(type === 'deleted'
                ? { before: serializedApplication }
                : { after: serializedApplication }),
            },
          },
        ],
      });
    } catch (error) {
      this.logger.warn(
        `Failed to broadcast ${type} event for application ${application.universalIdentifier} in workspace ${application.workspaceId}`,
        error,
      );
    }
  }

  async create(
    data: Partial<ApplicationEntity> & { workspaceId: string },
    queryRunner?: QueryRunner,
  ): Promise<ApplicationEntity> {
    if (queryRunner) {
      return queryRunner.manager.save(ApplicationEntity, data);
    }

    const savedApplication =
      await this.applicationRepository.insertAndReturnOne(
        data.workspaceId,
        data as QueryDeepPartialEntity<ApplicationEntity>,
      );

    await this.workspaceCacheService.invalidateAndRecompute(data.workspaceId, [
      'flatApplicationMaps',
    ]);

    await this.broadcastApplicationEvent({
      type: 'created',
      application: savedApplication,
    });

    return savedApplication;
  }

  async update(
    id: string,
    data: QueryDeepPartialEntity<ApplicationEntity> & {
      workspaceId: string;
    },
  ): Promise<ApplicationEntity> {
    await this.applicationRepository.update(data.workspaceId, { id }, data);

    await this.workspaceCacheService.invalidateAndRecompute(data.workspaceId, [
      'flatApplicationMaps',
    ]);

    const updatedApplication = await this.applicationRepository.findOne(
      data.workspaceId,
      {
        where: { id },
      },
    );

    if (!isDefined(updatedApplication)) {
      throw new ApplicationException(
        `Application with id ${id} not found after update`,
        ApplicationExceptionCode.APPLICATION_NOT_FOUND,
      );
    }

    await this.broadcastApplicationEvent({
      type: 'updated',
      application: updatedApplication,
      updatedFields: Object.keys(data).filter(
        (field) => field !== 'workspaceId',
      ),
    });

    return updatedApplication;
  }

  async delete(universalIdentifier: string, workspaceId: string) {
    const application =
      await this.applicationLookupService.findByUniversalIdentifier({
        universalIdentifier,
        workspaceId,
      });

    if (!isDefined(application)) {
      throw new ApplicationException(
        `Application with universalIdentifier ${universalIdentifier} not found`,
        ApplicationExceptionCode.APPLICATION_NOT_FOUND,
      );
    }

    const queryRunner = this.coreDataSource.createQueryRunner();

    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      await this.fileStorageService.deleteApplicationFileRows({
        applicationId: application.id,
        workspaceId,
        queryRunner,
      });

      await queryRunner.manager.delete(ApplicationEntity, {
        universalIdentifier,
        workspaceId,
      });

      await queryRunner.commitTransaction();
    } catch (error) {
      if (queryRunner.isTransactionActive) {
        await queryRunner.rollbackTransaction();
        await this.fileStorageService.invalidateStorageStock({
          workspaceId,
          applicationId: application.id,
        });
      }

      throw error;
    } finally {
      await queryRunner.release();
    }

    try {
      await this.fileStorageService.deleteApplicationFilesFromStorage({
        workspaceId,
        applicationUniversalIdentifier: universalIdentifier,
      });
    } catch (error) {
      this.logger.warn(
        `Failed to delete storage folder for application ${universalIdentifier} in workspace ${workspaceId}: ${error instanceof Error ? error.message : String(error)}`,
      );
    }

    await this.workspaceCacheService.invalidateAndRecompute(workspaceId, [
      'flatApplicationMaps',
    ]);

    await this.workspaceCacheService.invalidateAndRecompute(workspaceId, [
      ...ALL_FLAT_ENTITY_MAPS_PROPERTIES,
    ]);

    await this.broadcastApplicationEvent({
      type: 'deleted',
      application,
    });
  }
}
