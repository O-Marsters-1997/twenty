import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';

import { type TranslatableMetadataName } from 'twenty-shared/i18n';
import { type APP_LOCALES, SOURCE_LOCALE } from 'twenty-shared/translations';
import { isDefined } from 'twenty-shared/utils';
import { Repository } from 'typeorm';

import {
  ApplicationException,
  ApplicationExceptionCode,
} from 'src/engine/core-modules/application/application.exception';
import { type FlatApplicationCacheMaps } from 'src/engine/core-modules/application/types/flat-application-cache-maps.type';
import { I18nService } from 'src/engine/core-modules/i18n/i18n.service';
import { WorkspaceEntity } from 'src/engine/core-modules/workspace/workspace.entity';
import { type IDataloaders } from 'src/engine/dataloaders/dataloader.interface';
import { type ApplicationAuthorIdentifiers } from 'src/engine/metadata-modules/application-translation-catalog/types/application-author-identifiers.type';
import { resolveTranslatableProperties } from 'src/engine/metadata-modules/application-translation-catalog/utils/resolve-translatable-properties.util';
import { WorkspaceManyOrAllFlatEntityMapsCacheService } from 'src/engine/metadata-modules/flat-entity/services/workspace-many-or-all-flat-entity-maps-cache.service';
import { type EffectiveEntityI18nContext } from 'src/engine/metadata-modules/overrides/types/effective-entity-i18n-context.type';
import { getTwentyStandardApplicationIdOrThrow } from 'src/engine/metadata-modules/utils/get-twenty-standard-application-id-or-throw.util';
import { getWorkspaceCustomApplicationUniversalIdentifierOrThrow } from 'src/engine/metadata-modules/overrides/utils/get-workspace-custom-application-universal-identifier-or-throw.util';

@Injectable()
export class ApplicationTranslationCatalogService {
  constructor(
    @InjectRepository(WorkspaceEntity)
    private readonly workspaceRepository: Repository<WorkspaceEntity>,
    private readonly flatEntityMapsCacheService: WorkspaceManyOrAllFlatEntityMapsCacheService,
    private readonly i18nService: I18nService,
  ) {}

  async getApplicationAuthorIdentifiers({
    workspaceId,
    workspaceCustomApplicationId,
  }: {
    workspaceId: string;
    workspaceCustomApplicationId?: string;
  }): Promise<ApplicationAuthorIdentifiers> {
    const [flatApplicationMaps, resolvedWorkspaceCustomApplicationId] =
      await Promise.all([
        this.getFlatApplicationMaps({ workspaceId }),
        isDefined(workspaceCustomApplicationId)
          ? workspaceCustomApplicationId
          : this.findWorkspaceCustomApplicationIdOrThrow(workspaceId),
      ]);

    return {
      standardApplicationId:
        getTwentyStandardApplicationIdOrThrow(flatApplicationMaps),
      workspaceCustomApplicationUniversalIdentifier:
        getWorkspaceCustomApplicationUniversalIdentifierOrThrow({
          workspaceCustomApplicationId: resolvedWorkspaceCustomApplicationId,
          flatApplicationMaps,
        }),
      universalIdentifierByApplicationId: Object.fromEntries(
        Object.values(flatApplicationMaps.byId)
          .filter(isDefined)
          .map((flatApplication) => [
            flatApplication.id,
            flatApplication.universalIdentifier,
          ]),
      ),
    };
  }

  // GraphQL passes dataloaders to coalesce per-entity ResolveFields; REST resolves a page at once and passes none
  async buildEffectiveEntityI18nContext({
    applicationId,
    loaders,
    locale,
    workspaceId,
  }: {
    applicationId: string | undefined;
    loaders?: IDataloaders;
    locale: keyof typeof APP_LOCALES | undefined;
    workspaceId: string;
  }): Promise<EffectiveEntityI18nContext> {
    if (!isDefined(loaders)) {
      const getI18nContext = await this.getI18nContextByApplicationId({
        locale,
        workspaceId,
      });

      return getI18nContext(applicationId);
    }

    const getI18nContext = this.toI18nContextResolver({
      applicationAuthorIdentifiers:
        await loaders.applicationAuthorIdentifiersLoader.load({
          workspaceId,
        }),
      locale,
    });

    return getI18nContext(applicationId);
  }

  async getI18nContextByApplicationId({
    locale,
    workspaceId,
  }: {
    locale: keyof typeof APP_LOCALES | undefined;
    workspaceId: string;
  }): Promise<
    (applicationId: string | undefined) => EffectiveEntityI18nContext
  > {
    return this.toI18nContextResolver({
      applicationAuthorIdentifiers: await this.getApplicationAuthorIdentifiers({
        workspaceId,
      }),
      locale,
    });
  }

  private toI18nContextResolver({
    applicationAuthorIdentifiers: {
      standardApplicationId,
      workspaceCustomApplicationUniversalIdentifier,
      universalIdentifierByApplicationId,
    },
    locale,
  }: {
    applicationAuthorIdentifiers: ApplicationAuthorIdentifiers;
    locale: keyof typeof APP_LOCALES | undefined;
  }): (applicationId: string | undefined) => EffectiveEntityI18nContext {
    const i18nInstance = this.i18nService.getI18nInstance(
      locale ?? SOURCE_LOCALE,
    );

    return (applicationId) => ({
      locale,
      i18nInstance,
      isStandardApp: applicationId === standardApplicationId,
      applicationCatalog: undefined,
      workspaceCustomApplicationUniversalIdentifier,
      ownerApplicationUniversalIdentifier: isDefined(applicationId)
        ? universalIdentifierByApplicationId[applicationId]
        : undefined,
    });
  }

  async resolveTranslatablePropertiesForEntities<
    TEntity extends { applicationId?: string | null },
  >({
    metadataName,
    entities,
    locale,
    workspaceId,
  }: {
    metadataName: TranslatableMetadataName;
    entities: TEntity[];
    locale: keyof typeof APP_LOCALES | undefined;
    workspaceId: string;
  }): Promise<TEntity[]> {
    const getI18nContext = await this.getI18nContextByApplicationId({
      applicationIds: entities.map(
        (entity) => entity.applicationId ?? undefined,
      ),
      locale,
      workspaceId,
    });

    return entities.map((entity) => ({
      ...entity,
      ...resolveTranslatableProperties({
        metadataName,
        entity,
        i18nContext: getI18nContext(entity.applicationId ?? undefined),
      }),
    }));
  }

  private async findWorkspaceCustomApplicationIdOrThrow(
    workspaceId: string,
  ): Promise<string> {
    const workspace = await this.workspaceRepository.findOne({
      select: ['id', 'workspaceCustomApplicationId'],
      where: { id: workspaceId },
      withDeleted: true,
    });

    if (!isDefined(workspace)) {
      throw new ApplicationException(
        `Could not find workspace ${workspaceId}`,
        ApplicationExceptionCode.APPLICATION_NOT_FOUND,
      );
    }

    return workspace.workspaceCustomApplicationId;
  }

  private async getFlatApplicationMaps({
    workspaceId,
  }: {
    workspaceId: string;
  }): Promise<FlatApplicationCacheMaps> {
    const { flatApplicationMaps } =
      await this.flatEntityMapsCacheService.getOrRecomputeManyOrAllFlatEntityMaps(
        {
          workspaceId,
          flatMapsKeys: ['flatApplicationMaps'],
        },
      );

    return flatApplicationMaps;
  }
}
