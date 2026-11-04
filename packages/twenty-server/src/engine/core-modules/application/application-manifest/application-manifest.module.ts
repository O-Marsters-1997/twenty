import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { ApplicationEntity } from 'src/engine/core-modules/application/application.entity';
import { ApplicationModule } from 'src/engine/core-modules/application/application.module';
import { ApplicationUninstallService } from 'src/engine/core-modules/application/application-manifest/services/application-uninstall.service';
import { LogicFunctionExecutorModule } from 'src/engine/core-modules/logic-function/logic-function-executor/logic-function-executor.module';
import { provideWorkspaceScopedRepository } from 'src/engine/twenty-orm/workspace-scoped-repository/provide-workspace-scoped-repository';

@Module({
  imports: [
    TypeOrmModule.forFeature([ApplicationEntity]),
    ApplicationModule,
    LogicFunctionExecutorModule,
  ],
  providers: [
    ApplicationUninstallService,
    provideWorkspaceScopedRepository(ApplicationEntity),
  ],
  exports: [ApplicationUninstallService],
})
export class ApplicationManifestModule {}
