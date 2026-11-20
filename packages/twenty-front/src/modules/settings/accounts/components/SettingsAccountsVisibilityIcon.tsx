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
    padding: spacing['--t-spacing-0_5'],
    borderColor: borderColor['--t-border-color-medium'],
    borderRadius: borderRadius['--t-border-radius-sm'],
    borderStyle: 'solid',
    borderWidth: '2px',
    gap: spacing['--t-spacing-0_5'],
    alignItems: 'stretch',
    boxSizing: 'border-box',
    color: fontColor['--t-font-color-light'],
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    height: '40px',
    width: '32px',
  },
  skeleton: {
    borderRadius: '1px',
    backgroundColor: background['--t-background-quaternary'],
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
    flexBasis: 'auto',
    flexGrow: '1',
    flexShrink: '0',
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
