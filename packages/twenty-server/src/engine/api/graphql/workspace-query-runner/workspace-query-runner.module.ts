import { Module } from '@nestjs/common';

import { EventLogIngestionModule } from 'src/engine/core-modules/event-logs/ingest/event-log-ingestion.module';
import { WorkspaceCacheModule } from 'src/engine/workspace-cache/workspace-cache.module';
import { TimelineActivityModule } from 'src/modules/timeline/timeline-activity.module';

import { EntityEventsToDbListener } from './listeners/entity-events-to-db.listener';

@Module({
  imports: [
    TimelineActivityModule,
    WorkspaceCacheModule,
    EventLogIngestionModule,
  ],
  providers: [EntityEventsToDbListener],
})
export class WorkspaceQueryRunnerModule {}
