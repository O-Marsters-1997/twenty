import { isOnOnboardingVerifyPath } from '@/auth/utils/isOnOnboardingVerifyPath';
import { OnboardingPulsingLogo } from '@/onboarding/components/OnboardingPulsingLogo';
import * as stylex from '@stylexjs/stylex';
import { background } from 'twenty-ui/theme/tokens.stylex';

const styles = stylex.create({
  container: {
    background: background['--t-background-secondary'],
    alignItems: 'center',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    height: 'calc(100dvh / var(--t-zoom, 1))',
    width: '100%',
  },
});

// No logo: the verify screen renders its own, which would flash twice on cold boot.
export const OnboardingPageLoader = () => (
  <div {...stylex.props(styles.container)}>
    {!isOnOnboardingVerifyPath(window.location.pathname) && (
      <OnboardingPulsingLogo />
    )}
  </div>
);
