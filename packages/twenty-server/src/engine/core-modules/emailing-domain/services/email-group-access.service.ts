/* @license Enterprise */

import { Injectable } from '@nestjs/common';

import { COMMUNITY_EMAILING_DOMAIN_DRIVERS } from 'src/engine/core-modules/emailing-domain/constants/community-emailing-domain-drivers.constant';
import { TwentyConfigService } from 'src/engine/core-modules/twenty-config/twenty-config.service';

@Injectable()
export class EmailGroupAccessService {
  constructor(
    private readonly twentyConfigService: TwentyConfigService,
  ) {}

  validateEmailGroupAccessOrThrow(): void {
    if (
      COMMUNITY_EMAILING_DOMAIN_DRIVERS.includes(
        this.twentyConfigService.get('EMAILING_DOMAIN_DRIVER'),
      )
    ) {
      return;
    }

  }
}
