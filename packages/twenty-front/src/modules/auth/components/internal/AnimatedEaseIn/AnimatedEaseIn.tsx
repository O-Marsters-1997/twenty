import * as stylex from '@stylexjs/stylex';
import { type AnimationDuration } from 'twenty-ui/theme';
import { animationDuration } from 'twenty-ui/theme/tokens.stylex';

const fadeIn = stylex.keyframes({
  from: { opacity: 0 },
  to: { opacity: 1 },
});

const styles = stylex.create({
  fadeIn: {
    animationName: fadeIn,
    animationTimingFunction: 'linear',
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
});

type AnimatedEaseInProps = {
  children?: React.ReactNode;
  duration?: AnimationDuration;
};

export const AnimatedEaseIn = ({
  children,
  duration = 'normal',
}: AnimatedEaseInProps) => (
  <div {...stylex.props(styles.fadeIn, styles[duration])}>{children}</div>
);
