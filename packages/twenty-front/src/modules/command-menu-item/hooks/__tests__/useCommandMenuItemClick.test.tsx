import { act, renderHook } from '@testing-library/react';
import { type ReactNode } from 'react';
import { createStore, Provider as JotaiProvider } from 'jotai';

import { EMPTY_COMMAND_MENU_CONTEXT_API } from '@/command-menu-item/constants/EmptyCommandMenuContextApi';
import { CommandMenuContext } from '@/command-menu-item/contexts/CommandMenuContext';
import { useCommandMenuItemClick } from '@/command-menu-item/hooks/useCommandMenuItemClick';
import { CommandMenuItemContainerType } from '@/command-menu-item/types/CommandMenuItemContainerType';
import { type CommandMenuItemDefinition } from '@/command-menu-item/types/CommandMenuItemDefinition';
import { EngineComponentKey } from '~/generated-metadata/graphql';

const mockMountCommand = jest.fn();

jest.mock(
  '@/ui/utilities/state/component-state/hooks/useAvailableComponentInstanceIdOrThrow',
  () => ({
    useAvailableComponentInstanceIdOrThrow: () => 'context-store-instance-id',
  }),
);

jest.mock('@/workspace/hooks/useIsFeatureEnabled', () => ({
  useIsFeatureEnabled: () => false,
}));

jest.mock('@/command-menu-item/engine-command/hooks/useMountCommand', () => ({
  useMountCommand: () => mockMountCommand,
}));

jest.mock('@/command-menu-item/hooks/useCloseCommandMenu', () => ({
  useCloseCommandMenu: () => ({ closeCommandMenu: jest.fn() }),
}));

jest.mock(
  '@/command-menu-item/engine-command/constants/EngineComponentKeyHeadlessComponentMap',
  () => ({ ENGINE_COMPONENT_KEY_COMPONENT_MAP: {} }),
);

jest.mock(
  '@/command-menu-item/engine-command/record/components/ExportRecordsCommand',
  () => ({ ExportRecordsCommand: () => null }),
);

const ENGINE_COMMAND_MENU_ITEM = {
  id: 'command-menu-item-id',
  engineComponentKey: EngineComponentKey.NEW_AI_CHAT,
} as CommandMenuItemDefinition;

const wrapper = ({ children }: { children: ReactNode }) => (
  <JotaiProvider store={createStore()}>
    <CommandMenuContext.Provider
      value={{
        containerType: CommandMenuItemContainerType.CommandMenuList,
        displayType: 'listItem',
        commandMenuItems: [],
        commandMenuContextApi: EMPTY_COMMAND_MENU_CONTEXT_API,
        isInPreviewMode: false,
      }}
    >
      {children}
    </CommandMenuContext.Provider>
  </JotaiProvider>
);

describe('useCommandMenuItemClick', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('mounts the engine command of the clicked item', async () => {
    const { result } = renderHook(
      () => useCommandMenuItemClick({ item: ENGINE_COMMAND_MENU_ITEM }),
      { wrapper },
    );

    await act(async () => {
      await result.current.handleClick();
    });

    expect(mockMountCommand).toHaveBeenCalledWith(
      expect.objectContaining({
        engineCommandId: 'command-menu-item-id',
        contextStoreInstanceId: 'context-store-instance-id',
        engineComponentKey: EngineComponentKey.NEW_AI_CHAT,
      }),
    );
  });
});
