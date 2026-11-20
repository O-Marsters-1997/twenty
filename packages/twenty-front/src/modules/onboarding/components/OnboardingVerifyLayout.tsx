import { OnboardingPulsingLogo } from '@/onboarding/components/OnboardingPulsingLogo';
import { type ReactNode } from 'react';
import * as stylex from '@stylexjs/stylex';
import { background } from 'twenty-ui/theme/tokens.stylex';

const styles = stylex.create({
  container: {
    background: background['--t-background-secondary'],
    alignItems: 'center',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    height: '100%',
    width: '100%',
  },
});

type OnboardingVerifyLayoutProps = {
  children: ReactNode;
};

export const OnboardingVerifyLayout = ({
  children,
}: OnboardingVerifyLayoutProps) => (
  <div {...stylex.props(styles.container)}>
    <OnboardingPulsingLogo />
    {children}
  </div>
);
