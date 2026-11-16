import { type JsonNodeHighlighting } from '@ui/components/data-display/JsonTree/types/JsonNodeHighlighting';
import { type IconComponent } from '@ui/icon';
import { useTheme } from '@ui/theme';
import * as stylex from '@stylexjs/stylex';

import {
  background,
  backgroundTransparent,
  borderColor,
  borderRadius,
  color,
  fontColor,
  fontSize,
  spacing,
} from '../../../../theme/tokens.stylex';

export const JsonNodeLabel = ({
  label,
  Icon,
  highlighting,
}: {
  label: string;
  Icon: IconComponent;
  highlighting?: JsonNodeHighlighting | undefined;
}) => {
  const theme = useTheme();

  return (
    <span
      {...stylex.props(
        styles.labelContainer,
        highlighting === 'blue' && styles.blue,
        highlighting === 'red' && styles.red,
      )}
    >
      <Icon
        size={theme.icon.size.md}
        color={
          highlighting === 'blue'
            ? theme.color.blue
            : highlighting === 'red'
              ? theme.font.color.danger
              : theme.font.color.tertiary
        }
      />

      <span {...stylex.props(styles.text)}>{label}</span>
    </span>
  );
};

const styles = stylex.create({
  labelContainer: {
    alignItems: 'center',
    backgroundColor:
      backgroundTransparent['--t-background-transparent-lighter'],
    borderColor: borderColor['--t-border-color-medium'],
    borderRadius: borderRadius['--t-border-radius-sm'],
    borderStyle: 'solid',
    borderWidth: 1,
    boxSizing: 'border-box',
    color: fontColor['--t-font-color-primary'],
    columnGap: spacing['--t-spacing-2'],
    display: 'inline-flex',
    fontSize: fontSize['--t-font-size-md'],
    height: 24,
    paddingInline: spacing['--t-spacing-2'],
    whiteSpace: 'nowrap',
  },
  text: {
    alignItems: 'center',
    display: 'inline-flex',
    lineHeight: 1,
  },
  blue: {
    backgroundColor: color['--t-color-blue3'],
    borderColor: color['--t-color-blue5'],
    color: color['--t-color-blue'],
  },
  red: {
    backgroundColor: background['--t-background-danger'],
    borderColor: borderColor['--t-border-color-danger'],
    color: fontColor['--t-font-color-danger'],
  },
});
