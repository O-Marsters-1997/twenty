import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { TypeORMModule } from 'src/database/typeorm/typeorm.module';
import { ApplicationModule } from 'src/engine/core-modules/application/application.module';
import { BillingModule } from 'src/engine/core-modules/billing/billing.module';
import { EventLogRetentionModule } from 'src/engine/core-modules/event-logs/retention/event-log-retention.module';
import { CompanyEnrichmentModule } from 'src/engine/core-modules/company-enrichment/company-enrichment.module';
import { SubdomainManagerModule } from 'src/engine/core-modules/domain/subdomain-manager/subdomain-manager.module';
import { WorkspaceDomainsModule } from 'src/engine/core-modules/domain/workspace-domains/workspace-domains.module';
import { EnterpriseModule } from 'src/engine/core-modules/enterprise/enterprise.module';
import { FeatureFlagModule } from 'src/engine/core-modules/feature-flag/feature-flag.module';
import { FileModule } from 'src/engine/core-modules/file/file.module';
import { MetricsModule } from 'src/engine/core-modules/metrics/metrics.module';
import { UserWorkspaceEntity } from 'src/engine/core-modules/user-workspace/user-workspace.entity';
import { UserWorkspaceModule } from 'src/engine/core-modules/user-workspace/user-workspace.module';
import { UserEntity } from 'src/engine/core-modules/user/user.entity';
import { UpgradeModule } from 'src/engine/core-modules/upgrade/upgrade.module';
import { CoreEntityCacheModule } from 'src/engine/core-entity-cache/core-entity-cache.module';
import { WorkspaceEntityCacheProviderService } from 'src/engine/core-modules/workspace/services/workspace-entity-cache-provider.service';
import { WorkspaceService } from 'src/engine/core-modules/workspace/services/workspace.service';
import { WorkspaceGaugeService } from 'src/engine/core-modules/workspace/workspace-gauge.service';
import { WorkspaceEntity } from 'src/engine/core-modules/workspace/workspace.entity';
import { WorkspaceResolver } from 'src/engine/core-modules/workspace/workspace.resolver';
import { BillingDisabledGuard } from 'src/engine/guards/billing-disabled.guard';
import { AiAgentModule } from 'src/engine/metadata-modules/ai/ai-agent/ai-agent.module';
import { WorkspaceManyOrAllFlatEntityMapsCacheModule } from 'src/engine/metadata-modules/flat-entity/services/workspace-many-or-all-flat-entity-maps-cache.module';
import { PermissionsModule } from 'src/engine/metadata-modules/permissions/permissions.module';
import { RoleModule } from 'src/engine/metadata-modules/role/role.module';
import { ViewModule } from 'src/engine/metadata-modules/view/view.module';
import { WorkspaceCacheStorageModule } from 'src/engine/workspace-cache-storage/workspace-cache-storage.module';
import { WorkspaceDataSourceModule } from 'src/engine/workspace-datasource/workspace-datasource.module';
import { WorkspaceManagerModule } from 'src/engine/workspace-manager/workspace-manager.module';
import { WorkspaceMigrationModule } from 'src/engine/workspace-manager/workspace-migration/workspace-migration.module';

@Module({
  imports: [
    TypeORMModule,
    TypeOrmModule.forFeature([
      WorkspaceEntity,
      UserEntity,
      UserWorkspaceEntity,
    ]),
    MetricsModule,
    BillingModule,
    EventLogRetentionModule,
    FileModule,
    UserWorkspaceModule,
    WorkspaceManagerModule,
    FeatureFlagModule,
    WorkspaceDataSourceModule,
    PermissionsModule,
    WorkspaceCacheStorageModule,
    RoleModule,
    AiAgentModule,
    WorkspaceDomainsModule,
    SubdomainManagerModule,
    ViewModule,
    WorkspaceManyOrAllFlatEntityMapsCacheModule,
    ApplicationModule,
    EnterpriseModule,
    WorkspaceMigrationModule,
    CoreEntityCacheModule,
    UpgradeModule,
    CompanyEnrichmentModule,
  ],
  exports: [WorkspaceService],
  providers: [
    WorkspaceResolver,
    WorkspaceService,
    WorkspaceGaugeService,
    WorkspaceEntityCacheProviderService,
    BillingDisabledGuard,
  ],
})
export class WorkspaceModule {}
