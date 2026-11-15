import { Separator } from '@/settings/components/Separator';
import {
  StyledSettingsCardDescription,
  StyledSettingsCardIcon,
  StyledSettingsCardTextContainer,
  StyledSettingsCardTitle,
} from '@/settings/components/SettingsOptions/SettingsCardContentBase';
import { SettingsOptionIconCustomizer } from '@/settings/components/SettingsOptions/SettingsOptionIconCustomizer';
import { useId } from 'react';
import { OverflowingTextWithTooltip } from 'twenty-ui/primitives/typography';
import { type IconComponent } from 'twenty-ui/icon';
import { Switch } from 'twenty-ui/primitives/input';
import {
  background,
  backgroundTransparent,
  color,
  spacing,
} from 'twenty-ui/theme/tokens.stylex';
import * as stylex from '@stylexjs/stylex';

type SettingsOptionCardContentSwitchProps = {
  Icon?: IconComponent;
  title: React.ReactNode;
  description?: string;
  divider?: boolean;
  disabled?: boolean;
  advancedMode?: boolean;
  checked: boolean;
  onChange: (checked: boolean) => void;
};

export const SettingsOptionCardContentSwitch = ({
  Icon,
  title,
  description,
  divider,
  disabled = false,
  advancedMode = false,
  checked,
  onChange,
}: SettingsOptionCardContentSwitchProps) => {
  const switchId = useId();

  return (
    <>
      <div
        {...stylex.props(
          styles.content,
          disabled ? styles.contentDisabled : styles.contentEnabled,
        )}
      >
        {Icon && (
          <StyledSettingsCardIcon>
            <SettingsOptionIconCustomizer Icon={Icon} />
          </StyledSettingsCardIcon>
        )}
        <StyledSettingsCardTextContainer>
          <StyledSettingsCardTitle>
            <label htmlFor={switchId}>
              {title}
              <span {...stylex.props(styles.settingsCardSwitchCover)} />
            </label>
          </StyledSettingsCardTitle>
          {description && (
            <StyledSettingsCardDescription>
              <OverflowingTextWithTooltip text={description} />
            </StyledSettingsCardDescription>
          )}
        </StyledSettingsCardTextContainer>
        <span {...stylex.props(styles.settingsCardSwitchButtonContainer)}>
          <Switch
            id={switchId}
            checked={checked}
            onCheckedChange={onChange}
            disabled={disabled}
            size="sm"
            className={
              stylex.props(advancedMode && styles.advancedSwitch).className
            }
          />
        </span>
      </div>
      {divider && <Separator />}
    </>
  );
};

const styles = stylex.create({
  content: {
    alignItems: 'center',
    backgroundColor: {
      default: background['--t-background-secondary'],
      ':hover': backgroundTransparent['--t-background-transparent-lighter'],
    },
    display: 'flex',
    gap: spacing['--t-spacing-3'],
    padding: spacing['--t-spacing-4'],
    position: 'relative',
  },
  contentEnabled: {
    cursor: 'pointer',
    pointerEvents: 'auto',
  },
  contentDisabled: {
    cursor: 'default',
    pointerEvents: 'none',
  },
  advancedSwitch: {
    color: color['--t-color-yellow'],
  },
  settingsCardSwitchButtonContainer: {
    alignItems: 'center',
    display: 'flex',
    flexShrink: '0',
    marginLeft: 'auto',
  },
  settingsCardSwitchCover: {
    cursor: 'pointer',
    inset: '0',
    position: 'absolute',
  },
});
