import * as stylex from '@stylexjs/stylex';
import { IconArrowDown, IconArrowUp } from 'twenty-ui/icon';

import { useTheme } from 'twenty-ui/theme';
import {
  accent,
  borderColor,
  borderRadius,
  fontColor,
  spacing,
} from 'twenty-ui/theme/tokens.stylex';

type SettingsAccountsMessageAutoCreationIconProps = {
  isSentActive?: boolean;
  isReceivedActive?: boolean;
};

const styles = stylex.create({
  iconContainer: {
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
  directionSkeleton: {
    borderRadius: '1px',
    flex: '1 0 0',
    alignItems: 'center',
    backgroundColor: borderColor['--t-border-color-medium'],
    color: fontColor['--t-font-color-inverted'],
    display: 'flex',
    justifyContent: 'center',
    minHeight: '0',
  },
  directionSkeletonActive: {
    backgroundColor: accent['--t-accent-accent7'],
  },
});

export const SettingsAccountsMessageAutoCreationIcon = ({
  isSentActive,
  isReceivedActive,
}: SettingsAccountsMessageAutoCreationIconProps) => {
  const theme = useTheme();

  return (
    <div {...stylex.props(styles.iconContainer)}>
      <div
        {...stylex.props(
          styles.directionSkeleton,
          isSentActive && styles.directionSkeletonActive,
        )}
      >
        <IconArrowUp size={theme.icon.size.sm} stroke={theme.icon.stroke.md} />
      </div>
      <div
        {...stylex.props(
          styles.directionSkeleton,
          isReceivedActive && styles.directionSkeletonActive,
        )}
      >
        <IconArrowDown
          size={theme.icon.size.sm}
          stroke={theme.icon.stroke.md}
        />
      </div>
    </div>
  );
};
