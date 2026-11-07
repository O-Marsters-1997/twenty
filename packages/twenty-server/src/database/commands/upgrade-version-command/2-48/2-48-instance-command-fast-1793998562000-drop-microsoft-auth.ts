import { type QueryRunner } from 'typeorm';

import { RegisteredInstanceCommand } from 'src/engine/core-modules/upgrade/decorators/registered-instance-command.decorator';
import { type FastInstanceCommand } from 'src/engine/core-modules/upgrade/interfaces/fast-instance-command.interface';

@RegisteredInstanceCommand('2.48.0', 1793998562000)
export class DropMicrosoftAuthFastInstanceCommand
  implements FastInstanceCommand
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "core"."workspace" DROP COLUMN IF EXISTS "isMicrosoftAuthEnabled", DROP COLUMN IF EXISTS "isMicrosoftAuthBypassEnabled"`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "core"."workspace" ADD COLUMN IF NOT EXISTS "isMicrosoftAuthEnabled" boolean NOT NULL DEFAULT true, ADD COLUMN IF NOT EXISTS "isMicrosoftAuthBypassEnabled" boolean NOT NULL DEFAULT false`,
    );
  }
}
