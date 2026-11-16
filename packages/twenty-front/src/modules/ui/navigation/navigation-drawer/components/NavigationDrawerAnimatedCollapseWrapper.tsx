import { useIsNavigationDrawerContentExpanded } from '@/ui/navigation/navigation-drawer/hooks/useIsNavigationDrawerContentExpanded';
import * as stylex from '@stylexjs/stylex';
import {
  type AnimationControls,
  motion,
  type TargetAndTransition,
} from 'framer-motion';
import { useTheme } from 'twenty-ui/theme';

const styles = stylex.create({
  container: {
    display: 'block',
  },
});

export const NavigationDrawerAnimatedCollapseWrapper = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const theme = useTheme();
  const isNavigationDrawerExpanded = useIsNavigationDrawerContentExpanded();

  const animate: AnimationControls | TargetAndTransition =
    isNavigationDrawerExpanded
      ? {
          opacity: 1,
          width: 'auto',
          height: 'auto',
          pointerEvents: 'auto',
        }
      : {
          opacity: 0,
          width: 0,
          height: 0,
          pointerEvents: 'none',
        };

  return (
    <motion.span
      inert={!isNavigationDrawerExpanded || undefined}
      initial={false}
      animate={animate}
      transition={{
        duration: theme.animation.duration.normal,
      }}
      {...stylex.props(styles.container)}
    >
      {children}
    </motion.span>
  );
};
