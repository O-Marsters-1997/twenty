import * as stylex from '@stylexjs/stylex';
import { useDeferredValue, type ReactNode } from 'react';
import { Collapsible } from 'twenty-ui/primitives/layout';

import { NavigationDrawerItemsCollapsableContainer } from '@/ui/navigation/navigation-drawer/components/NavigationDrawerItemsCollapsableContainer';

const styles = stylex.create({
  expandable: { overflow: 'visible' },
});

type NavigationMenuItemFolderLayoutProps = {
  header: ReactNode;
  isOpen: boolean;
  isGroup: boolean;
  children: ReactNode;
};

export const NavigationMenuItemFolderLayout = ({
  header,
  isOpen,
  isGroup,
  children,
}: NavigationMenuItemFolderLayoutProps) => {
  const deferredIsOpen = useDeferredValue(isOpen);
  const isExpandedForAnimation = isOpen ? deferredIsOpen : false;

  return (
    <NavigationDrawerItemsCollapsableContainer isGroup={isGroup}>
      {header}
      <div {...stylex.props(styles.expandable)}>
        <Collapsible.Root open={isExpandedForAnimation}>
          <Collapsible.Panel dimension="height" containAnimation>
            {children}
          </Collapsible.Panel>
        </Collapsible.Root>
      </div>
    </NavigationDrawerItemsCollapsableContainer>
  );
};
