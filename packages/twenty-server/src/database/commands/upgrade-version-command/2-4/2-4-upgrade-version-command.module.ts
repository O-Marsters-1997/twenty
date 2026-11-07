import { Module } from '@nestjs/common';

import { WorkspaceIteratorModule } from 'src/database/commands/command-runners/workspace-iterator.module';
import { FeatureFlagModule } from 'src/engine/core-modules/feature-flag/feature-flag.module';

@Module({
  imports: [FeatureFlagModule, WorkspaceIteratorModule],
})
export class V2_4_UpgradeVersionCommandModule {}
