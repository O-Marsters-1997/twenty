import { IconGripVertical } from 'twenty-ui/icon';
import { Text } from 'twenty-ui/primitives/typography';
import { useTheme, themeCssVariables } from 'twenty-ui/theme';
import * as stylex from '@stylexjs/stylex';
import { spacing, fontColor, fontWeight } from 'twenty-ui/theme/tokens.stylex';

const styles = stylex.create({
  displayLabel: {
    color: fontColor['--t-font-color-light'],
    fontSize: 11,
    fontWeight: fontWeight['--t-font-weight-semi-bold'],
  },
  container: {
    gap: spacing['--t-spacing-2'],
    alignItems: 'center',
    boxSizing: 'content-box',
    cursor: 'grab',
    display: 'flex',
    height: `calc(32px - 2 * ${spacing['--t-spacing-2']})`,
    paddingBottom: spacing['--t-spacing-2'],
    paddingLeft: spacing['--t-spacing-1'],
    paddingRight: spacing['--t-spacing-1'],
    paddingTop: spacing['--t-spacing-2'],
  },
  iconContainer: {
    alignItems: 'flex-start',
    display: 'flex',
    flexDirection: 'column',
    paddingBottom: spacing['--t-spacing-1'],
    paddingLeft: spacing['--t-spacing-1'],
    paddingRight: spacing['--t-spacing-1'],
    paddingTop: spacing['--t-spacing-1'],
  },
});

type FieldsConfigurationGroupDraggableHeaderProps = {
  text: string;
};

export const FieldsConfigurationGroupDraggableHeader = ({
  text,
}: FieldsConfigurationGroupDraggableHeaderProps) => {
  const theme = useTheme();

  return (
    <div {...stylex.props(styles.container)}>
      <div {...stylex.props(styles.iconContainer)}>
        <IconGripVertical
          size={theme.icon.size.md}
          stroke={theme.icon.stroke.sm}
          color={themeCssVariables.font.color.tertiary}
        />
      </div>
      <Text {...stylex.props(styles.displayLabel)}>{text}</Text>
    </div>
  );
};
