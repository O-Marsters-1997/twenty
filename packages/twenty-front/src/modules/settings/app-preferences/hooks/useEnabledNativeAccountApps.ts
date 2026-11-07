import { isGoogleCalendarEnabledState } from '@/client-config/states/isGoogleCalendarEnabledState';
import { isGoogleMessagingEnabledState } from '@/client-config/states/isGoogleMessagingEnabledState';
import { NATIVE_ACCOUNT_APPS } from '@/settings/app-preferences/constants/NativeAccountApps';
import { type NativeAccountApp } from '@/settings/app-preferences/types/NativeAccountApp';
import { useAtomStateValue } from '@/ui/utilities/state/jotai/hooks/useAtomStateValue';

export const useEnabledNativeAccountApps = () => {
  const isGoogleMessagingEnabled = useAtomStateValue(
    isGoogleMessagingEnabledState,
  );
  const isGoogleCalendarEnabled = useAtomStateValue(
    isGoogleCalendarEnabledState,
  );

  const isAppEnabled: Record<NativeAccountApp['id'], boolean> = {
    gmail: isGoogleMessagingEnabled,
    'google-calendar': isGoogleCalendarEnabled,
  };

  return {
    enabledNativeAccountApps: NATIVE_ACCOUNT_APPS.filter(
      (app) => isAppEnabled[app.id],
    ),
  };
};
