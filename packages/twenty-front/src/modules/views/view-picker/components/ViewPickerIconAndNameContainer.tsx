import * as stylex from '@stylexjs/stylex';
import { type ComponentProps } from 'react';
import { spacing } from 'twenty-ui/theme/tokens.stylex';

const styles = stylex.create({
  root: {
    gap: spacing['--t-spacing-1'],
    alignItems: 'center',
    display: 'flex',
    marginLeft: spacing['--t-spacing-1'],
    marginRight: spacing['--t-spacing-1'],
  },
});

export const ViewPickerIconAndNameContainer = (
  props: ViewPickerIconAndNameContainerProps<'div'>,
) => <div {...props} {...stylex.props(styles.root)} />;
