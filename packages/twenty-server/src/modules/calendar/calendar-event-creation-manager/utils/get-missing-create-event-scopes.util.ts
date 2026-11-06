import { ConnectedAccountProvider } from 'twenty-shared/types';
import { assertUnreachable, isDefined } from 'twenty-shared/utils';

const GOOGLE_CALENDAR_EVENTS_SCOPE =
  'https://www.googleapis.com/auth/calendar.events';

export const getMissingCreateEventScopes = (connectedAccount: {
  provider: ConnectedAccountProvider;
  scopes: string[] | null;
}): string[] => {
  const scopes = connectedAccount.scopes;

  switch (connectedAccount.provider) {
    case ConnectedAccountProvider.GOOGLE: {
      const hasScope =
        isDefined(scopes) && scopes.includes(GOOGLE_CALENDAR_EVENTS_SCOPE);

      return hasScope ? [] : [GOOGLE_CALENDAR_EVENTS_SCOPE];
    }
    // Non-OAuth providers do not rely on OAuth scopes to create events.
    case ConnectedAccountProvider.IMAP_SMTP_CALDAV:
    case ConnectedAccountProvider.EMAIL_GROUP:
    case ConnectedAccountProvider.APP:
      return [];
    default:
      return assertUnreachable(
        connectedAccount.provider,
        `Unhandled connected account provider for create event scopes: ${connectedAccount.provider}`,
      );
  }
};
