import * as stylex from '@stylexjs/stylex';
import { type ComponentProps } from 'react';
import { spacing } from 'twenty-ui/theme/tokens.stylex';

const styles = stylex.create({
  root: {
    display: 'flex',
    padding: spacing['--t-spacing-1'],
    width: '100%',
  },
});

export const ViewPickerSaveButtonContainer = (props: ComponentProps<'div'>) => (
  <div {...props} {...stylex.props(styles.root)} />
);
