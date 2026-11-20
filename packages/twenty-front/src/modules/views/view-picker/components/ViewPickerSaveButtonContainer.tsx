import * as stylex from '@stylexjs/stylex';
import { type ComponentProps } from 'react';
import { spacing } from 'twenty-ui/theme/tokens.stylex';

const styles = stylex.create({
  root: {
    padding: spacing['--t-spacing-1'],
    display: 'flex',
    width: '100%',
  },
});

type ViewPickerSaveButtonContainerProps = ComponentProps<'div'>;

export const ViewPickerSaveButtonContainer = (
  props: ViewPickerSaveButtonContainerProps,
) => <div {...props} {...stylex.props(styles.root)} />;
