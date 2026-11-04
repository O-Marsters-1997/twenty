import {
  type CanActivate,
  type ExecutionContext,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';

import { type AllMetadataName } from 'twenty-shared/metadata';
import { assertUnreachable, isDefined } from 'twenty-shared/utils';

import {
  ApplicationException,
  ApplicationExceptionCode,
} from 'src/engine/core-modules/application/application.exception';
import { APPLICATION_TARGET_METADATA_KEY } from 'src/engine/core-modules/application/constants/application-target-metadata-key.constant';
import { type ApplicationTarget } from 'src/engine/core-modules/application/types/application-target.type';
import { type FlatApplication } from 'src/engine/core-modules/application/types/flat-application.type';
import { readApplicationTargetIdOrThrow } from 'src/engine/core-modules/application/utils/read-application-target-id-or-throw.util';
import { WorkspaceManyOrAllFlatEntityMapsCacheService } from 'src/engine/metadata-modules/flat-entity/services/workspace-many-or-all-flat-entity-maps-cache.service';
import { type FlatEntityMaps } from 'src/engine/metadata-modules/flat-entity/types/flat-entity-maps.type';
import { type SyncableFlatEntity } from 'src/engine/metadata-modules/flat-entity/types/flat-entity-from.type';
import { findFlatEntityByIdInFlatEntityMaps } from 'src/engine/metadata-modules/flat-entity/utils/find-flat-entity-by-id-in-flat-entity-maps.util';
import { getMetadataFlatEntityMapsKey } from 'src/engine/metadata-modules/flat-entity/utils/get-metadata-flat-entity-maps-key.util';
import { getRequest } from 'src/utils/extract-request';

@Injectable()
export class ApplicationTargetGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly flatEntityMapsCacheService: WorkspaceManyOrAllFlatEntityMapsCacheService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const target = this.reflector.get<ApplicationTarget | undefined>(
      APPLICATION_TARGET_METADATA_KEY,
      context.getHandler(),
    );

    if (!isDefined(target)) {
      return true;
    }

    const request = getRequest(context);
    const callingApplication: FlatApplication | undefined =
      request?.application;

    if (!isDefined(callingApplication)) {
      return true;
    }

    const targetId = readApplicationTargetIdOrThrow({
      context,
      request,
      target,
    });

    await this.assertReachableByApplicationOrThrow({
      target,
      targetId,
      callingApplication,
      workspaceId: request.workspace.id,
    });

    return true;
  }

  private async assertReachableByApplicationOrThrow({
    target,
    targetId,
    callingApplication,
    workspaceId,
  }: {
    target: ApplicationTarget;
    targetId: string;
    callingApplication: FlatApplication;
    workspaceId: string;
  }): Promise<void> {
    switch (target.kind) {
      case 'applicationId':
        return this.assertOwnTargetOrThrow(
          targetId === callingApplication.id,
          'An application token can only target its own application',
        );
      case 'applicationUniversalIdentifier':
        return this.assertOwnTargetOrThrow(
          targetId === callingApplication.universalIdentifier,
          'An application token can only target its own application',
        );
      case 'applicationOwnedEntity': {
        const flatEntity = await this.findFlatEntity({
          metadataName: target.metadataName,
          entityId: targetId,
          workspaceId,
        });

        return this.assertOwnTargetOrThrow(
          !isDefined(flatEntity) ||
            flatEntity.applicationId === callingApplication.id,
          'An application token can only reach its own application',
        );
      }
      default:
        return assertUnreachable(target);
    }
  }

  private assertOwnTargetOrThrow(isOwnTarget: boolean, message: string): void {
    if (!isOwnTarget) {
      throw new ApplicationException(
        message,
        ApplicationExceptionCode.FORBIDDEN,
      );
    }
  }

  private async findFlatEntity({
    metadataName,
    entityId,
    workspaceId,
  }: {
    metadataName: AllMetadataName;
    entityId: string;
    workspaceId: string;
  }): Promise<SyncableFlatEntity | undefined> {
    const flatMapsKey = getMetadataFlatEntityMapsKey(metadataName);

    const flatEntityMapsByKey =
      await this.flatEntityMapsCacheService.getOrRecomputeManyOrAllFlatEntityMaps(
        { workspaceId, flatMapsKeys: [flatMapsKey] },
      );

    const flatEntityMaps: FlatEntityMaps<SyncableFlatEntity> =
      flatEntityMapsByKey[flatMapsKey];

    return findFlatEntityByIdInFlatEntityMaps({
      flatEntityId: entityId,
      flatEntityMaps,
    });
  }
}
