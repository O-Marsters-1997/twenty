import { agentChatThreadListState } from '@/ai/states/agentChatThreadListState';
import { permissionFlagMapSelector } from '@/settings/roles/states/permissionFlagMapSelector';
import { createAtomSelector } from '@/ui/utilities/state/jotai/utils/createAtomSelector';
import { PermissionFlagType } from '~/generated-metadata/graphql';

export const agentChatThreadsLoadingSelector = createAtomSelector<boolean>({
  key: 'agentChatThreadsLoadingSelector',
  get: ({ get }) =>
    get(agentChatThreadListState) === null &&
    get(permissionFlagMapSelector)[PermissionFlagType.AI],
});
