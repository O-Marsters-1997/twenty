import * as stylex from '@stylexjs/stylex';
import {
  accent,
  background,
  borderColor,
  borderRadius,
  fontColor,
  spacing,
} from 'twenty-ui/theme/tokens.stylex';

type VisibilityElementState = 'active' | 'inactive';

type SettingsAccountsVisibilityIconProps = {
  xstyle?: stylex.StyleXStyles;
  metadata?: VisibilityElementState;
  subject?: VisibilityElementState;
  body?: VisibilityElementState;
};

const styles = stylex.create({
  cardMedia: {
    alignItems: 'stretch',
    borderColor: borderColor['--t-border-color-medium'],
    borderStyle: 'solid',
    borderWidth: '2px',
    borderRadius: borderRadius['--t-border-radius-sm'],
    boxSizing: 'border-box',
    color: fontColor['--t-font-color-light'],
    display: 'flex',
    flexDirection: 'column',
    gap: spacing['--t-spacing-0_5'],
    height: '40px',
    justifyContent: 'center',
    padding: spacing['--t-spacing-0_5'],
    width: '32px',
  },
  skeleton: {
    backgroundColor: background['--t-background-quaternary'],
    borderRadius: '1px',
    height: '3px',
  },
  skeletonActive: {
    backgroundColor: accent['--t-accent-accent7'],
  },
  metadataSkeleton: {
    marginInlineEnd: spacing['--t-spacing-2'],
  },
  bodySkeleton: {
    borderRadius: borderRadius['--t-border-radius-xs'],
    flex: '1 0 auto',
  },
});

export const SettingsAccountsVisibilityIcon = ({
  xstyle,
  metadata,
  subject,
  body,
}: SettingsAccountsVisibilityIconProps) => (
  <div {...stylex.props(styles.cardMedia, xstyle)}>
    {!!metadata && (
      <div
        {...stylex.props(
          styles.skeleton,
          metadata === 'active' && styles.skeletonActive,
          styles.metadataSkeleton,
        )}
      />
    )}
    {!!subject && (
      <div
        {...stylex.props(
          styles.skeleton,
          subject === 'active' && styles.skeletonActive,
        )}
      />
    )}
    {!!body && (
      <div
        {...stylex.props(
          styles.skeleton,
          body === 'active' && styles.skeletonActive,
          styles.bodySkeleton,
        )}
      />
    )}
  </div>
);
