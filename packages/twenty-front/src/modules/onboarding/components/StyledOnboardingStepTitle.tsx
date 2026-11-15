import { type ReactNode } from 'react';
import * as stylex from '@stylexjs/stylex';
import { fontColor, fontSize, fontWeight } from 'twenty-ui/theme/tokens.stylex';

const styles = stylex.create({
  title: {
    color: fontColor['--t-font-color-primary'],
    fontSize: fontSize['--t-font-size-xl'],
    fontWeight: fontWeight['--t-font-weight-semi-bold'],
    lineHeight: '1.2',
    margin: '0',
  },
});

type StyledOnboardingStepTitleProps = {
  children: ReactNode;
};

export const StyledOnboardingStepTitle = ({
  children,
}: StyledOnboardingStepTitleProps) => (
  <h1 {...stylex.props(styles.title)}>{children}</h1>
);
