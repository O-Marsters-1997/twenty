import { Separator } from '@/settings/components/Separator';
import {
  StyledSettingsCardDescription,
  StyledSettingsCardIcon,
  StyledSettingsCardTextContainer,
  StyledSettingsCardTitle,
} from '@/settings/components/SettingsOptions/SettingsCardContentBase';
import { SettingsOptionIconCustomizer } from '@/settings/components/SettingsOptions/SettingsOptionIconCustomizer';
import { styled } from '@linaria/react';
import { useId } from 'react';
import { OverflowingTextWithTooltip } from 'twenty-ui/primitives/typography';
import { type IconComponent } from 'twenty-ui/icon';
import { Switch } from 'twenty-ui/primitives/input';
import { themeCssVariables } from 'twenty-ui/theme';
import * as stylex from '@stylexjs/stylex';

const StyledSwitch = styled(Switch)`
  &[data-advanced-mode] {
    color: ${themeCssVariables.color.yellow};
  }
`;

const StyledSettingsCardSwitchContent = styled.div<{ disabled?: boolean }>`
  align-items: center;
  background-color: ${themeCssVariables.background.secondary};
  cursor: ${({ disabled }) => (disabled ? 'default' : 'pointer')};
  display: flex;
  gap: ${themeCssVariables.spacing[3]};
  padding: ${themeCssVariables.spacing[4]};
  pointer-events: ${({ disabled }) => (disabled ? 'none' : 'auto')};
  position: relative;

  &:hover {
    background: ${themeCssVariables.background.transparent.lighter};
  }
`;

const styles = stylex.create({
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
      <StyledSettingsCardSwitchContent disabled={disabled}>
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
          <StyledSwitch
            id={switchId}
            checked={checked}
            onCheckedChange={onChange}
            disabled={disabled}
            size="sm"
            data-advanced-mode={advancedMode || undefined}
          />
        </span>
      </StyledSettingsCardSwitchContent>
      {divider && <Separator />}
    </>
  );
};
