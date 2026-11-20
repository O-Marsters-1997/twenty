import * as stylex from '@stylexjs/stylex';
import { DeveloperModeSwitchLabel } from '@/navigation/components/DeveloperModeSwitchLabel';
import { DeveloperModeTypingEffect } from '@/navigation/components/DeveloperModeTypingEffect';
import { useDeveloperModeTypingSequence } from '@/navigation/hooks/useDeveloperModeTypingSequence';
import { NAVIGATION_DRAWER_COLLAPSED_BUTTON_SIZE } from '@/ui/navigation/navigation-drawer/constants/NavigationDrawerCollapsedButtonSize';
import { useId } from 'react';
import { isDefined } from 'twenty-shared/utils';
import { IconCode } from 'twenty-ui/icon';
import { Switch } from 'twenty-ui/primitives/input';
import { useTheme } from 'twenty-ui/theme';
import {
  backgroundTransparent,
  borderRadius,
  spacing,
} from 'twenty-ui/theme/tokens.stylex';

const styles = stylex.create({
  container: {
    padding: spacing['--t-spacing-1'],
    borderRadius: borderRadius['--t-border-radius-sm'],
    gap: spacing['--t-spacing-2'],
    alignItems: 'center',
    backgroundColor: {
      default: 'transparent',
      ':hover': backgroundTransparent['--t-background-transparent-light'],
    },
    boxSizing: 'border-box',
    cursor: 'pointer',
    display: 'flex',
    justifyContent: 'flex-start',
    height: spacing['--t-spacing-7'],
    width: '100%',
  },
  compact: {
    padding: 0,
    justifyContent: 'center',
  },
  compactSize: (size: number) => ({
    height: `${size}px`,
    width: `${size}px`,
  }),
});

type DeveloperModeSwitchProps = {
  isEnabled: boolean;
  onEnabledChange: (isEnabled: boolean) => void;
  isCompact?: boolean;
};

export const DeveloperModeSwitch = ({
  isEnabled,
  onEnabledChange,
  isCompact = false,
}: DeveloperModeSwitchProps) => {
  const theme = useTheme();
  const instanceId = useId();
  const {
    label,
    sequence,
    setSequence,
    displayedFrame,
    isTyping,
    playEnterSequence,
    playExitSequence,
  } = useDeveloperModeTypingSequence(isEnabled);

  const handleCheckedChange = (checked: boolean) => {
    onEnabledChange(checked);

    if (checked) {
      playEnterSequence();
      return;
    }

    playExitSequence();
  };

  return (
    <label
      htmlFor={instanceId}
      {...stylex.props(
        styles.container,
        isCompact && styles.compact,
        isCompact &&
          styles.compactSize(NAVIGATION_DRAWER_COLLAPSED_BUTTON_SIZE),
      )}
      title={isCompact ? label : undefined}
    >
      {isDefined(sequence) && (
        <DeveloperModeTypingEffect
          sequence={sequence}
          onSequenceChange={setSequence}
        />
      )}
      {!isCompact && (
        <>
          <IconCode
            size={theme.icon.size.md}
            stroke={theme.icon.stroke.sm}
            color={isEnabled ? theme.accent.accent9 : theme.font.color.tertiary}
          />
          <DeveloperModeSwitchLabel
            label={label}
            frame={displayedFrame}
            isTyping={isTyping}
          />
        </>
      )}
      <Switch
        id={instanceId}
        aria-label={label}
        checked={isEnabled}
        onCheckedChange={handleCheckedChange}
      />
    </label>
  );
};
