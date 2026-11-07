import { useCallback } from 'react';

import { partnerCookieState } from '@/auth/states/partnerCookieState';
import { returnToPathState } from '@/auth/states/returnToPathState';
import { isValidReturnToPath } from '@/auth/utils/isValidReturnToPath';
import { useStore } from 'jotai';
import { isDefined, normalizePartner } from 'twenty-shared/utils';

export const useInitializeQueryParamState = () => {
  const store = useStore();
  const initializeQueryParamState = useCallback(() => {
    const handlers: Record<string, (value: string) => void> = {
      returnToPath: (value: string) => {
        if (isValidReturnToPath(value)) {
          store.set(returnToPathState.atom, value);
        }
      },
      partner: (value: string) => {
        const partner = normalizePartner(value);

        if (isDefined(partner)) {
          store.set(partnerCookieState.atom, { partner });
        }
      },
    };

    const queryParams = new URLSearchParams(window.location.search);

    for (const [paramName, handler] of Object.entries(handlers)) {
      const value = queryParams.get(paramName);
      if (value !== null) {
        handler(value);
      }
    }
  }, [store]);

  return { initializeQueryParamState };
};
