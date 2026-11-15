import { styled } from '@linaria/react';

import { IconGripVertical } from 'twenty-ui/icon';
import { Text } from 'twenty-ui/primitives/typography';
import { useTheme, themeCssVariables } from 'twenty-ui/theme';
import * as stylex from '@stylexjs/stylex';
import { spacing } from 'twenty-ui/theme/tokens.stylex';

const styles = stylex.create({
  container: {
    alignItems: 'center',
    boxSizing: 'content-box',
    cursor: 'grab',
    display: 'flex',
    gap: spacing['--t-spacing-2'],
    height: `calc(32px - 2 * ${spacing['--t-spacing-2']})`,
    paddingTop: spacing['--t-spacing-2'],
    paddingRight: spacing['--t-spacing-1'],
    paddingBottom: spacing['--t-spacing-2'],
    paddingLeft: spacing['--t-spacing-1'],
  },
  iconContainer: {
    alignItems: 'flex-start',
    display: 'flex',
    flexDirection: 'column',
    paddingTop: spacing['--t-spacing-1'],
    paddingRight: spacing['--t-spacing-1'],
    paddingBottom: spacing['--t-spacing-1'],
    paddingLeft: spacing['--t-spacing-1'],
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
      <StyledDisplayLabel>{text}</StyledDisplayLabel>
    </div>
  );
};

const StyledDisplayLabel = styled(Text)`
  color: var(--t-font-color-light);
  font-size: 11px;
  font-weight: var(--t-font-weight-semi-bold);
`;
