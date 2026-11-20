import { DropdownMenuItemsContainer } from '@/ui/layout/dropdown/components/DropdownMenuItemsContainer';
import * as stylex from '@stylexjs/stylex';
import { type ReactNode } from 'react';

const styles = stylex.create({
  contentContainer: {
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column',
    maxHeight: '340px',
    minHeight: 0,
  },
  menuItemsContainer: {
    flex: '1',
    minHeight: 0,
  },
});

export const PageLayoutDropdownContentContainer = ({
  children,
}: {
  children: ReactNode;
}) => <div {...stylex.props(styles.contentContainer)}>{children}</div>;

export const PageLayoutDropdownMenuItemsContainer = ({
  children,
}: {
  children: ReactNode;
}) => (
  <DropdownMenuItemsContainer
    className={stylex.props(styles.menuItemsContainer).className}
  >
    {children}
  </DropdownMenuItemsContainer>
);
