import { Injectable } from '@nestjs/common';

import { buildUrlWithPathnameAndSearchParams } from 'src/engine/core-modules/domain/domain-server-config/utils/build-url-with-pathname-and-search-params.util';
import { TwentyConfigService } from 'src/engine/core-modules/twenty-config/twenty-config.service';

@Injectable()
export class DomainServerConfigService {
  constructor(private readonly twentyConfigService: TwentyConfigService) {}

  getFrontUrl() {
    return new URL(
      this.twentyConfigService.get('FRONTEND_URL') ??
        this.twentyConfigService.get('SERVER_URL'),
    );
  }

  getBaseUrl(): URL {
    const baseUrl = this.getFrontUrl();

    if (
      this.twentyConfigService.get('IS_MULTIWORKSPACE_ENABLED') &&
      this.twentyConfigService.get('DEFAULT_SUBDOMAIN')
    ) {
      baseUrl.hostname = `${this.twentyConfigService.get('DEFAULT_SUBDOMAIN')}.${baseUrl.hostname}`;
    }

    return baseUrl;
  }

  buildBaseUrl({
    pathname,
    searchParams,
    hash,
  }: {
    pathname?: string;
    searchParams?: Record<string, string | number>;
    hash?: string;
  }) {
    return buildUrlWithPathnameAndSearchParams({
      baseUrl: this.getBaseUrl(),
      pathname,
      searchParams,
      hash,
    });
  }

  getSubdomainFromUrl(url: string): string | undefined {
    const hostname = new URL(url).hostname;
    const frontDomain = this.getFrontUrl().hostname;

    if (hostname === frontDomain || !hostname.endsWith(`.${frontDomain}`)) {
      return undefined;
    }

    const subdomain = hostname.replace(`.${frontDomain}`, '');

    return subdomain === this.twentyConfigService.get('DEFAULT_SUBDOMAIN')
      ? undefined
      : subdomain;
  }
}
