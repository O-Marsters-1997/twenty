import { type QueryRunner } from 'typeorm';

import { RegisteredInstanceCommand } from 'src/engine/core-modules/upgrade/decorators/registered-instance-command.decorator';
import { type FastInstanceCommand } from 'src/engine/core-modules/upgrade/interfaces/fast-instance-command.interface';

@RegisteredInstanceCommand('2.48.0', 1793824525551)
export class DropAppTokenSsoExchangeIndexFastInstanceCommand
  implements FastInstanceCommand
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX IF EXISTS "core"."IDX_APP_TOKEN_TYPE_VALUE_SSO_EXCHANGE_UNIQUE"`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE UNIQUE INDEX IF NOT EXISTS "IDX_APP_TOKEN_TYPE_VALUE_SSO_EXCHANGE_UNIQUE" ON "core"."appToken" ("type", "value") WHERE "type" = 'SSO_EXCHANGE_TOKEN' AND "deletedAt" IS NULL AND "revokedAt" IS NULL`,
    );
  }
}
