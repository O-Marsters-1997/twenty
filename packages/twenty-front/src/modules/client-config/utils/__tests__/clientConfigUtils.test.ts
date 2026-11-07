import { REACT_APP_SERVER_BASE_URL } from '~/config';
import { getClientConfig } from '@/client-config/utils/getClientConfig';

global.fetch = jest.fn();

const mockClientConfig = {
  billing: {
    isBillingEnabled: true,
    billingUrl: 'https://billing.example.com',
    trialPeriods: [],
  },
  authProviders: {
    google: true,
    magicLink: false,
    password: true,
  },
  signInPrefilled: false,
  isMultiWorkspaceEnabled: true,
  isEmailVerificationRequired: false,
  defaultSubdomain: 'app',
  frontDomain: 'localhost',
  serverUrl: 'http://localhost:3000',
  support: {
    supportDriver: 'none',
    supportFrontChatId: undefined,
  },
  captcha: {
    provider: undefined,
    siteKey: undefined,
  },
  api: {
    mutationMaximumAffectedRecords: 100,
  },
  isAttachmentPreviewEnabled: true,
  canManageFeatureFlags: true,
  publicFeatureFlags: [],
  isGoogleMessagingEnabled: false,
  isGoogleCalendarEnabled: false,
  isConfigVariablesInDbEnabled: false,
};

describe('getClientConfig', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should fetch client config from API', async () => {
    (fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => mockClientConfig,
    });

    const result = await getClientConfig();

    expect(fetch).toHaveBeenCalledWith(
      `${REACT_APP_SERVER_BASE_URL}/client-config?v=v1`,
    );
    expect(result).toEqual(mockClientConfig);
  });

  it('should handle fetch errors', async () => {
    (fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      status: 500,
      statusText: 'Internal Server Error',
    });

    await expect(getClientConfig()).rejects.toThrow(
      'Failed to fetch client config: 500 Internal Server Error',
    );
  });

  it('should handle network errors', async () => {
    (fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'));

    await expect(getClientConfig()).rejects.toThrow('Network error');
  });
});
