import { Inject, Injectable, Logger } from '@nestjs/common';

import { QUERY_MAX_RECORDS_FROM_RELATION } from 'twenty-shared/constants';
import { FieldMetadataType, type ObjectRecord } from 'twenty-shared/types';
import { isDefined } from 'twenty-shared/utils';

import { type ObjectRecordFilter } from 'src/engine/api/graphql/workspace-query-builder/interfaces/object-record.interface';

import { QueryResultFieldValue } from 'src/engine/api/graphql/workspace-query-runner/factories/query-result-getters/interfaces/query-result-field-value';

import { DataArgProcessorService } from 'src/engine/api/common/common-args-processors/data-arg-processor/data-arg-processor.service';
import { FilterArgProcessorService } from 'src/engine/api/common/common-args-processors/filter-arg-processor/filter-arg-processor.service';
import { GroupByArgProcessorService } from 'src/engine/api/common/common-args-processors/group-by-arg-processor/group-by-arg-processor.service';
import { OrderByArgProcessorService } from 'src/engine/api/common/common-args-processors/order-by-arg-processor/order-by-arg-processor.service';
import { OrderByWithGroupByArgProcessorService } from 'src/engine/api/common/common-args-processors/order-by-with-group-by-arg-processor/order-by-with-group-by-arg-processor.service';
import { QueryRunnerArgsFactory } from 'src/engine/api/common/common-args-processors/query-runner-args.factory';
import { ProcessNestedRelationsHelper } from 'src/engine/api/common/common-nested-relations-processor/process-nested-relations.helper';
import {
  CommonQueryRunnerException,
  CommonQueryRunnerExceptionCode,
} from 'src/engine/api/common/common-query-runners/errors/common-query-runner.exception';
import { STANDARD_ERROR_MESSAGE } from 'src/engine/api/common/common-query-runners/errors/standard-error-message.constant';
import { buildMutationQueryBuilder } from 'src/engine/api/common/common-query-runners/utils/build-mutation-query-builder.util';
import { computeMaxFieldCountPerRecord } from 'src/engine/api/common/common-query-runners/utils/compute-max-field-count-per-record.util';
import { isRecordFilterEmpty } from 'src/engine/api/common/common-query-runners/utils/is-record-filter-empty.util';
import { CommonResultGettersService } from 'src/engine/api/common/common-result-getters/common-result-getters.service';
import { CommonBaseQueryRunnerContext } from 'src/engine/api/common/types/common-base-query-runner-context.type';
import { CommonExtendedQueryRunnerContext } from 'src/engine/api/common/types/common-extended-query-runner-context.type';
import {
  CommonExtendedInput,
  CommonInput,
  CommonQueryArgs,
  CommonQueryNames,
} from 'src/engine/api/common/types/common-query-args.type';
import {
  CommonQueryExecutionResult,
  CommonQueryResult,
} from 'src/engine/api/common/types/common-query-result.type';
import { CommonSelectedFieldsResult } from 'src/engine/api/common/types/common-selected-fields-result.type';
import { type NestedRelationsReadPathOptions } from 'src/engine/api/common/types/nested-relations-read-path-options.type';
import { GraphqlQueryParser } from 'src/engine/api/graphql/graphql-query-runner/graphql-query-parsers/graphql-query.parser';
import { WorkspacePreQueryHookPayload } from 'src/engine/api/graphql/workspace-query-runner/workspace-query-hook/types/workspace-query-hook.type';
import { WorkspaceQueryHookService } from 'src/engine/api/graphql/workspace-query-runner/workspace-query-hook/workspace-query-hook.service';
import { WorkspaceAuthContext } from 'src/engine/core-modules/auth/types/workspace-auth-context.type';
import { TwentyConfigService } from 'src/engine/core-modules/twenty-config/twenty-config.service';
import { FlatEntityMaps } from 'src/engine/metadata-modules/flat-entity/types/flat-entity-maps.type';
import { findFlatEntityByIdInFlatEntityMaps } from 'src/engine/metadata-modules/flat-entity/utils/find-flat-entity-by-id-in-flat-entity-maps.util';
import { type OrmFlatFieldMetadata } from 'src/engine/metadata-modules/flat-field-metadata/types/orm-flat-field-metadata.type';
import { buildFieldMapsFromFlatObjectMetadata } from 'src/engine/metadata-modules/flat-field-metadata/utils/build-field-maps-from-flat-object-metadata.util';
import { FlatObjectMetadata } from 'src/engine/metadata-modules/flat-object-metadata/types/flat-object-metadata.type';
import { RelationNestedQueries } from 'src/engine/twenty-orm/field-operations/relation-nested-queries/relation-nested-queries';
import { type WorkspaceRepository } from 'src/engine/twenty-orm/repository/workspace-repository';
import { type MutationKind } from 'src/engine/twenty-orm/sql/utils/build-mutation-statement.util';
import { getWorkspaceContext } from 'src/engine/twenty-orm/storage/orm-workspace-context.storage';
import { resolveRolePermissionConfig } from 'src/engine/twenty-orm/utils/resolve-role-permission-config.util';
import { WorkspaceOrmManager } from 'src/engine/twenty-orm/workspace-orm.manager';
import { WorkspaceCacheService } from 'src/engine/workspace-cache/services/workspace-cache.service';

@Injectable()
export abstract class CommonBaseQueryRunnerService<
  Args extends CommonQueryArgs,
  Output extends CommonQueryResult,
> {
  private readonly logger = new Logger(CommonBaseQueryRunnerService.name);

  @Inject()
  protected readonly workspaceQueryHookService: WorkspaceQueryHookService;
  @Inject()
  protected readonly queryRunnerArgsFactory: QueryRunnerArgsFactory;
  @Inject()
  protected readonly dataArgProcessor: DataArgProcessorService;
  @Inject()
  protected readonly filterArgProcessor: FilterArgProcessorService;
  @Inject()
  protected readonly groupByArgProcessor: GroupByArgProcessorService;
  @Inject()
  protected readonly orderByArgProcessor: OrderByArgProcessorService;
  @Inject()
  protected readonly orderByWithGroupByArgProcessor: OrderByWithGroupByArgProcessorService;
  @Inject()
  protected readonly workspaceOrmManager: WorkspaceOrmManager;
  @Inject()
  protected readonly processNestedRelationsHelper: ProcessNestedRelationsHelper;
  @Inject()
  protected readonly workspaceCacheService: WorkspaceCacheService;
  @Inject()
  protected readonly commonResultGettersService: CommonResultGettersService;
  @Inject()
  protected readonly twentyConfigService: TwentyConfigService;

  protected abstract readonly operationName: CommonQueryNames;

  protected readonly isReadOnly: boolean = false;

  public async execute(
    args: CommonInput<Args>,
    queryRunnerContext: CommonBaseQueryRunnerContext,
  ): Promise<CommonQueryExecutionResult<Output, Args>> {
    const {
      authContext,
      flatObjectMetadata,
      flatObjectMetadataMaps,
      flatFieldMetadataMaps,
    } = queryRunnerContext;

    await this.validate(args, queryRunnerContext);

    const commonQueryParser = new GraphqlQueryParser(
      flatObjectMetadata,
      flatObjectMetadataMaps,
      flatFieldMetadataMaps,
    );

    const selectedFieldsResult = commonQueryParser.parseSelectedFields(
      args.selectedFields,
    );

    const processedArgs = {
      ...(await this.processArgs(args, queryRunnerContext, this.operationName)),
      selectedFieldsResult,
    } as CommonExtendedInput<Args>;

    this.validateQueryComplexity(
      selectedFieldsResult,
      processedArgs,
      queryRunnerContext,
    );

    const results = await this.workspaceOrmManager.executeInWorkspaceContext(
      async () =>
        this.executeQueryAndEnrichResults(
          processedArgs,
          queryRunnerContext,
          commonQueryParser,
        ),
      authContext,
    );

    return {
      results,
      args: processedArgs,
    };
  }

  protected abstract run(
    args: CommonExtendedInput<Args>,
    queryRunnerContext: CommonExtendedQueryRunnerContext,
  ): Promise<Output>;

  protected abstract validate(
    args: CommonInput<Args>,
    queryRunnerContext: CommonBaseQueryRunnerContext,
  ): Promise<void>;

  protected abstract computeArgs(
    args: CommonInput<Args>,
    queryRunnerContext: CommonBaseQueryRunnerContext,
  ): Promise<CommonInput<Args>>;

  protected abstract processQueryResult(
    queryResult: Output,
    flatObjectMetadata: FlatObjectMetadata,
    flatObjectMetadataMaps: FlatEntityMaps<FlatObjectMetadata>,
    flatFieldMetadataMaps: FlatEntityMaps<OrmFlatFieldMetadata>,
    authContext: WorkspaceAuthContext,
  ): Promise<Output>;

  protected computeQueryComplexity(
    selectedFieldsResult: CommonSelectedFieldsResult,
    _args: CommonExtendedInput<Args>,
    _queryRunnerContext: CommonBaseQueryRunnerContext,
  ): number {
    const simpleFieldsComplexity = 1;
    const selectedFieldsComplexity =
      simpleFieldsComplexity + (selectedFieldsResult.relationFieldsCount ?? 0);

    return selectedFieldsComplexity;
  }

  protected computeQueryComplexityV2(
    selectedFieldsResult: CommonSelectedFieldsResult,
    _args: CommonExtendedInput<Args>,
    queryRunnerContext: CommonBaseQueryRunnerContext,
  ): number {
    const {
      flatObjectMetadata,
      flatObjectMetadataMaps,
      flatFieldMetadataMaps,
    } = queryRunnerContext;

    return computeMaxFieldCountPerRecord({
      selectedFieldsResult,
      flatObjectMetadata,
      flatObjectMetadataMaps,
      flatFieldMetadataMaps,
      recordLimitPerOneToManyRelation: QUERY_MAX_RECORDS_FROM_RELATION,
    });
  }

  private async processArgs(
    args: CommonInput<Args>,
    queryRunnerContext: CommonBaseQueryRunnerContext,
    operationName: CommonQueryNames,
  ): Promise<CommonInput<Args>> {
    const { authContext, flatObjectMetadata } = queryRunnerContext;

    const computedArgs = await this.computeArgs(args, queryRunnerContext);

    const hookedArgs =
      (await this.workspaceQueryHookService.executePreQueryHooks(
        authContext,
        flatObjectMetadata.nameSingular,
        operationName,
        computedArgs as WorkspacePreQueryHookPayload<CommonQueryNames>,
      )) as CommonInput<Args>;

    return hookedArgs;
  }

  private async executeQueryAndEnrichResults(
    processedArgs: CommonExtendedInput<Args>,
    queryRunnerContext: CommonBaseQueryRunnerContext,
    commonQueryParser: GraphqlQueryParser,
  ): Promise<Output> {
    const extendedQueryRunnerContext =
      await this.prepareExtendedQueryRunnerContextWithGlobalDatasource(
        queryRunnerContext,
      );

    const results = await this.run(processedArgs, {
      ...extendedQueryRunnerContext,
      commonQueryParser,
    });

    return this.enrichResultsWithGettersAndHooks({
      results,
      operationName: this.operationName,
      authContext: extendedQueryRunnerContext.authContext,
      flatObjectMetadata: queryRunnerContext.flatObjectMetadata,
      flatObjectMetadataMaps: queryRunnerContext.flatObjectMetadataMaps,
      flatFieldMetadataMaps: queryRunnerContext.flatFieldMetadataMaps,
      transactionScope: queryRunnerContext.transactionScope,
    });
  }

  private async enrichResultsWithGettersAndHooks({
    results,
    operationName,
    authContext,
    flatObjectMetadata,
    flatObjectMetadataMaps,
    flatFieldMetadataMaps,
    transactionScope,
  }: {
    results: Output;
    operationName: CommonQueryNames;
    authContext: WorkspaceAuthContext;
    flatObjectMetadata: FlatObjectMetadata;
    flatObjectMetadataMaps: FlatEntityMaps<FlatObjectMetadata>;
    flatFieldMetadataMaps: FlatEntityMaps<OrmFlatFieldMetadata>;
    transactionScope: CommonBaseQueryRunnerContext['transactionScope'];
  }): Promise<Output> {
    const resultWithGetters = await this.processQueryResult(
      results,
      flatObjectMetadata,
      flatObjectMetadataMaps,
      flatFieldMetadataMaps,
      authContext,
    );

    const executePostQueryHooks = () =>
      this.workspaceQueryHookService.executePostQueryHooks(
        authContext,
        flatObjectMetadata.nameSingular,
        operationName,
        resultWithGetters as QueryResultFieldValue,
      );

    if (isDefined(transactionScope)) {
      transactionScope.afterCommit(executePostQueryHooks);
    } else {
      await executePostQueryHooks();
    }

    return resultWithGetters as Output;
  }

  private async prepareExtendedQueryRunnerContextWithGlobalDatasource(
    queryRunnerContext: CommonBaseQueryRunnerContext,
  ): Promise<Omit<CommonExtendedQueryRunnerContext, 'commonQueryParser'>> {
    const context = getWorkspaceContext();

    const rolePermissionConfig =
      queryRunnerContext.rolePermissionConfig ??
      resolveRolePermissionConfig({
        authContext: context.authContext,
        userWorkspaceRoleMap: context.userWorkspaceRoleMap,
        apiKeyRoleMap: context.apiKeyRoleMap,
      });

    if (!rolePermissionConfig) {
      throw new CommonQueryRunnerException(
        'Invalid auth context',
        CommonQueryRunnerExceptionCode.INVALID_AUTH_CONTEXT,
        { userFriendlyMessage: STANDARD_ERROR_MESSAGE },
      );
    }

    const repository = isDefined(queryRunnerContext.transactionScope)
      ? queryRunnerContext.transactionScope.getRepository<ObjectRecord>(
          queryRunnerContext.flatObjectMetadata.nameSingular,
          rolePermissionConfig,
        )
      : this.workspaceOrmManager.getRepository<ObjectRecord>(
          queryRunnerContext.flatObjectMetadata.nameSingular,
          rolePermissionConfig,
          { useReplica: this.isReadOnly },
        );

    return {
      ...queryRunnerContext,
      authContext: context.authContext,
      rolePermissionConfig,
      repository,
      featureFlagsMap: context.featureFlagsMap,
    };
  }

  // The repository already uses the replica only on read-only runners, so root reads and nested-relation loading agree
  protected getReadRepository({
    repository,
  }: Pick<
    CommonExtendedQueryRunnerContext,
    'repository'
  >): WorkspaceRepository {
    return repository;
  }

  protected getWriteRepository({
    repository,
  }: Pick<
    CommonExtendedQueryRunnerContext,
    'repository'
  >): WorkspaceRepository {
    return repository;
  }

  protected async runFilteredMutation({
    queryRunnerContext,
    filter,
    columnsToReturn,
    kind,
    data,
  }: {
    queryRunnerContext: CommonExtendedQueryRunnerContext;
    filter: Partial<ObjectRecordFilter>;
    columnsToReturn: string[];
    kind: MutationKind;
    data?: Partial<ObjectRecord>;
  }): Promise<ObjectRecord[]> {
    const { flatObjectMetadata, commonQueryParser } = queryRunnerContext;
    const alias = flatObjectMetadata.nameSingular;

    if (isRecordFilterEmpty(filter)) {
      throw new CommonQueryRunnerException(
        'A non-empty filter is required for a bulk mutation',
        CommonQueryRunnerExceptionCode.INVALID_ARGS_FILTER,
        { userFriendlyMessage: STANDARD_ERROR_MESSAGE },
      );
    }

    const writeRepository = this.getWriteRepository(queryRunnerContext);

    const resolvedData =
      kind === 'update' && isDefined(data)
        ? (
            await this.resolveNestedRelations({
              records: [data],
              queryRunnerContext,
              writeRepository,
            })
          )[0]
        : data;

    const { selectQueryBuilder, rowLevelPermissionsApplied } =
      buildMutationQueryBuilder({
        repository: writeRepository,
        alias,
        filter,
        commonQueryParser,
        kind,
      });

    return writeRepository.runMutation({
      selectQueryBuilder,
      rowLevelPermissionsApplied,
      kind,
      columnsToReturn,
      data: resolvedData,
    });
  }

  protected async resolveNestedRelations({
    records,
    queryRunnerContext,
    writeRepository,
    createRecords,
  }: {
    records: Partial<ObjectRecord>[];
    queryRunnerContext: CommonExtendedQueryRunnerContext;
    writeRepository: WorkspaceRepository;
    createRecords?: (options: {
      targetObjectMetadata: FlatObjectMetadata;
      records: Partial<ObjectRecord>[];
    }) => Promise<ObjectRecord[]>;
  }): Promise<Partial<ObjectRecord>[]> {
    const { flatObjectMetadata, flatFieldMetadataMaps } = queryRunnerContext;
    const nameSingular = flatObjectMetadata.nameSingular;

    const relationNestedQueries = new RelationNestedQueries(writeRepository);

    const relationNestedConfig =
      relationNestedQueries.prepareNestedRelationQueries(records, nameSingular);

    if (!isDefined(relationNestedConfig)) {
      return records;
    }

    const resolvedRecords =
      await relationNestedQueries.processRelationNestedQueries({
        entities: records,
        relationNestedConfig,
        target: nameSingular,
        createRecords,
      });

    const { fieldIdByName } = buildFieldMapsFromFlatObjectMetadata(
      flatFieldMetadataMaps,
      flatObjectMetadata,
    );

    return resolvedRecords.map((record) => {
      const columnKeyedRecord: Partial<ObjectRecord> = {};

      for (const [fieldName, value] of Object.entries(record)) {
        const fieldMetadata = findFlatEntityByIdInFlatEntityMaps({
          flatEntityId: fieldIdByName[fieldName],
          flatEntityMaps: flatFieldMetadataMaps,
        });

        if (
          isDefined(fieldMetadata) &&
          (fieldMetadata.type === FieldMetadataType.RELATION ||
            fieldMetadata.type === FieldMetadataType.MORPH_RELATION)
        ) {
          continue;
        }

        columnKeyedRecord[fieldName] = value;
      }

      return columnKeyedRecord;
    });
  }

  protected getNestedRelationsReadPathOptions(): NestedRelationsReadPathOptions {
    return {
      useReplica: this.isReadOnly,
    };
  }

  private validateQueryComplexity(
    selectedFieldsResult: CommonSelectedFieldsResult,
    args: CommonExtendedInput<Args>,
    queryRunnerContext: CommonBaseQueryRunnerContext,
  ): void {
    const maximumComplexity = this.twentyConfigService.get(
      'COMMON_QUERY_COMPLEXITY_LIMIT',
    );

    if (selectedFieldsResult.hasAtLeastTwoNestedOneToManyRelations) {
      throw new CommonQueryRunnerException(
        `Query complexity is too high. One-to-Many relation cannot be nested in another One-to-Many relation.`,
        CommonQueryRunnerExceptionCode.TOO_COMPLEX_QUERY,
        {
          userFriendlyMessage: STANDARD_ERROR_MESSAGE,
        },
      );
    }

    const queryComplexity = this.computeQueryComplexity(
      selectedFieldsResult,
      args,
      queryRunnerContext,
    );

    if (queryComplexity > maximumComplexity) {
      throw new CommonQueryRunnerException(
        `Query complexity is too high. Please, reduce the amount of relation fields requested. Query complexity: ${queryComplexity}. Maximum complexity: ${maximumComplexity}.`,
        CommonQueryRunnerExceptionCode.TOO_COMPLEX_QUERY,
        {
          userFriendlyMessage: STANDARD_ERROR_MESSAGE,
        },
      );
    }
  }
}
