import * as stylex from '@stylexjs/stylex';
import { useTheme } from 'twenty-ui/theme';

const drawCheckmark = stylex.keyframes({
  from: { strokeDashoffset: 1 },
  to: { strokeDashoffset: 0 },
});

const styles = stylex.create({
  animatedPath: (duration: number) => ({
    animationDuration: `${duration}s`,
    animationFillMode: 'forwards',
    animationName: drawCheckmark,
    animationTimingFunction: 'ease',
  }),
});

export type AnimatedCheckmarkProps = {
  isAnimating?: boolean;
  color?: string;
  duration?: number;
  size?: number;
};

export const AnimatedCheckmark = ({
  isAnimating = false,
  color,
  duration = 0.5,
  size = 28,
}: AnimatedCheckmarkProps) => {
  const theme = useTheme();

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 52 52"
      width={size}
      height={size}
    >
      <path
        {...stylex.props(isAnimating && styles.animatedPath(duration))}
        fill="none"
        stroke={color ?? theme.grayScale.gray1}
        strokeWidth={4}
        d="M14 27l7.8 7.8L38 14"
        pathLength="1"
        strokeDasharray="1"
        strokeDashoffset={isAnimating ? 0 : 1}
      />
    </svg>
  );
};
