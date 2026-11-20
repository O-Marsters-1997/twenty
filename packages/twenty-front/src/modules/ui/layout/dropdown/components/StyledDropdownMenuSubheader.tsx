import * as stylex from '@stylexjs/stylex';
import {
  backgroundTransparent,
  fontColor,
  fontWeight,
  spacing,
} from 'twenty-ui/theme/tokens.stylex';
import { type ReactNode } from 'react';
import { Text } from 'twenty-ui/primitives/typography';

const styles = stylex.create({
  container: {
    paddingBlock: spacing['--t-spacing-1'],
    paddingInline: spacing['--t-spacing-2'],
    backgroundColor:
      backgroundTransparent['--t-background-transparent-lighter'],
    width: '100%',
  },
  label: {
    color: fontColor['--t-font-color-light'],
    fontSize: '11px',
    fontWeight: fontWeight['--t-font-weight-semi-bold'],
  },
});

export const StyledDropdownMenuSubheader = ({
  children,
}: {
  children: ReactNode;
}) => (
  <div {...stylex.props(styles.container)}>
    <Text {...stylex.props(styles.label)}>{children}</Text>
  </div>
);
