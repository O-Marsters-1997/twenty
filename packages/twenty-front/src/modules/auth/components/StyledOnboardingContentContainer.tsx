import * as stylex from '@stylexjs/stylex';
import { type ReactNode } from 'react';
import { spacing } from 'twenty-ui/theme/tokens.stylex';

import { onboardingLayout } from '../../onboarding/constants/onboardingLayout.stylex';

const styles = stylex.create({
  root: {
    marginBottom: spacing['--t-spacing-8'],
    marginTop: spacing['--t-spacing-4'],
    maxWidth: '100%',
    width: onboardingLayout.contentBlockWidth,
  },
});

export const StyledOnboardingContentContainer = ({
  children,
}: {
  children: ReactNode;
}) => <div {...stylex.props(styles.root)}>{children}</div>;
