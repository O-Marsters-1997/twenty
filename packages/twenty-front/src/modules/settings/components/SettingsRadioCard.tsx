import { styled } from '@linaria/react';
import { isNonEmptyString } from '@sniptt/guards';
import { useId } from 'react';
import { Card } from 'twenty-ui/primitives/surfaces';
import { type IconComponent } from 'twenty-ui/icon';
import { Radio } from 'twenty-ui/primitives/input';
import { useTheme, themeCssVariables } from 'twenty-ui/theme';
import * as stylex from '@stylexjs/stylex';
import { spacing, font, text } from 'twenty-ui/theme/tokens.stylex';

const StyledRadioCardContentContainer = styled.label`
  > div {
    align-items: center;
    border: 1px solid ${themeCssVariables.border.color.medium};
    border-radius: ${themeCssVariables.border.radius.sm};
    cursor: pointer;
    display: flex;
    flex-grow: 1;
    gap: ${themeCssVariables.spacing[2]};
    padding: ${themeCssVariables.spacing[2]};

    &:hover {
      background: ${themeCssVariables.background.transparent.lighter};
    }
  }
`;

const styles = stylex.create({
  radioContainer: {
    alignItems: 'center',
    display: 'flex',
    marginLeft: 'auto',
    paddingTop: spacing['--t-spacing-1'],
    paddingRight: spacing['--t-spacing-1'],
    paddingBottom: spacing['--t-spacing-1'],
    paddingLeft: spacing['--t-spacing-1'],
  },
  title: {
    color: font['--t-font-color-secondary'],
    fontWeight: font['--t-font-weight-medium'],
  },
  description: {
    color: font['--t-font-color-tertiary'],
    fontSize: font['--t-font-size-sm'],
    lineHeight: text['--t-text-line-height-lg'],
  },
});

type SettingsRadioCardProps = {
  value: string;
  title: string;
  description?: string;
  Icon?: IconComponent;
};

export const SettingsRadioCard = ({
  value,
  title,
  description,
  Icon,
}: SettingsRadioCardProps) => {
  const titleId = useId();
  const descriptionId = useId();
  const theme = useTheme();
  const hasDescription = isNonEmptyString(description);

  return (
    <StyledRadioCardContentContainer>
      <Card.Content>
        {Icon && <Icon size={theme.icon.size.xl} color={theme.color.gray10} />}
        <span>
          {title && <div id={titleId} {...stylex.props(styles.title)}>{title}</div>}
          {hasDescription && (
            <div id={descriptionId} {...stylex.props(styles.description)}>
              {description}
            </div>
          )}
        </span>
        <span {...stylex.props(styles.radioContainer)}>
          <Radio
            value={value}
            aria-labelledby={titleId}
            aria-describedby={hasDescription ? descriptionId : undefined}
          />
        </span>
      </Card.Content>
    </StyledRadioCardContentContainer>
  );
};
