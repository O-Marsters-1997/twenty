import { ConnectedAccountProvider } from 'twenty-shared/types';

import { getMissingCreateEventScopes } from 'src/modules/calendar/calendar-event-creation-manager/utils/get-missing-create-event-scopes.util';

const GOOGLE_SCOPE = 'https://www.googleapis.com/auth/calendar.events';

describe('getMissingCreateEventScopes', () => {
  it('returns no missing scope when Google has calendar.events', () => {
    expect(
      getMissingCreateEventScopes({
        provider: ConnectedAccountProvider.GOOGLE,
        scopes: ['email', GOOGLE_SCOPE],
      }),
    ).toEqual([]);
  });

  it('reports the Google calendar.events scope when missing', () => {
    expect(
      getMissingCreateEventScopes({
        provider: ConnectedAccountProvider.GOOGLE,
        scopes: ['email'],
      }),
    ).toEqual([GOOGLE_SCOPE]);
  });

  it('treats null scopes as missing', () => {
    expect(
      getMissingCreateEventScopes({
        provider: ConnectedAccountProvider.GOOGLE,
        scopes: null,
      }),
    ).toEqual([GOOGLE_SCOPE]);
  });

  it('does not require OAuth scopes for non-OAuth providers', () => {
    expect(
      getMissingCreateEventScopes({
        provider: ConnectedAccountProvider.APP,
        scopes: null,
      }),
    ).toEqual([]);
  });
});
