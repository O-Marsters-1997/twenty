import { GMAIL_COMPOSE_SCOPE } from '@/accounts/constants/GmailComposeScope';
import { type ConnectedAccount } from '@/accounts/types/ConnectedAccount';
import { ConnectedAccountProvider } from 'twenty-shared/types';
import { assertUnreachable, isDefined } from 'twenty-shared/utils';

export const getMissingDraftEmailScopes = (
  connectedAccount: Pick<ConnectedAccount, 'provider' | 'scopes'>,
): string[] => {
  const scopes = connectedAccount.scopes;

  switch (connectedAccount.provider) {
    case ConnectedAccountProvider.GOOGLE: {
      const hasScope =
        isDefined(scopes) &&
        scopes.some((scope) => scope === GMAIL_COMPOSE_SCOPE);

      return hasScope ? [] : [GMAIL_COMPOSE_SCOPE];
    }
    case ConnectedAccountProvider.EMAIL_GROUP:
    case ConnectedAccountProvider.APP:
      return [];
    default:
      assertUnreachable(
        connectedAccount.provider,
        'Provider not yet supported for draft email actions',
      );
  }
};
