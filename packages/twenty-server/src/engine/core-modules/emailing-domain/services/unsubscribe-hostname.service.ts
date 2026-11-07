/* @license Enterprise */
import { Injectable, Logger } from '@nestjs/common';

import { UnsubscribeHostnameStatus } from 'src/engine/core-modules/emailing-domain/drivers/types/unsubscribe-hostname-status.type';
import { EmailingDomainEntity } from 'src/engine/core-modules/emailing-domain/emailing-domain.entity';
import { TwentyConfigService } from 'src/engine/core-modules/twenty-config/twenty-config.service';
import { InjectWorkspaceScopedRepository } from 'src/engine/twenty-orm/workspace-scoped-repository/inject-workspace-scoped-repository.decorator';
import { WorkspaceScopedRepository } from 'src/engine/twenty-orm/workspace-scoped-repository/workspace-scoped-repository';

@Injectable()
export class UnsubscribeHostnameService {
  private readonly logger = new Logger(UnsubscribeHostnameService.name);

  constructor(
    @InjectWorkspaceScopedRepository(EmailingDomainEntity)
    private readonly emailingDomainRepository: WorkspaceScopedRepository<EmailingDomainEntity>,
    private readonly twentyConfigService: TwentyConfigService,
  ) {}

  async sync(workspaceId: string, emailingDomainId: string): Promise<void> {
    try {
      const serverUrl = new URL(this.twentyConfigService.get('SERVER_URL'));

      if (serverUrl.protocol !== 'https:') {
        return;
      }

      await this.emailingDomainRepository.update(
        workspaceId,
        { id: emailingDomainId },
        {
          unsubscribeHostname: serverUrl.host,
          unsubscribeHostnameId: null,
          unsubscribeHostnameStatus: UnsubscribeHostnameStatus.ACTIVE,
        },
      );
    } catch (error) {
      this.logger.warn(
        `Failed to sync unsubscribe hostname for emailing domain ${emailingDomainId}: ${error}`,
      );
    }
  }
}
