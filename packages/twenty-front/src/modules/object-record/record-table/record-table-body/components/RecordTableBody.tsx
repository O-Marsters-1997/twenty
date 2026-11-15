import * as stylex from '@stylexjs/stylex';
import { type ComponentProps } from 'react';

export const RecordTableBody = (props: ComponentProps<'div'>) => (
  // oxlint-disable-next-line react/jsx-props-no-spreading
  <div {...props} {...stylex.props(styles.root)} />
);

const styles = stylex.create({
  root: {
    display: 'flex',
    flexWrap: 'wrap',
  },
});
