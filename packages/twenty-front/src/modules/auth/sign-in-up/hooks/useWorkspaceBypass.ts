import { useIsCurrentLocationOnAWorkspace } from '@/domain-manager/hooks/useIsCurrentLocationOnAWorkspace';
import { workspaceAuthBypassProvidersState } from '@/workspace/states/workspaceAuthBypassProvidersState';
import { workspaceAuthProvidersState } from '@/workspace/states/workspaceAuthProvidersState';
import { workspaceBypassModeState } from '@/workspace/states/workspaceBypassModeState';
import { useAtomState } from '@/ui/utilities/state/jotai/hooks/useAtomState';
import { useAtomStateValue } from '@/ui/utilities/state/jotai/hooks/useAtomStateValue';

export const useWorkspaceBypass = () => {
  const workspaceAuthProviders = useAtomStateValue(workspaceAuthProvidersState);
  const workspaceAuthBypassProviders = useAtomStateValue(
    workspaceAuthBypassProvidersState,
  );
  const [workspaceBypassMode, setWorkspaceBypassMode] = useAtomState(
    workspaceBypassModeState,
  );

  const { isOnAWorkspace } = useIsCurrentLocationOnAWorkspace();

  const hasOnlySsoProvidersEnabled = (() => {
    if (!workspaceAuthProviders) {
      return false;
    }

    const { sso, google, password } = workspaceAuthProviders;

    return sso.length > 0 && !google && !password;
  })();

  const hasBypassProvidersAvailable = (() => {
    if (!workspaceAuthBypassProviders) {
      return false;
    }

    const { google, password } = workspaceAuthBypassProviders;

    return google || password;
  })();

  const shouldOfferBypass =
    isOnAWorkspace && hasOnlySsoProvidersEnabled && hasBypassProvidersAvailable;

  const shouldUseBypass = shouldOfferBypass ? workspaceBypassMode : false;

  const enableBypass = () => {
    if (shouldOfferBypass) {
      setWorkspaceBypassMode(true);
    }
  };

  return {
    shouldOfferBypass,
    shouldUseBypass,
    enableBypass,
  };
};
