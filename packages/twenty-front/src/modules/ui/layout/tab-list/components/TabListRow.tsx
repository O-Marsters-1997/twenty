import * as stylex from '@stylexjs/stylex';
import { type ReactNode, type Ref } from 'react';
import { Tabs } from 'twenty-ui/primitives/navigation';

import { layoutSize } from '@/ui/layout/constants/layout.stylex';

const styles = stylex.create({
  container: {
    gap: layoutSize.tabListGap,
    display: 'flex',
    position: 'relative',
    scrollbarWidth: { default: null, '@media (pointer: coarse)': 'none' },
    maxWidth: '100%',
    overflowY: 'hidden',
    '::-webkit-scrollbar': {
      display: { default: null, '@media (pointer: coarse)': 'none' },
    },
    '::after': { display: 'none' },
  },
  scrollable: { overflowX: 'auto' },
  notScrollable: { overflowX: 'hidden' },
});

type TabListRowProps = {
  'aria-label': string;
  behaveAsLinks: boolean;
  children: ReactNode;
  isScrollable: boolean;
  ref?: Ref<HTMLDivElement>;
};

export const TabListRow = ({
  'aria-label': ariaLabel,
  behaveAsLinks,
  children,
  isScrollable,
  ref,
}: TabListRowProps) => {
  const containerProps = stylex.props(
    styles.container,
    isScrollable ? styles.scrollable : styles.notScrollable,
  );

  if (behaveAsLinks) {
    return (
      <div ref={ref} {...containerProps}>
        {children}
      </div>
    );
  }

  return (
    <Tabs.List
      ref={ref}
      aria-label={ariaLabel}
      activateOnFocus={false}
      render={<div {...containerProps} />}
    >
      {children}
      <Tabs.Indicator />
    </Tabs.List>
  );
};
