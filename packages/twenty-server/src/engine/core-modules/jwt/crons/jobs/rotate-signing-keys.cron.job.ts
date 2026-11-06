/* @license Enterprise */

import { Injectable, Logger } from '@nestjs/common';

import { SigningKeyRotationService } from 'src/engine/core-modules/jwt/services/signing-key-rotation.service';
import { Process } from 'src/engine/core-modules/message-queue/decorators/process.decorator';
import { Processor } from 'src/engine/core-modules/message-queue/decorators/processor.decorator';
import { MessageQueue } from 'src/engine/core-modules/message-queue/message-queue.constants';

@Injectable()
@Processor(MessageQueue.cronQueue)
export class RotateSigningKeysCronJob {
  private readonly logger = new Logger(RotateSigningKeysCronJob.name);

  constructor(
    private readonly signingKeyRotationService: SigningKeyRotationService,
  ) {}

  @Process(RotateSigningKeysCronJob.name)
  async handle(): Promise<void> {
    try {
      const result = await this.signingKeyRotationService.rotateIfDue();

      if (result.rotated) {
        this.logger.log(
          `Rotated current signing key: ${result.previousId} -> ${result.newId}`,
        );
      }
    } catch (error) {
      this.logger.error(
        `Signing key rotation failed: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );

      throw error;
    }
  }
}
