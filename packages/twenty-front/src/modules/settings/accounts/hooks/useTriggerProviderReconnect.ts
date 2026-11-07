import { useCallback } from 'react';
import { type ConnectedAccountProvider, SettingsPath } from 'twenty-shared/types';
import { getSettingsPath } from 'twenty-shared/utils';

import { useTriggerApisOAuth } from '@/settings/accounts/hooks/useTriggerApiOAuth';

export const useTriggerProviderReconnect = () => {
  const { triggerApisOAuth } = useTriggerApisOAuth();

  const triggerProviderReconnect = useCallback(
    async (
      provider: ConnectedAccountProvider,
      _accountId?: string,
      options?: Parameters<typeof triggerApisOAuth>[1],
    ) => {
      await triggerApisOAuth(provider, {
        ...options,
        redirectLocation: getSettingsPath(SettingsPath.Accounts),
      });
    },
    [triggerApisOAuth],
  );

  return { triggerProviderReconnect };
};
