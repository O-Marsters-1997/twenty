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
    boxSizing: 'border-box',
    display: 'flex',
    flexDirection: 'column',
    flexShrink: 0,
    height: '100%',
    overflow: 'hidden',
    paddingBottom: spacing['--t-spacing-4'],
    paddingLeft: spacing['--t-spacing-2'],
    paddingRight: 0,
    paddingTop: spacing['--t-spacing-2'],
  },
  itemsContainer: {
    display: 'flex',
    flexDirection: 'column',
    gap: 14,
    minHeight: 0,
    overflowY: 'auto',
    width: '100%',
  },
  skeletonContainer: {
    display: 'flex',
    flexDirection: 'column',
    gap: 32,
    width: '100%',
  },
  skeletonTitleContainer: {
    alignItems: 'flex-start',
    display: 'flex',
    flexDirection: 'column',
    gap: 10,
    height: 32,
    justifyContent: 'center',
    width: '100%',
  },
});
