import { GOOGLE_CALENDAR_EVENTS_SCOPE } from '@/accounts/constants/GoogleCalendarEventsScope';
import { type ConnectedAccount } from '@/accounts/types/ConnectedAccount';
import { ConnectedAccountProvider } from 'twenty-shared/types';
import { assertUnreachable, isDefined } from 'twenty-shared/utils';

export const getMissingCreateCalendarEventScopes = (
  connectedAccount: Pick<ConnectedAccount, 'provider' | 'scopes'>,
): string[] => {
  const scopes = connectedAccount.scopes;

  switch (connectedAccount.provider) {
    case ConnectedAccountProvider.GOOGLE: {
      const hasScope =
        isDefined(scopes) &&
        scopes.some((scope) => scope === GOOGLE_CALENDAR_EVENTS_SCOPE);

      return hasScope ? [] : [GOOGLE_CALENDAR_EVENTS_SCOPE];
    }
    case ConnectedAccountProvider.IMAP_SMTP_CALDAV:
    case ConnectedAccountProvider.EMAIL_GROUP:
    case ConnectedAccountProvider.APP:
      return [];
    default:
      assertUnreachable(
        connectedAccount.provider,
        'Provider not yet supported for create calendar event actions',
      );
  }
};
