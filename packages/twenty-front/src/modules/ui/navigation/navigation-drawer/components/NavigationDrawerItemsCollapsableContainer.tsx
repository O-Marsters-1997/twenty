import { NAVIGATION_DRAWER_COLLAPSED_BUTTON_SIZE } from '@/ui/navigation/navigation-drawer/constants/NavigationDrawerCollapsedButtonSize';
import { useIsNavigationDrawerContentExpanded } from '@/ui/navigation/navigation-drawer/hooks/useIsNavigationDrawerContentExpanded';
import * as stylex from '@stylexjs/stylex';
import { type ReactNode } from 'react';
import {
  type AnimationControls,
  motion,
  type TargetAndTransition,
} from 'framer-motion';
import { useTheme } from 'twenty-ui/theme';
import {
  animationDuration,
  backgroundTransparent,
  borderRadius,
} from 'twenty-ui/theme/tokens.stylex';

const styles = stylex.create({
  container: {
    backgroundColor: 'transparent',
    borderRadius: 0,
    borderStyle: 'none',
    transitionDuration: `calc(${animationDuration['--t-animation-duration-normal']} * 1s)`,
    transitionProperty: 'background-color',
    transitionTimingFunction: 'ease',
  },
  collapsedGroup: {
    backgroundColor: backgroundTransparent['--t-background-transparent-lighter'],
    borderColor: backgroundTransparent['--t-background-transparent-lighter'],
    borderRadius: borderRadius['--t-border-radius-md'],
    borderStyle: 'solid',
    borderWidth: '1px',
  },
});

type NavigationDrawerItemsCollapsableContainerProps = {
  isGroup?: boolean;
  children: ReactNode;
};

export const NavigationDrawerItemsCollapsableContainer = ({
  isGroup = false,
  children,
}: NavigationDrawerItemsCollapsableContainerProps) => {
  const theme = useTheme();
  const isExpanded = useIsNavigationDrawerContentExpanded();

  const animate: AnimationControls | TargetAndTransition = isExpanded
    ? { width: 'auto' }
    : { width: NAVIGATION_DRAWER_COLLAPSED_BUTTON_SIZE };

  return (
    <motion.div
      initial={false}
      animate={animate}
      transition={{
        duration: theme.animation.duration.normal,
      }}
      {...stylex.props(
        styles.container,
        isGroup && !isExpanded && styles.collapsedGroup,
      )}
    >
      {children}
    </motion.div>
  );
};
