import { Module } from '@nestjs/common';

import { CommandShutdownModule } from 'src/database/commands/command-runners/command-shutdown.module';
import { WorkspaceIteratorModule } from 'src/database/commands/command-runners/workspace-iterator.module';
import { InstanceCommandProviderModule } from 'src/database/commands/upgrade-version-command/instance-command-provider.module';
import { WorkspaceCommandProviderModule } from 'src/database/commands/upgrade-version-command/workspace-command-provider.module';
import { InstanceCommandRunnerService } from 'src/engine/core-modules/upgrade/services/instance-command-runner.service';
import { UpgradeSequenceRunnerService } from 'src/engine/core-modules/upgrade/services/upgrade-sequence-runner.service';
import { WorkspaceCommandRunnerService } from 'src/engine/core-modules/upgrade/services/workspace-command-runner.service';
import { UpgradeStatusModule } from 'src/engine/core-modules/upgrade/upgrade-status.module';
import { UpgradeAwareEntityMetadataAdapter } from 'src/engine/twenty-orm/upgrade-aware/upgrade-aware-entity-metadata.adapter';
import { WorkspaceVersionModule } from 'src/engine/workspace-manager/workspace-version/workspace-version.module';

@Module({
  imports: [
    CommandShutdownModule,
    InstanceCommandProviderModule,
    UpgradeStatusModule,
    WorkspaceCommandProviderModule,
    WorkspaceIteratorModule,
    WorkspaceVersionModule,
  ],
  providers: [
    InstanceCommandRunnerService,
    WorkspaceCommandRunnerService,
    UpgradeAwareEntityMetadataAdapter,
    UpgradeSequenceRunnerService,
  ],
  exports: [
    UpgradeStatusModule,
    InstanceCommandRunnerService,
    UpgradeSequenceRunnerService,
  ],
})
export class UpgradeModule {}
