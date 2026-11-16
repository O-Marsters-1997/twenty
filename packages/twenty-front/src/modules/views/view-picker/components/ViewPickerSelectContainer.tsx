import * as stylex from '@stylexjs/stylex';
import { type ComponentProps } from 'react';
import { fontColor, spacing } from 'twenty-ui/theme/tokens.stylex';

const styles = stylex.create({
  root: {
    color: fontColor['--t-font-color-light'],
    display: 'flex',
    margin: spacing['--t-spacing-1'],
    userSelect: 'none',
    width: `calc(100% - ${spacing['--t-spacing-2']})`,
  },
});

export const ViewPickerSelectContainer = (props: ComponentProps<'div'>) => (
  <div {...props} {...stylex.props(styles.root)} />
);
