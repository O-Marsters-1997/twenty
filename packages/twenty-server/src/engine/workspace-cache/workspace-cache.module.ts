import { Module } from '@nestjs/common';
import { DiscoveryModule } from '@nestjs/core';
import { WorkspaceCacheService } from 'src/engine/workspace-cache/services/workspace-cache.service';

@Module({
  imports: [DiscoveryModule],
  providers: [WorkspaceCacheService],
  exports: [WorkspaceCacheService],
})
export class WorkspaceCacheModule {}
