import { type QueryRunner } from 'typeorm';

import { RegisteredInstanceCommand } from 'src/engine/core-modules/upgrade/decorators/registered-instance-command.decorator';
import { SlowInstanceCommand } from 'src/engine/core-modules/upgrade/interfaces/slow-instance-command.interface';

@RegisteredInstanceCommand('2.23.0', 1784286705000, { type: 'slow' })
export class BackfillCreatedWorkspaceActivationStatusSlowInstanceCommand
  implements SlowInstanceCommand
{
  async runDataMigration(): Promise<void> {}

  public async up(_queryRunner: QueryRunner): Promise<void> {}

  public async down(_queryRunner: QueryRunner): Promise<void> {}
}
