import { Module } from '@nestjs/common';
import { APP_FILTER } from '@nestjs/core';
import { EventEmitter2, EventEmitterModule } from '@nestjs/event-emitter';

import { WorkspaceResolverNameMapCacheModule } from 'src/engine/api/graphql/direct-execution/workspace-resolver-name-map-cache.module';
import { WorkspaceQueryRunnerModule } from 'src/engine/api/graphql/workspace-query-runner/workspace-query-runner.module';
import { ActorModule } from 'src/engine/core-modules/actor/actor.module';
import { ApiKeyModule } from 'src/engine/core-modules/api-key/api-key.module';
import { ApplicationModule } from 'src/engine/core-modules/application/application.module';
import { ApprovedAccessDomainModule } from 'src/engine/core-modules/approved-access-domain/approved-access-domain.module';
import { AuthModule } from 'src/engine/core-modules/auth/auth.module';
import { PermissionsGraphqlApiExceptionFilter } from 'src/engine/metadata-modules/permissions/utils/permissions-graphql-api-exception.filter';
import { CacheStorageModule } from 'src/engine/core-modules/cache-storage/cache-storage.module';
import { TimelineCalendarEventModule } from 'src/engine/core-modules/calendar/timeline-calendar-event.module';
import { CaptchaModule } from 'src/engine/core-modules/captcha/captcha.module';
import { DpaModule } from 'src/engine/core-modules/dpa/dpa.module';
import { EmailModule } from 'src/engine/core-modules/email/email.module';
import { EmailingDomainModule } from 'src/engine/core-modules/emailing-domain/emailing-domain.module';
import { EnvironmentModule } from 'src/engine/core-modules/environment/environment.module';
import { ExceptionHandlerModule } from 'src/engine/core-modules/exception-handler/exception-handler.module';
import { FeatureFlagModule } from 'src/engine/core-modules/feature-flag/feature-flag.module';
import { FileStorageModule } from 'src/engine/core-modules/file-storage/file-storage.module';
import { GeoMapModule } from 'src/engine/core-modules/geo-map/geo-map-module';
import { HealthModule } from 'src/engine/core-modules/health/health.module';
import { I18nModule } from 'src/engine/core-modules/i18n/i18n.module';
import { LabModule } from 'src/engine/core-modules/lab/lab.module';
import { LoggerModule } from 'src/engine/core-modules/logger/logger.module';
import { loggerModuleFactory } from 'src/engine/core-modules/logger/logger.module-factory';
import { MessageQueueModule } from 'src/engine/core-modules/message-queue/message-queue.module';
import { messageQueueModuleFactory } from 'src/engine/core-modules/message-queue/message-queue.module-factory';
import { TimelineMessagingModule } from 'src/engine/core-modules/messaging/timeline-messaging.module';
import { OpenApiModule } from 'src/engine/core-modules/open-api/open-api.module';
import { RedisClientModule } from 'src/engine/core-modules/redis-client/redis-client.module';
import { RedisClientService } from 'src/engine/core-modules/redis-client/redis-client.service';
import { SearchModule } from 'src/engine/core-modules/search/search.module';
import { WellKnownModule } from 'src/engine/core-modules/well-known/well-known.module';
import { TwentyConfigModule } from 'src/engine/core-modules/twenty-config/twenty-config.module';
import { TwentyConfigService } from 'src/engine/core-modules/twenty-config/twenty-config.service';
import { UserModule } from 'src/engine/core-modules/user/user.module';
import { WorkflowApiModule } from 'src/engine/core-modules/workflow/workflow-api.module';
import { WorkspaceInvitationModule } from 'src/engine/core-modules/workspace-invitation/workspace-invitation.module';
import { WorkspaceModule } from 'src/engine/core-modules/workspace/workspace.module';
import { AiModelsModule } from 'src/engine/metadata-modules/ai/ai-models/ai-models.module';
import { PageLayoutModule } from 'src/engine/metadata-modules/page-layout/page-layout.module';
import { RoleModule } from 'src/engine/metadata-modules/role/role.module';
import { RowLevelPermissionModule } from 'src/engine/metadata-modules/row-level-permission-predicate/row-level-permission.module';
import { RecordShareModule } from 'src/engine/core-modules/record-share/record-share.module';
import { SubscriptionsModule } from 'src/engine/subscriptions/subscriptions.module';
import { TrashCleanupModule } from 'src/engine/trash-cleanup/trash-cleanup.module';
import { WorkspaceEventEmitterModule } from 'src/engine/workspace-event-emitter/workspace-event-emitter.module';
import { AiToolCallAnswerModule } from 'src/engine/metadata-modules/ai/ai-tool-call-answer/ai-tool-call-answer.module';
import { ClientConfigModule } from './client-config/client-config.module';
import { EventLogsViewerModule } from './event-logs/event-logs-viewer.module';
import { FileApiModule } from './file/file-api.module';

@Module({
  imports: [
    EnvironmentModule,
    TwentyConfigModule.forRoot(),
    HealthModule,
    AuthModule,
    ClientConfigModule,
    FeatureFlagModule,
    FileApiModule,
    RecordShareModule,
    RowLevelPermissionModule,
    OpenApiModule,
    WellKnownModule,
    ApplicationModule,
    TimelineMessagingModule,
    TimelineCalendarEventModule,
    UserModule,
    WorkspaceModule,
    WorkspaceInvitationModule,
    ApprovedAccessDomainModule,
    EmailingDomainModule,
    WorkflowApiModule,
    AiToolCallAnswerModule,
    WorkspaceEventEmitterModule,
    ActorModule,
    LabModule,
    RoleModule,
    RedisClientModule,
    WorkspaceQueryRunnerModule,
    WorkspaceResolverNameMapCacheModule,
    GeoMapModule,
    SubscriptionsModule,
    FileStorageModule.forRoot(),
    LoggerModule.forRootAsync({
      useFactory: loggerModuleFactory,
      inject: [TwentyConfigService],
    }),
    MessageQueueModule.registerAsync({
      useFactory: messageQueueModuleFactory,
      inject: [TwentyConfigService, RedisClientService, EventEmitter2],
    }),
    ExceptionHandlerModule,
    EmailModule.forRoot(),
    CaptchaModule.forRoot(),
    EventEmitterModule.forRoot({
      wildcard: true,
    }),
    CacheStorageModule,
    I18nModule,
    AiModelsModule,
    SearchModule,
    ApiKeyModule,
    DpaModule,
    PageLayoutModule,
    TrashCleanupModule,
    EventLogsViewerModule,
  ],
  providers: [
    {
      provide: APP_FILTER,
      useClass: PermissionsGraphqlApiExceptionFilter,
    },
  ],
  exports: [
    EventLogsViewerModule,
    AuthModule,
    FeatureFlagModule,
    UserModule,
    WorkspaceModule,
    WorkspaceInvitationModule,
  ],
})
export class CoreEngineModule {}
