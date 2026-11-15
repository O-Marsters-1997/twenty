import * as stylex from '@stylexjs/stylex';
import { type ReactNode } from 'react';
import { Tabs } from 'twenty-ui/primitives/navigation';

import { activeTabIdComponentState } from '@/ui/layout/tab-list/states/activeTabIdComponentState';
import { TabListComponentInstanceContext } from '@/ui/layout/tab-list/states/contexts/TabListComponentInstanceContext';
import { useAtomComponentStateValue } from '@/ui/utilities/state/jotai/hooks/useAtomComponentStateValue';

const styles = stylex.create({
  root: {
    display: 'contents',
  },
});

type TabListRootProps = {
  componentInstanceId: string;
  children: ReactNode;
  enabled?: boolean;
};

export const TabListRoot = ({
  componentInstanceId,
  children,
  enabled = true,
}: TabListRootProps) => {
  const activeTabId = useAtomComponentStateValue(
    activeTabIdComponentState,
    componentInstanceId,
  );

  return (
    <TabListComponentInstanceContext.Provider
      value={{ instanceId: componentInstanceId }}
    >
      {enabled ? (
        <Tabs.Root value={activeTabId} {...stylex.props(styles.root)}>
          {children}
        </Tabs.Root>
      ) : (
        children
      )}
    </TabListComponentInstanceContext.Provider>
  );
};
