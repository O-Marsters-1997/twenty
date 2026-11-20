import * as stylex from '@stylexjs/stylex';
import { IconArrowRight, IconGoogle } from 'twenty-ui/icon';
import { themeCssVariables, useTheme } from 'twenty-ui/theme';
import { media } from 'twenty-ui/theme/constants.stylex';
import {
  backgroundTransparent,
  borderColor,
  borderRadius,
  boxShadow,
  spacing,
} from 'twenty-ui/theme/tokens.stylex';

const SYNC_BADGE_LOGO_SIZE = 16;

const arrowIn = stylex.keyframes({
  from: { opacity: 0.3, transform: 'translateX(-6px)' },
  to: { opacity: 1, transform: 'translateX(0)' },
});

const styles = stylex.create({
  badge: {
    padding: spacing['--t-spacing-2'],
    borderColor: backgroundTransparent['--t-background-transparent-lighter'],
    borderRadius: borderRadius['--t-border-radius-md'],
    borderStyle: 'solid',
    gap: spacing['--t-spacing-2'],
    alignItems: 'center',
    backdropFilter: 'blur(20px)',
    backgroundColor:
      backgroundTransparent['--t-background-transparent-secondary'],
    boxShadow: boxShadow['--t-box-shadow-strong'],
    boxSizing: 'border-box',
    display: 'flex',
    position: 'absolute',
    transform: 'translateX(-50%)',
    borderBottomWidth: '1px',
    borderLeftWidth: '0',
    borderRightWidth: '1px',
    borderTopWidth: '1px',
    left: '50%',
    top: '83px',
  },
  arrow: {
    animationDelay: '450ms',
    animationDuration: '800ms',
    animationFillMode: 'both',
    animationName: { default: arrowIn, [media.reducedMotion]: 'none' },
    animationTimingFunction: 'cubic-bezier(0.22, 1, 0.36, 1)',
    display: 'flex',
  },
  divider: {
    alignSelf: 'stretch',
    backgroundColor: borderColor['--t-border-color-medium'],
    width: '1px',
  },
  twentyLogo: {
    borderRadius: borderRadius['--t-border-radius-xs'],
    height: `${SYNC_BADGE_LOGO_SIZE}px`,
    width: `${SYNC_BADGE_LOGO_SIZE}px`,
  },
});

export const OnboardingImportPreviewSyncBadge = () => {
  const theme = useTheme();

  return (
    <div {...stylex.props(styles.badge)}>
      <IconGoogle size={theme.icon.size.md} />
      <div {...stylex.props(styles.divider)} />
      <span {...stylex.props(styles.arrow)}>
        <IconArrowRight
          size={theme.icon.size.md}
          color={themeCssVariables.font.color.tertiary}
        />
      </span>
      <img
        src="/images/integrations/twenty-logo.svg"
        alt=""
        {...stylex.props(styles.twentyLogo)}
      />
    </div>
  );
};
