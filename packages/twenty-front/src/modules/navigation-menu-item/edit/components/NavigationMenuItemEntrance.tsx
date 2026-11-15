import * as stylex from '@stylexjs/stylex';
import { motion, useReducedMotion } from 'framer-motion';
import { type ReactNode } from 'react';
import { useTheme } from 'twenty-ui/theme';

const styles = stylex.create({
  container: { overflow: 'hidden' },
});

type NavigationMenuItemEntranceProps = {
  children: ReactNode;
};

export const NavigationMenuItemEntrance = ({
  children,
}: NavigationMenuItemEntranceProps) => {
  const theme = useTheme();
  const shouldReduceMotion = useReducedMotion();

  return (
    <motion.div
      {...stylex.props(styles.container)}
      initial={shouldReduceMotion ? false : { height: 0, opacity: 0 }}
      animate={{ height: 'auto', opacity: 1 }}
      transition={{
        duration: shouldReduceMotion ? 0 : theme.animation.duration.normal,
      }}
    >
      {children}
    </motion.div>
  );
};
