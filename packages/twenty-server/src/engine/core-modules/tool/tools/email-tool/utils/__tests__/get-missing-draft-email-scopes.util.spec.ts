import { ConnectedAccountProvider } from 'twenty-shared/types';

import { getMissingDraftEmailScopes } from 'src/engine/core-modules/tool/tools/email-tool/utils/get-missing-draft-email-scopes.util';

const GMAIL_COMPOSE_SCOPE = 'https://www.googleapis.com/auth/gmail.compose';

describe('getMissingDraftEmailScopes', () => {
  describe('Google provider', () => {
    it('returns the compose scope when missing', () => {
      expect(
        getMissingDraftEmailScopes({
          provider: ConnectedAccountProvider.GOOGLE,
          scopes: ['email', 'profile'],
        }),
      ).toEqual([GMAIL_COMPOSE_SCOPE]);
    });

    it('returns the compose scope when scopes are null', () => {
      expect(
        getMissingDraftEmailScopes({
          provider: ConnectedAccountProvider.GOOGLE,
          scopes: null,
        }),
      ).toEqual([GMAIL_COMPOSE_SCOPE]);
    });

    it('returns nothing when the compose scope is present', () => {
      expect(
        getMissingDraftEmailScopes({
          provider: ConnectedAccountProvider.GOOGLE,
          scopes: ['email', GMAIL_COMPOSE_SCOPE],
        }),
      ).toEqual([]);
    });
  });

  describe('non-OAuth providers', () => {
    it.each([
      ConnectedAccountProvider.IMAP_SMTP_CALDAV,
      ConnectedAccountProvider.EMAIL_GROUP,
      ConnectedAccountProvider.APP,
    ])('never requires scopes for %s accounts', (provider) => {
      expect(getMissingDraftEmailScopes({ provider, scopes: null })).toEqual(
        [],
      );
    });
  });
});
