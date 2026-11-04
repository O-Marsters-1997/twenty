import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { ApplicationEntity } from 'src/engine/core-modules/application/application.entity';
import { ApplicationResolver } from 'src/engine/core-modules/application/application.resolver';
import { ApplicationLookupModule } from 'src/engine/core-modules/application/application-lookup/application-lookup.module';
import { ApplicationService } from 'src/engine/core-modules/application/application.service';
import { WorkspaceFlatApplicationMapCacheService } from 'src/engine/core-modules/application/workspace-flat-application-map-cache.service';
import { WorkspaceEntity } from 'src/engine/core-modules/workspace/workspace.entity';
import { AgentEntity } from 'src/engine/metadata-modules/ai/ai-agent/entities/agent.entity';
import { CommandMenuItemEntity } from 'src/engine/metadata-modules/command-menu-item/entities/command-menu-item.entity';
import { WorkspaceManyOrAllFlatEntityMapsCacheModule } from 'src/engine/metadata-modules/flat-entity/services/workspace-many-or-all-flat-entity-maps-cache.module';
import { LogicFunctionEntity } from 'src/engine/metadata-modules/logic-function/logic-function.entity';
import { ObjectMetadataEntity } from 'src/engine/metadata-modules/object-metadata/object-metadata.entity';
import { provideWorkspaceScopedRepository } from 'src/engine/twenty-orm/workspace-scoped-repository/provide-workspace-scoped-repository';
import { WorkspaceCacheModule } from 'src/engine/workspace-cache/workspace-cache.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      ApplicationEntity,
      WorkspaceEntity,
      LogicFunctionEntity,
      AgentEntity,
      CommandMenuItemEntity,
      ObjectMetadataEntity,
    ]),
    ApplicationLookupModule,
    WorkspaceManyOrAllFlatEntityMapsCacheModule,
    WorkspaceCacheModule,
  ],
  exports: [ApplicationService],
  providers: [
    ApplicationResolver,
    ApplicationService,
    WorkspaceFlatApplicationMapCacheService,
    provideWorkspaceScopedRepository(AgentEntity),
    provideWorkspaceScopedRepository(CommandMenuItemEntity),
    provideWorkspaceScopedRepository(LogicFunctionEntity),
    provideWorkspaceScopedRepository(ObjectMetadataEntity),
    provideWorkspaceScopedRepository(ApplicationEntity),
  ],
})
export class ApplicationModule {}
