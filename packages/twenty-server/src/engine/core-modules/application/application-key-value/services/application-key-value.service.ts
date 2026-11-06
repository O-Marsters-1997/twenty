import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';

import { msg } from '@lingui/core/macro';
import { IsNull, Repository } from 'typeorm';

import { type AppKeyValue } from 'twenty-shared/application';
import { isDefined } from 'twenty-shared/utils';

import { AppKeyValueScope } from 'src/engine/core-modules/application/application-key-value/enums/app-key-value-scope.enum';
import {
  ApplicationException,
  ApplicationExceptionCode,
} from 'src/engine/core-modules/application/application.exception';
import { type FlatApplication } from 'src/engine/core-modules/application/types/flat-application.type';
import {
  KeyValuePairEntity,
  KeyValuePairType,
} from 'src/engine/core-modules/key-value-pair/key-value-pair.entity';

@Injectable()
export class ApplicationKeyValueService {
  constructor(
    @InjectRepository(KeyValuePairEntity)
    private readonly keyValuePairRepository: Repository<KeyValuePairEntity>,
  ) {}

  async get({
    application,
    workspaceId,
    key,
    scope,
  }: {
    application: FlatApplication;
    workspaceId: string;
    key: string;
    scope: AppKeyValueScope;
  }): Promise<AppKeyValue | null> {
    const scopedWhere =
      scope === AppKeyValueScope.SERVER
        ? {
            applicationId: application.id,
            workspaceId: IsNull(),
          }
        : {
            applicationId: application.id,
            workspaceId,
          };

    const entry = await this.keyValuePairRepository.findOne({
      where: {
        key,
        type: KeyValuePairType.APPLICATION_VARIABLE,
        ...scopedWhere,
      },
    });

    if (!isDefined(entry)) {
      return null;
    }

    return { key, value: entry.value, scope };
  }

  async set({
    application,
    workspaceId,
    key,
    value,
    scope,
  }: {
    application: FlatApplication;
    workspaceId: string;
    key: string;
    value: unknown;
    scope: AppKeyValueScope;
  }): Promise<AppKeyValue> {
    if (scope === AppKeyValueScope.SERVER) {
      return this.claimServerKey({ application, workspaceId, key });
    }

    await this.keyValuePairRepository.upsert(
      {
        key,
        value: value as KeyValuePairEntity['value'],
        applicationId: application.id,
        workspaceId,
        userId: null,
        type: KeyValuePairType.APPLICATION_VARIABLE,
      },
      {
        conflictPaths: ['key', 'applicationId'],
        indexPredicate:
          '"applicationId" IS NOT NULL AND "workspaceId" IS NOT NULL',
      },
    );

    return { key, value, scope };
  }

  async delete({
    application,
    workspaceId,
    key,
    scope,
  }: {
    application: FlatApplication;
    workspaceId: string;
    key: string;
    scope: AppKeyValueScope;
  }): Promise<boolean> {
    if (scope === AppKeyValueScope.SERVER) {
      const result = await this.keyValuePairRepository
        .createQueryBuilder()
        .delete()
        .where('"key" = :key', { key })
        .andWhere('"applicationId" = :applicationId', {
          applicationId: application.id,
        })
        .andWhere('"workspaceId" IS NULL')
        .andWhere('"type" = :type', {
          type: KeyValuePairType.APPLICATION_VARIABLE,
        })
        .andWhere('"value" = :value::jsonb', {
          value: JSON.stringify(workspaceId),
        })
        .execute();

      return (result.affected ?? 0) > 0;
    }

    const result = await this.keyValuePairRepository.delete({
      key,
      applicationId: application.id,
      workspaceId,
      type: KeyValuePairType.APPLICATION_VARIABLE,
    });

    return (result.affected ?? 0) > 0;
  }

  // SERVER keys are a claim registry: the stored value is always the caller's
  // token-derived workspaceId, so any value passed by the caller is ignored.
  private async claimServerKey({
    application,
    workspaceId,
    key,
  }: {
    application: FlatApplication;
    workspaceId: string;
    key: string;
  }): Promise<AppKeyValue> {
    const serverApplicationId = application.id;
    const claimValue: unknown = workspaceId;

    await this.keyValuePairRepository
      .createQueryBuilder()
      .insert()
      .into(KeyValuePairEntity)
      .values({
        key,
        value: claimValue as KeyValuePairEntity['value'],
        applicationId: serverApplicationId,
        workspaceId: null,
        userId: null,
        type: KeyValuePairType.APPLICATION_VARIABLE,
      })
      .orIgnore()
      .execute();

    const entry = await this.keyValuePairRepository.findOne({
      where: {
        key,
        applicationId: serverApplicationId,
        workspaceId: IsNull(),
        type: KeyValuePairType.APPLICATION_VARIABLE,
      },
    });

    if (!isDefined(entry)) {
      throw new ApplicationException(
        `Could not persist server key "${key}"`,
        ApplicationExceptionCode.KEY_VALUE_PERSISTENCE_FAILED,
      );
    }

    const claimedWorkspaceId: unknown = entry.value;

    if (claimedWorkspaceId !== workspaceId) {
      throw new ApplicationException(
        `Server key "${key}" is already claimed by another workspace`,
        ApplicationExceptionCode.FORBIDDEN,
        {
          userFriendlyMessage: msg`This server key is already claimed by another workspace.`,
        },
      );
    }

    return { key, value: entry.value, scope: AppKeyValueScope.SERVER };
  }
}
