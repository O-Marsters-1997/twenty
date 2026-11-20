import { SkeletonLine } from '@/ui/feedback/skeleton/components/SkeletonLine';
import * as stylex from '@stylexjs/stylex';
import { motion } from 'framer-motion';
import { SKELETON_HEIGHT_SIZES } from 'twenty-ui/primitives/feedback';

import { NAVIGATION_DRAWER_CONSTRAINTS } from '@/ui/navigation/navigation-drawer/constants/NavigationDrawerConstraints';
import { useIsMobile } from 'twenty-ui/utilities';
import { MainNavigationDrawerItemsSkeletonLoader } from '~/loading/components/MainNavigationDrawerItemsSkeletonLoader';
import { useTheme, themeCssVariables } from 'twenty-ui/theme';
import { spacing } from 'twenty-ui/theme/tokens.stylex';

export const LeftPanelSkeletonLoader = () => {
  const theme = useTheme();
  const isMobile = useIsMobile();
  return (
    <motion.div
      {...stylex.props(styles.animatedContainer)}
      initial={false}
      animate={{
        width: isMobile ? 0 : NAVIGATION_DRAWER_CONSTRAINTS.default,
        opacity: isMobile ? 0 : 1,
      }}
      transition={{
        duration: theme.animation.duration.fast,
      }}
    >
      <div {...stylex.props(styles.itemsContainer)}>
        <div {...stylex.props(styles.skeletonTitleContainer)}>
          <SkeletonLine
            width={96}
            height={SKELETON_HEIGHT_SIZES.s}
            baseColor={themeCssVariables.background.quaternary}
          />
        </div>
        <div {...stylex.props(styles.skeletonContainer)}>
          <MainNavigationDrawerItemsSkeletonLoader length={3} />
          <MainNavigationDrawerItemsSkeletonLoader title length={2} />
          <MainNavigationDrawerItemsSkeletonLoader title length={3} />
        </div>
      </div>
    </motion.div>
  );
};

const styles = stylex.create({
  animatedContainer: {
    overflow: 'hidden',
    boxSizing: 'border-box',
    display: 'flex',
    flexDirection: 'column',
    flexShrink: 0,
    height: '100%',
    paddingBottom: spacing['--t-spacing-4'],
    paddingLeft: spacing['--t-spacing-2'],
    paddingRight: 0,
    paddingTop: spacing['--t-spacing-2'],
  },
  itemsContainer: {
    gap: 14,
    display: 'flex',
    flexDirection: 'column',
    minHeight: 0,
    overflowY: 'auto',
    width: '100%',
  },
  skeletonContainer: {
    gap: 32,
    display: 'flex',
    flexDirection: 'column',
    width: '100%',
  },
  skeletonTitleContainer: {
    gap: 10,
    alignItems: 'flex-start',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    height: 32,
    width: '100%',
  },
});
