import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { DomainServerConfigModule } from 'src/engine/core-modules/domain/domain-server-config/domain-server-config.module';
import { WorkspaceDomainsService } from 'src/engine/core-modules/domain/workspace-domains/services/workspace-domains.service';
import { WorkspaceEntity } from 'src/engine/core-modules/workspace/workspace.entity';

@Module({
  imports: [
    DomainServerConfigModule,
    TypeOrmModule.forFeature([WorkspaceEntity]),
  ],
  providers: [WorkspaceDomainsService],
  exports: [WorkspaceDomainsService],
})
export class WorkspaceDomainsModule {}
