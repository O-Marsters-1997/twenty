import { NAVIGATION_DRAWER_COLLAPSED_BUTTON_SIZE } from '@/ui/navigation/navigation-drawer/constants/NavigationDrawerCollapsedButtonSize';
import { useLingui } from '@lingui/react/macro';
import { isNonEmptyString } from '@sniptt/guards';
import { useId } from 'react';
import { Switch } from 'twenty-ui/primitives/input';
import * as stylex from '@stylexjs/stylex';
import {
  color,
  fontColor,
  fontSize,
  fontWeight,
  spacing,
} from 'twenty-ui/theme/tokens.stylex';

const styles = stylex.create({
  container: {
    paddingBlock: spacing['--t-spacing-1'],
    paddingInline: spacing['--t-spacing-1'],
    alignItems: 'center',
    boxSizing: 'border-box',
    cursor: 'pointer',
    display: 'flex',
    justifyContent: 'space-between',
    height: spacing['--t-spacing-5'],
    width: '100%',
  },
  compact: (size: number) => ({
    paddingBlock: 0,
    paddingInline: 0,
    justifyContent: 'center',
    height: size,
    width: size,
  }),
  text: {
    color: fontColor['--t-font-color-secondary'],
    fontSize: fontSize['--t-font-size-sm'],
    fontWeight: fontWeight['--t-font-weight-medium'],
  },
  switch: {
    color: color['--t-color-yellow'],
  },
});

type AdvancedSettingsSwitchProps = {
  isAdvancedModeEnabled: boolean;
  setIsAdvancedModeEnabled: (enabled: boolean) => void;
  label?: string;
  className?: string;
  isCompact?: boolean;
};

export const AdvancedSettingsSwitch = ({
  isAdvancedModeEnabled,
  setIsAdvancedModeEnabled,
  label,
  className,
  isCompact = false,
}: AdvancedSettingsSwitchProps) => {
  const { t } = useLingui();
  const onChange = (newValue: boolean) => {
    setIsAdvancedModeEnabled(newValue);
  };
  const instanceId = useId();
  const labelId = `${instanceId}-text`;
  const switchLabel = label ?? t`Advanced`;

  const { className: containerClassName } = stylex.props(
    styles.container,
    isCompact && styles.compact(NAVIGATION_DRAWER_COLLAPSED_BUTTON_SIZE),
  );

  return (
    <label
      className={[containerClassName, className]
        .filter(isNonEmptyString)
        .join(' ')}
      htmlFor={instanceId}
      title={isCompact ? switchLabel : undefined}
    >
      {!isCompact && (
        <div id={labelId} {...stylex.props(styles.text)}>
          {switchLabel}
        </div>
      )}
      <Switch
        className={stylex.props(styles.switch).className}
        id={instanceId}
        aria-label={isCompact ? switchLabel : undefined}
        aria-labelledby={isCompact ? undefined : labelId}
        onCheckedChange={onChange}
        checked={isAdvancedModeEnabled}
      />
    </label>
  );
};
