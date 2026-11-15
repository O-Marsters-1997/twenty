import * as stylex from '@stylexjs/stylex';
import { animationDuration } from 'twenty-ui/theme/tokens.stylex';

const spin = stylex.keyframes({
  from: { transform: 'rotate(0deg)' },
  to: { transform: 'rotate(360deg)' },
});

const styles = stylex.create({
  container: {
    alignItems: 'center',
    animationDuration: `calc(${animationDuration['--t-animation-duration-slow']} * 1s)`,
    animationIterationCount: 'infinite',
    animationName: spin,
    animationTimingFunction: 'ease-in-out',
    display: 'flex',
    justifyContent: 'center',
  },
});

export const AnimatedCircleLoading = ({
  children,
}: {
  children: React.ReactNode;
}) => <div {...stylex.props(styles.container)}>{children}</div>;
