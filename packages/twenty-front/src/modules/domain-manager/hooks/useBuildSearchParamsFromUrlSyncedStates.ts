import { useCallback } from 'react';

import { returnToPathState } from '@/auth/states/returnToPathState';
import { i18n } from '@lingui/core';
import { isNonEmptyString } from '@sniptt/guards';
import { useStore } from 'jotai';

export const useBuildSearchParamsFromUrlSyncedStates = () => {
  const store = useStore();
  const buildSearchParamsFromUrlSyncedStates = useCallback(async () => {
    const returnToPath = store.get(returnToPathState.atom);

    const output = {
      ...(isNonEmptyString(returnToPath) ? { returnToPath } : {}),
      ...(isNonEmptyString(i18n.locale) ? { locale: i18n.locale } : {}),
    };

    return output;
  }, [store]);

  return {
    buildSearchParamsFromUrlSyncedStates,
  };
};
