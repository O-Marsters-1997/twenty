import { type EventEmitter2 } from '@nestjs/event-emitter';

import { type BullMQDriverOptions } from 'src/engine/core-modules/message-queue/drivers/bullmq.driver';
import { type TwentyConfigService } from 'src/engine/core-modules/twenty-config/twenty-config.service';

export enum MessageQueueDriverType {
  BullMQ = 'bull-mq',
  Sync = 'sync',
}

export interface BullMQDriverFactoryOptions {
  type: MessageQueueDriverType.BullMQ;
  options: BullMQDriverOptions;
  twentyConfigService: TwentyConfigService;
  eventEmitter: EventEmitter2;
}

export interface SyncDriverFactoryOptions {
  type: MessageQueueDriverType.Sync;
  // oxlint-disable-next-line typescript/no-explicit-any
  options: Record<string, any>;
}

export type MessageQueueModuleOptions =
  | BullMQDriverFactoryOptions
  | SyncDriverFactoryOptions;
