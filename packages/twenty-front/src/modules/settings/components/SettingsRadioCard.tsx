import { isNonEmptyString } from '@sniptt/guards';
import { useId } from 'react';
import { Card } from 'twenty-ui/primitives/surfaces';
import { type IconComponent } from 'twenty-ui/icon';
import { Radio } from 'twenty-ui/primitives/input';
import { useTheme } from 'twenty-ui/theme';
import * as stylex from '@stylexjs/stylex';
import {
  backgroundTransparent,
  borderColor,
  borderRadius,
  fontColor,
  fontSize,
  fontWeight,
  spacing,
  textLineHeight,
} from 'twenty-ui/theme/tokens.stylex';

const styles = stylex.create({
  card: {
    borderColor: borderColor['--t-border-color-medium'],
    borderStyle: 'solid',
    borderWidth: '1px',
    gap: spacing['--t-spacing-2'],
    alignItems: 'center',
    backgroundColor: {
      default: null,
      ':hover': backgroundTransparent['--t-background-transparent-lighter'],
    },
    cursor: 'pointer',
    display: 'flex',
    flexGrow: 1,
    borderBottomLeftRadius: borderRadius['--t-border-radius-sm'],
    borderBottomRightRadius: borderRadius['--t-border-radius-sm'],
    borderTopLeftRadius: borderRadius['--t-border-radius-sm'],
    borderTopRightRadius: borderRadius['--t-border-radius-sm'],
    paddingBottom: spacing['--t-spacing-2'],
    paddingLeft: spacing['--t-spacing-2'],
    paddingRight: spacing['--t-spacing-2'],
    paddingTop: spacing['--t-spacing-2'],
  },
  radioContainer: {
    alignItems: 'center',
    display: 'flex',
    marginLeft: 'auto',
    paddingBottom: spacing['--t-spacing-1'],
    paddingLeft: spacing['--t-spacing-1'],
    paddingRight: spacing['--t-spacing-1'],
    paddingTop: spacing['--t-spacing-1'],
  },
  title: {
    color: fontColor['--t-font-color-secondary'],
    fontWeight: fontWeight['--t-font-weight-medium'],
  },
  description: {
    color: fontColor['--t-font-color-tertiary'],
    fontSize: fontSize['--t-font-size-sm'],
    lineHeight: textLineHeight['--t-text-line-height-lg'],
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
    <label>
      <Card.Content {...stylex.props(styles.card)}>
        {Icon && <Icon size={theme.icon.size.xl} color={theme.color.gray10} />}
        <span>
          {title && (
            <div id={titleId} {...stylex.props(styles.title)}>
              {title}
            </div>
          )}
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
    </label>
  );
};
