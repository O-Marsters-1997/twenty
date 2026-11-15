import { isOnOnboardingVerifyPath } from '@/auth/utils/isOnOnboardingVerifyPath';
import { OnboardingPulsingLogo } from '@/onboarding/components/OnboardingPulsingLogo';
import * as stylex from '@stylexjs/stylex';
import { background } from 'twenty-ui/theme/tokens.stylex';

const styles = stylex.create({
  container: {
    alignItems: 'center',
    background: background['--t-background-secondary'],
    display: 'flex',
    flexDirection: 'column',
    height: 'calc(100dvh / var(--t-zoom, 1))',
    justifyContent: 'center',
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
