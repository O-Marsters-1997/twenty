import { ExecutionContext, Injectable } from '@nestjs/common';

import { type Request } from 'express';
import { AppPath } from 'twenty-shared/types';

import {
  AuthException,
  AuthExceptionCode,
} from 'src/engine/core-modules/auth/auth.exception';
import { DomainServerConfigService } from 'src/engine/core-modules/domain/domain-server-config/services/domain-server-config.service';
import { WorkspaceDomainsService } from 'src/engine/core-modules/domain/workspace-domains/services/workspace-domains.service';
import { ExceptionHandlerService } from 'src/engine/core-modules/exception-handler/exception-handler.service';
import { TwentyConfigService } from 'src/engine/core-modules/twenty-config/twenty-config.service';
import { type CustomException } from 'src/utils/custom-exception';

@Injectable()
export class GuardRedirectService {
  constructor(
    private readonly twentyConfigService: TwentyConfigService,
    private readonly exceptionHandlerService: ExceptionHandlerService,
    private readonly domainsServerConfigService: DomainServerConfigService,
    private readonly workspaceDomainsService: WorkspaceDomainsService,
  ) {}

  dispatchErrorFromGuard(
    context: ExecutionContext,
    error: Error | CustomException,
    workspace: {
      id?: string;
      subdomain: string;
    },
    pathname = AppPath.Verify,
  ) {
    if ('contextType' in context && context.contextType === 'graphql') {
      throw error;
    }

    context.switchToHttp().getResponse().redirect(
      this.getRedirectErrorUrlAndCaptureExceptions({
        error,
        workspace,
        pathname,
      }),
    );
  }

  getSubdomainFromContext(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest<Request>();

    const subdomainFromReferer = request.headers.referer
      ? this.domainsServerConfigService.getSubdomainFromUrl(
          request.headers.referer,
        )
      : undefined;

    return {
      subdomain:
        subdomainFromReferer ?? this.twentyConfigService.get("DEFAULT_SUBDOMAIN"),
    };
  }

  private captureException(err: Error | CustomException, workspaceId?: string) {
    if (
      err instanceof AuthException &&
      err.code !== AuthExceptionCode.INTERNAL_SERVER_ERROR
    )
      return;

    this.exceptionHandlerService.captureExceptions([err], {
      workspace: {
        id: workspaceId,
      },
    });
  }

  getRedirectErrorUrlAndCaptureExceptions({
    error,
    workspace,
    pathname,
  }: {
    error: Error | AuthException;
    workspace: {
      id?: string;
      subdomain: string;
    };
    pathname: string;
  }) {
    this.captureException(error, workspace.id);

    const errorMessage =
      error instanceof AuthException
        ? error.message
        : `Authentication error: ${error instanceof Error ? error.message : String(error)}`;

    return this.workspaceDomainsService.computeWorkspaceRedirectErrorUrl(
      errorMessage,
      {
        subdomain: workspace.subdomain,
      },
      pathname,
    );
  }
}
