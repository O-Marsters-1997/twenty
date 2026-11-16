import { OnboardingPulsingLogo } from '@/onboarding/components/OnboardingPulsingLogo';
import { type ReactNode } from 'react';
import * as stylex from '@stylexjs/stylex';
import { background } from 'twenty-ui/theme/tokens.stylex';

const styles = stylex.create({
  container: {
    alignItems: 'center',
    background: background['--t-background-secondary'],
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
    justifyContent: 'center',
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
