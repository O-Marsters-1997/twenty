import { type ReactNode } from 'react';
import * as stylex from '@stylexjs/stylex';
import { spacing } from 'twenty-ui/theme/tokens.stylex';
import { StyledOnboardingContentBlock } from '@/onboarding/components/StyledOnboardingContentBlock';

const styles = stylex.create({
  heading: {
    gap: spacing['--t-spacing-4'],
  },
});

type StyledOnboardingStepHeadingProps = {
  children: ReactNode;
};

export const StyledOnboardingStepHeading = ({
  children,
}: StyledOnboardingStepHeadingProps) => (
  <StyledOnboardingContentBlock xstyle={styles.heading}>
    {children}
  </StyledOnboardingContentBlock>
);
