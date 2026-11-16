import * as stylex from '@stylexjs/stylex';
import { type JSX } from 'react';

import { type AnimationDuration } from 'twenty-ui/theme';
import { animationDuration } from 'twenty-ui/theme/tokens.stylex';

const rotateIn = stylex.keyframes({
  from: { opacity: 0, transform: 'rotate(-90deg)' },
  to: { opacity: 1, transform: 'rotate(0deg)' },
});

const styles = stylex.create({
  container: {
    alignItems: 'center',
    animationName: rotateIn,
    animationTimingFunction: 'ease',
    display: 'flex',
    justifyContent: 'center',
  },
  instant: {
    animationDuration: `calc(${animationDuration['--t-animation-duration-instant']} * 1s)`,
  },
  fast: {
    animationDuration: `calc(${animationDuration['--t-animation-duration-fast']} * 1s)`,
  },
  normal: {
    animationDuration: `calc(${animationDuration['--t-animation-duration-normal']} * 1s)`,
  },
  slow: {
    animationDuration: `calc(${animationDuration['--t-animation-duration-slow']} * 1s)`,
  },
  animateOnHover: {
    transform: { default: null, ':hover': 'rotate(45deg)' },
    transitionDuration: `calc(${animationDuration['--t-animation-duration-fast']} * 1s)`,
    transitionProperty: 'transform',
    transitionTimingFunction: 'ease',
  },
});

type AnimatedRotateProps = {
  children?: React.ReactNode;
  duration?: AnimationDuration;
  animateOnHover?: boolean;
};

export const AnimatedRotate = ({
  children,
  duration = 'fast',
  animateOnHover,
}: AnimatedRotateProps): JSX.Element => (
  <div
    {...stylex.props(
      styles.container,
      styles[duration],
      animateOnHover && styles.animateOnHover,
    )}
  >
    {children}
  </div>
);
