import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { FeatureFlagEntity } from 'src/engine/core-modules/feature-flag/feature-flag.entity';
import { FeatureFlagService } from 'src/engine/core-modules/feature-flag/services/feature-flag.service';
import { provideWorkspaceScopedRepository } from 'src/engine/twenty-orm/workspace-scoped-repository/provide-workspace-scoped-repository';
import { WorkspaceCacheModule } from 'src/engine/workspace-cache/workspace-cache.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([FeatureFlagEntity]),
    WorkspaceCacheModule,
  ],
  exports: [FeatureFlagService],
  providers: [
    FeatureFlagService,
    provideWorkspaceScopedRepository(FeatureFlagEntity),
  ],
})
export class FeatureFlagModule {}
