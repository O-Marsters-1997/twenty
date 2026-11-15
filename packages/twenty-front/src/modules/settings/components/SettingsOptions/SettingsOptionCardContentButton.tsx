import {
  StyledSettingsCardContent,
  StyledSettingsCardDescription,
  StyledSettingsCardIcon,
  StyledSettingsCardTextContainer,
  StyledSettingsCardTitle,
} from '@/settings/components/SettingsOptions/SettingsCardContentBase';
import { SettingsOptionIconCustomizer } from '@/settings/components/SettingsOptions/SettingsOptionIconCustomizer';
import { isDefined } from 'twenty-shared/utils';
import { OverflowingTextWithTooltip } from 'twenty-ui/primitives/typography';
import { type IconComponent } from 'twenty-ui/icon';
import * as stylex from '@stylexjs/stylex';

type SettingsOptionCardContentButtonProps = {
  Icon?: IconComponent;
  title: React.ReactNode;
  description?: string;
  disabled?: boolean;
  Button?: React.ReactNode;
};

const styles = stylex.create({
  buttonContainer: {
    flexShrink: '0',
    marginLeft: 'auto',
  },
});

export const SettingsOptionCardContentButton = ({
  Icon,
  title,
  description,
  disabled = false,
  Button,
}: SettingsOptionCardContentButtonProps) => {
  return (
    <StyledSettingsCardContent disabled={disabled}>
      {Icon && (
        <StyledSettingsCardIcon>
          <SettingsOptionIconCustomizer Icon={Icon} />
        </StyledSettingsCardIcon>
      )}
      <StyledSettingsCardTextContainer>
        <StyledSettingsCardTitle>{title}</StyledSettingsCardTitle>
        {description && (
          <StyledSettingsCardDescription>
            <OverflowingTextWithTooltip text={description} />
          </StyledSettingsCardDescription>
        )}
      </StyledSettingsCardTextContainer>
      {isDefined(Button) && (
        <div {...stylex.props(styles.buttonContainer)}>{Button}</div>
      )}
    </StyledSettingsCardContent>
  );
};
