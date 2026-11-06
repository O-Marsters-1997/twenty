import { workspaceAuthProvidersState } from '@/workspace/states/workspaceAuthProvidersState';
import { useAtomStateValue } from '@/ui/utilities/state/jotai/hooks/useAtomStateValue';

export const useHasMultipleAuthMethods = () => {
  const workspaceAuthProviders = useAtomStateValue(workspaceAuthProvidersState);

  if (!workspaceAuthProviders) {
    return false;
  }

  let enabledMethodsCount = 0;

  if (workspaceAuthProviders.google) enabledMethodsCount++;
  if (workspaceAuthProviders.microsoft) enabledMethodsCount++;
  if (workspaceAuthProviders.password) enabledMethodsCount++;

  return enabledMethodsCount > 1;
};
