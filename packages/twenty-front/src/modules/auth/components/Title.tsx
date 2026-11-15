import { fontColor, fontSize, fontWeight, spacing } from 'twenty-ui/theme/tokens.stylex';
import * as stylex from '@stylexjs/stylex';
import { AnimatedEaseIn } from '@/auth/components/internal/AnimatedEaseIn/AnimatedEaseIn';
import React from 'react';

type TitleProps = React.PropsWithChildren & {
  animate?: boolean;
  noMarginTop?: boolean;
};

const styles = stylex.create({
  title: {
    color: fontColor['--t-font-color-primary'],
    fontSize: fontSize['--t-font-size-xl'],
    fontWeight: fontWeight['--t-font-weight-semi-bold'],
    marginBottom: spacing['--t-spacing-4'],
    marginTop: spacing['--t-spacing-4'],
    textAlign: 'center',
  },
  titleNoMarginTop: {
    marginTop: 0,
  },
});

export const Title = ({
  children,
  animate = false,
  noMarginTop = false,
}: TitleProps) => {
  if (animate) {
    return (
      <div {...stylex.props(styles.title, noMarginTop && styles.titleNoMarginTop)}>
        <AnimatedEaseIn>{children}</AnimatedEaseIn>
      </div>
    );
  }

  return <div {...stylex.props(styles.title, noMarginTop && styles.titleNoMarginTop)}>{children}</div>;
};
