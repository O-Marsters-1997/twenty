import { isDefined } from 'twenty-shared/utils';

import { JwtTokenTypeEnum } from 'src/engine/core-modules/auth/types/jwt-token-type.enum';
import { type AuthPrincipalVariant } from 'src/engine/guards/types/auth-principal-variant.type';

type AuthPrincipalRequest = {
  user?: unknown;
  apiKey?: unknown;
  application?: unknown;
  tokenType?: JwtTokenTypeEnum;
};

const carriesUserWithoutOtherPrincipal = (
  request: AuthPrincipalRequest,
): boolean =>
  isDefined(request.user) &&
  !isDefined(request.apiKey) &&
  !isDefined(request.application);

export const classifyAuthPrincipal = (
  request: AuthPrincipalRequest,
): AuthPrincipalVariant | undefined => {
  switch (request.tokenType) {
    case JwtTokenTypeEnum.API_KEY:
      return isDefined(request.apiKey) &&
        !isDefined(request.user) &&
        !isDefined(request.application)
        ? { kind: 'apiKey' }
        : undefined;
    case JwtTokenTypeEnum.APPLICATION_ACCESS:
      if (!isDefined(request.application) || isDefined(request.apiKey)) {
        return undefined;
      }

      return {
        kind: 'application',
        variant: isDefined(request.user) ? 'withUser' : 'withoutUser',
      };
    case JwtTokenTypeEnum.ACCESS:
      return carriesUserWithoutOtherPrincipal(request)
        ? {
            kind: 'userSession',
            variant: 'standard',
          }
        : undefined;
    case JwtTokenTypeEnum.PLAYGROUND:
      return carriesUserWithoutOtherPrincipal(request)
        ? { kind: 'userSession', variant: 'playground' }
        : undefined;
    case JwtTokenTypeEnum.WORKSPACE_AGNOSTIC:
      return carriesUserWithoutOtherPrincipal(request)
        ? { kind: 'userSession', variant: 'workspaceAgnostic' }
        : undefined;
    default:
      return undefined;
  }
};
