import { type ReactNode } from 'react';
import * as stylex from '@stylexjs/stylex';
import { fontColor, fontWeight } from 'twenty-ui/theme/tokens.stylex';

const styles = stylex.create({
  emphasis: {
    color: fontColor['--t-font-color-primary'],
    fontWeight: fontWeight['--t-font-weight-medium'],
  },
});

type StyledOnboardingActivationMessageEmphasisProps = {
  children: ReactNode;
};

export const StyledOnboardingActivationMessageEmphasis = ({
  children,
}: StyledOnboardingActivationMessageEmphasisProps) => (
  <span {...stylex.props(styles.emphasis)}>{children}</span>
);
