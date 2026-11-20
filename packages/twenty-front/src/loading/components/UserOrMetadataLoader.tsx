import * as stylex from '@stylexjs/stylex';

import { NAVIGATION_DRAWER_CONSTRAINTS } from '@/ui/navigation/navigation-drawer/constants/NavigationDrawerConstraints';
import { background } from 'twenty-ui/theme/tokens.stylex';
import { LeftPanelSkeletonLoader } from '~/loading/components/LeftPanelSkeletonLoader';
import { PageContentSkeletonLoader } from '~/loading/components/PageContentSkeletonLoader';

export const UserOrMetadataLoader = () => {
  return (
    <div
      {...stylex.props(
        styles.container,
        styles.minWidth(NAVIGATION_DRAWER_CONSTRAINTS.default),
      )}
    >
      <div {...stylex.props(styles.leftPanelWrapper)}>
        <LeftPanelSkeletonLoader />
      </div>
      <PageContentSkeletonLoader />
    </div>
  );
};

const styles = stylex.create({
  container: {
    overflow: 'hidden',
    backgroundColor: background['--t-background-tertiary'],
    boxSizing: 'border-box',
    display: 'flex',
    flexDirection: 'row',
    height: 'calc(100dvh / var(--t-zoom, 1))',
    width: '100%',
  },
  minWidth: (minWidth: number) => ({ minWidth }),
  leftPanelWrapper: {
    flexShrink: 0,
  },
});
