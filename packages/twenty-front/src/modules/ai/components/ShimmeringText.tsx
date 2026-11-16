import * as stylex from '@stylexjs/stylex';
import { fontColor } from 'twenty-ui/theme/tokens.stylex';

const shimmerWave = stylex.keyframes({
  '0%': { backgroundPosition: '200% top' },
  '100%': { backgroundPosition: '-200% top' },
});

const styles = stylex.create({
  root: {
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    animationDuration: '1s',
    animationIterationCount: 'infinite',
    animationName: shimmerWave,
    animationTimingFunction: 'linear',
    backgroundClip: 'text',
    backgroundColor: fontColor['--t-font-color-light'],
    backgroundImage: `linear-gradient(90deg, ${fontColor['--t-font-color-light']} 0%, ${fontColor['--t-font-color-primary']} 50%, ${fontColor['--t-font-color-light']} 100%)`,
    backgroundPosition: '-200% top',
    backgroundRepeat: 'no-repeat',
    backgroundSize: '200% 100%',
  },
});

type ShimmeringTextProps = {
  children: React.ReactNode;
  xstyle?: stylex.StyleXStyles;
};

export const ShimmeringText = ({ children, xstyle }: ShimmeringTextProps) => {
  return <div {...stylex.props(styles.root, xstyle)}>{children}</div>;
};
