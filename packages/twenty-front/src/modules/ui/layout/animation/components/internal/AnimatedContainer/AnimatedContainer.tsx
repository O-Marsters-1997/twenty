import * as stylex from '@stylexjs/stylex';
import { animationDuration } from 'twenty-ui/theme/tokens.stylex';

const fadeIn = stylex.keyframes({
  from: { opacity: 0 },
  to: { opacity: 1 },
});

const styles = stylex.create({
  container: {
    animationDuration: `calc(${animationDuration['--t-animation-duration-fast']} * 1s)`,
    animationName: fadeIn,
    animationTimingFunction: 'ease',
    transform: {
      default: null,
      ':hover': 'scale(1.04)',
    },
    transitionDuration: `calc(${animationDuration['--t-animation-duration-fast']} * 1s)`,
    transitionProperty: 'transform',
    transitionTimingFunction: 'ease',
  },
});

export const AnimatedContainer = ({
  children,
}: {
  children: React.ReactNode;
}) => <div {...stylex.props(styles.container)}>{children}</div>;
