import { Separator } from '@/settings/components/Separator';
import {
  StyledSettingsCardContent,
  StyledSettingsCardDescription,
  StyledSettingsCardIcon,
  StyledSettingsCardTextContainer,
  StyledSettingsCardTitle,
} from '@/settings/components/SettingsOptions/SettingsCardContentBase';
import { SettingsOptionIconCustomizer } from '@/settings/components/SettingsOptions/SettingsOptionIconCustomizer';
import * as stylex from '@stylexjs/stylex';
import { isDefined } from 'twenty-shared/utils';
import { OverflowingTextWithTooltip } from 'twenty-ui/primitives/typography';
import { type IconComponent } from 'twenty-ui/icon';
import { spacing } from 'twenty-ui/theme/tokens.stylex';

type SettingsOptionCardContentSelectProps = {
  Icon?: IconComponent;
  LeftComponent?: React.ReactNode;
  title: React.ReactNode;
  description?: string;
  divider?: boolean;
  disabled?: boolean;
  children?: React.ReactNode;
};

export const SettingsOptionCardContentSelect = ({
  Icon,
  LeftComponent,
  title,
  description,
  divider,
  children,
}: SettingsOptionCardContentSelectProps) => {
  return (
    <>
      <StyledSettingsCardContent xstyle={styles.row}>
        {(isDefined(LeftComponent) || isDefined(Icon)) && (
          <StyledSettingsCardIcon>
            {LeftComponent ??
              (Icon && <SettingsOptionIconCustomizer Icon={Icon} />)}
          </StyledSettingsCardIcon>
        )}
        <StyledSettingsCardTextContainer xstyle={styles.text}>
          <StyledSettingsCardTitle>{title}</StyledSettingsCardTitle>
          {description && (
            <StyledSettingsCardDescription>
              <OverflowingTextWithTooltip text={description} />
            </StyledSettingsCardDescription>
          )}
        </StyledSettingsCardTextContainer>
        <div {...stylex.props(styles.container)}>{children}</div>
      </StyledSettingsCardContent>
      {divider && <Separator />}
    </>
  );
};

const NARROW_CONTAINER = '@container settings-select-group (max-width: 520px)';

const styles = stylex.create({
  container: {
    flexShrink: 0,
    justifyContent: 'flex-end',
    marginLeft: 'auto',
    maxWidth: {
      [NARROW_CONTAINER]: '100%',
      default: 'var(--settings-select-control-width, 120px)',
    },
    width: 'var(--settings-select-control-width, auto)',
  },
  row: {
    flexWrap: {
      [NARROW_CONTAINER]: 'wrap',
      default: null,
    },
  },
  text: {
    flexBasis: {
      [NARROW_CONTAINER]: `calc(100% - ${spacing['--t-spacing-8']} - ${spacing['--t-spacing-3']})`,
      default: null,
    },
  },
});
