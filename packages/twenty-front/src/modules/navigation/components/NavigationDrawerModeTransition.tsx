import { type ReactNode, useRef } from 'react';

import { NavigationDrawerModeTransitionEffect } from '@/navigation/components/NavigationDrawerModeTransitionEffect';
import * as stylex from '@stylexjs/stylex';

const styles = stylex.create({
  container: {
    display: 'flex',
    flex: '1',
    flexDirection: 'column',
    gap: 'inherit',
    minHeight: '0',
  },
});

type NavigationDrawerModeTransitionProps = {
  children: ReactNode;
};

export const NavigationDrawerModeTransition = ({
  children,
}: NavigationDrawerModeTransitionProps) => {
  const containerRef = useRef<HTMLDivElement>(null);

  return (
    <div ref={containerRef} {...stylex.props(styles.container)}>
      <NavigationDrawerModeTransitionEffect containerRef={containerRef} />
      {children}
    </div>
  );
};
