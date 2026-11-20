import * as stylex from '@stylexjs/stylex';
import { type ComponentProps } from 'react';
import { fontColor, spacing } from 'twenty-ui/theme/tokens.stylex';

const styles = stylex.create({
  root: {
    margin: spacing['--t-spacing-1'],
    color: fontColor['--t-font-color-light'],
    display: 'flex',
    userSelect: 'none',
    width: `calc(100% - ${spacing['--t-spacing-2']})`,
  },
});

export const ViewPickerSelectContainer = (
  props: ViewPickerSelectContainerProps<'div'>,
) => <div {...props} {...stylex.props(styles.root)} />;
