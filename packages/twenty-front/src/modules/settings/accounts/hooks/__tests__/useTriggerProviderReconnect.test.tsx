import { act, renderHook } from '@testing-library/react';

import { ConnectedAccountProvider } from 'twenty-shared/types';
import { useTriggerProviderReconnect } from '@/settings/accounts/hooks/useTriggerProviderReconnect';
import {
  CalendarChannelVisibility,
  MessageChannelVisibility,
} from '~/generated-metadata/graphql';

const mockTriggerApisOAuth = jest.fn();

jest.mock('@/settings/accounts/hooks/useTriggerApiOAuth', () => ({
  useTriggerApisOAuth: jest.fn().mockImplementation(() => ({
    triggerApisOAuth: mockTriggerApisOAuth,
  })),
}));

describe('useTriggerProviderReconnect', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('OAuth providers', () => {
    it('should trigger OAuth for Google provider without options', async () => {
      const { result } = renderHook(() => useTriggerProviderReconnect());

      await act(async () => {
        await result.current.triggerProviderReconnect(
          ConnectedAccountProvider.GOOGLE,
        );
      });

      expect(mockTriggerApisOAuth).toHaveBeenCalledWith(
        ConnectedAccountProvider.GOOGLE,
        {
          redirectLocation: '/settings/accounts',
        },
      );
    });

    it('should trigger OAuth for Google provider with options', async () => {
      const { result } = renderHook(() => useTriggerProviderReconnect());

      const options = {
        redirectLocation: '/custom-redirect',
        calendarVisibility: CalendarChannelVisibility.METADATA,
        messageVisibility: MessageChannelVisibility.SUBJECT,
        loginHint: 'user@example.com',
      };

      await act(async () => {
        await result.current.triggerProviderReconnect(
          ConnectedAccountProvider.GOOGLE,
          undefined,
          options,
        );
      });

      expect(mockTriggerApisOAuth).toHaveBeenCalledWith(
        ConnectedAccountProvider.GOOGLE,
        {
          ...options,
          redirectLocation: '/settings/accounts',
        },
      );
    });

    it('should ignore accountId parameter for OAuth providers', async () => {
      const { result } = renderHook(() => useTriggerProviderReconnect());

      await act(async () => {
        await result.current.triggerProviderReconnect(
          ConnectedAccountProvider.GOOGLE,
          'ignored-account-id',
        );
      });

      expect(mockTriggerApisOAuth).toHaveBeenCalledWith(
        ConnectedAccountProvider.GOOGLE,
        {
          redirectLocation: '/settings/accounts',
        },
      );
    });

    it('should pass skipMessageChannelConfiguration option to OAuth providers', async () => {
      const { result } = renderHook(() => useTriggerProviderReconnect());

      const options = {
        skipMessageChannelConfiguration: true,
        messageVisibility: MessageChannelVisibility.SHARE_EVERYTHING,
      };

      await act(async () => {
        await result.current.triggerProviderReconnect(
          ConnectedAccountProvider.GOOGLE,
          undefined,
          options,
        );
      });

      expect(mockTriggerApisOAuth).toHaveBeenCalledWith(
        ConnectedAccountProvider.GOOGLE,
        {
          ...options,
          redirectLocation: '/settings/accounts',
        },
      );
    });
  });

  describe('error handling', () => {
    it('should handle triggerApisOAuth errors gracefully', async () => {
      const { result } = renderHook(() => useTriggerProviderReconnect());

      const error = new Error('OAuth failed');
      mockTriggerApisOAuth.mockRejectedValue(error);

      await expect(async () => {
        await act(async () => {
          await result.current.triggerProviderReconnect(
            ConnectedAccountProvider.GOOGLE,
          );
        });
      }).rejects.toThrow('OAuth failed');

      expect(mockTriggerApisOAuth).toHaveBeenCalledWith(
        ConnectedAccountProvider.GOOGLE,
        {
          redirectLocation: '/settings/accounts',
        },
      );
    });
  });
});
