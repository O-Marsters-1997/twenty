import { type ReactNode } from 'react';
import * as stylex from '@stylexjs/stylex';
import { fontColor, fontSize } from 'twenty-ui/theme/tokens.stylex';

const styles = stylex.create({
  subtitle: {
    color: fontColor['--t-font-color-secondary'],
    fontSize: fontSize['--t-font-size-md'],
    lineHeight: '1.4',
    margin: '0',
  },
});

type StyledOnboardingStepSubtitleProps = {
  children: ReactNode;
  xstyle?: stylex.StyleXStyles;
};

export const StyledOnboardingStepSubtitle = ({
  children,
  xstyle,
}: StyledOnboardingStepSubtitleProps) => (
  <p {...stylex.props(styles.subtitle, xstyle)}>{children}</p>
);
