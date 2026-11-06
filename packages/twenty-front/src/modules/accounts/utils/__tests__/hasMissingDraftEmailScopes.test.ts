import { GMAIL_COMPOSE_SCOPE } from '@/accounts/constants/GmailComposeScope';
import { type ConnectedAccount } from '@/accounts/types/ConnectedAccount';
import { getMissingDraftEmailScopes } from '@/accounts/utils/hasMissingDraftEmailScopes';
import { ConnectedAccountProvider } from 'twenty-shared/types';

const buildConnectedAccount = (
  overrides: Partial<ConnectedAccount>,
): ConnectedAccount =>
  ({
    id: 'test-id',
    handle: 'test@example.com',
    provider: ConnectedAccountProvider.GOOGLE,
    scopes: [],
    ...overrides,
  }) as ConnectedAccount;

describe('getMissingDraftEmailScopes', () => {
  describe('Google provider', () => {
    it('should return gmail.compose scope when it is missing', () => {
      const account = buildConnectedAccount({
        provider: ConnectedAccountProvider.GOOGLE,
        scopes: [],
      });

      expect(getMissingDraftEmailScopes(account)).toEqual([
        GMAIL_COMPOSE_SCOPE,
      ]);
    });

    it('should return empty array when gmail.compose scope exists', () => {
      const account = buildConnectedAccount({
        provider: ConnectedAccountProvider.GOOGLE,
        scopes: [GMAIL_COMPOSE_SCOPE],
      });

      expect(getMissingDraftEmailScopes(account)).toEqual([]);
    });

    it('should return gmail.compose scope when scopes are null', () => {
      const account = buildConnectedAccount({
        provider: ConnectedAccountProvider.GOOGLE,
        scopes: null,
      });

      expect(getMissingDraftEmailScopes(account)).toEqual([
        GMAIL_COMPOSE_SCOPE,
      ]);
    });
  });

  describe('IMAP/SMTP provider', () => {
    it('should always return empty array', () => {
      const account = buildConnectedAccount({
        provider: ConnectedAccountProvider.IMAP_SMTP_CALDAV,
        connectionParameters: undefined,
      });

      expect(getMissingDraftEmailScopes(account)).toEqual([]);
    });
  });
});
