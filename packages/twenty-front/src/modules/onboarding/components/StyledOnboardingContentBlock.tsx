import { type ReactNode } from 'react';
import * as stylex from '@stylexjs/stylex';
import { onboardingLayout } from '../constants/onboardingLayout.stylex';

const styles = stylex.create({
  contentBlock: {
    display: 'flex',
    flexDirection: 'column',
    maxWidth: '100%',
    width: onboardingLayout.contentBlockWidth,
  },
});

type StyledOnboardingContentBlockProps = {
  children: ReactNode;
  xstyle?: stylex.StyleXStyles;
};

export const StyledOnboardingContentBlock = ({
  children,
  xstyle,
}: StyledOnboardingContentBlockProps) => (
  <div {...stylex.props(styles.contentBlock, xstyle)}>{children}</div>
);
