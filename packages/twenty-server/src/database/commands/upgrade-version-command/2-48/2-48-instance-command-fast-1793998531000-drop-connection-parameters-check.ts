import { type QueryRunner } from 'typeorm';

import { RegisteredInstanceCommand } from 'src/engine/core-modules/upgrade/decorators/registered-instance-command.decorator';
import { type FastInstanceCommand } from 'src/engine/core-modules/upgrade/interfaces/fast-instance-command.interface';

@RegisteredInstanceCommand('2.48.0', 1793998531000)
export class DropConnectionParametersCheckFastInstanceCommand
  implements FastInstanceCommand
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "core"."connectedAccount" DROP CONSTRAINT IF EXISTS "CHK_connectedAccount_connectionParameters_encrypted"`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "core"."connectedAccount" ADD CONSTRAINT "CHK_connectedAccount_connectionParameters_encrypted" CHECK ("connectionParameters" IS NULL OR ((("connectionParameters"->'IMAP'->>'password') IS NULL OR ("connectionParameters"->'IMAP'->>'password') LIKE 'enc:v2:%') AND (("connectionParameters"->'SMTP'->>'password') IS NULL OR ("connectionParameters"->'SMTP'->>'password') LIKE 'enc:v2:%') AND (("connectionParameters"->'CALDAV'->>'password') IS NULL OR ("connectionParameters"->'CALDAV'->>'password') LIKE 'enc:v2:%')))`,
    );
  }
}
