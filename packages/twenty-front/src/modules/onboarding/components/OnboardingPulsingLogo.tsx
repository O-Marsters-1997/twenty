import * as stylex from '@stylexjs/stylex';
import { media } from 'twenty-ui/theme/constants.stylex';
import { spacing } from 'twenty-ui/theme/tokens.stylex';

const pulse = stylex.keyframes({
  from: { opacity: 1 },
  to: { opacity: 0.4 },
});

const styles = stylex.create({
  logo: {
    animationDirection: 'alternate',
    animationDuration: '0.8s',
    animationIterationCount: 'infinite',
    animationName: { default: pulse, [media.reducedMotion]: 'none' },
    animationTimingFunction: 'ease-in-out',
    height: spacing['--t-spacing-12'],
    marginBottom: spacing['--t-spacing-8'],
    width: spacing['--t-spacing-12'],
  },
});

export const OnboardingPulsingLogo = () => (
  <img
    src="/images/integrations/twenty-logo.svg"
    alt=""
    {...stylex.props(styles.logo)}
  />
);
