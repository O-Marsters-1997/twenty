/* @license Enterprise */

import { Module } from '@nestjs/common';

import { EventLogRetentionService } from 'src/engine/core-modules/event-logs/retention/services/event-log-retention.service';

@Module({
  providers: [EventLogRetentionService],
  exports: [EventLogRetentionService],
})
export class EventLogRetentionModule {}
