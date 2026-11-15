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
  directionSkeleton: {
    alignItems: 'center',
    backgroundColor: borderColor['--t-border-color-medium'],
    borderRadius: '1px',
    color: fontColor['--t-font-color-inverted'],
    display: 'flex',
    flex: '1 0 0',
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
