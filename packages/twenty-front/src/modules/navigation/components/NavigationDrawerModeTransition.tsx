import { type ReactNode, useRef } from 'react';

import { NavigationDrawerModeTransitionEffect } from '@/navigation/components/NavigationDrawerModeTransitionEffect';
import * as stylex from '@stylexjs/stylex';

const styles = stylex.create({
  container: {
    flex: '1',
    gap: 'inherit',
    display: 'flex',
    flexDirection: 'column',
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
