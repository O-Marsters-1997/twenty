import * as stylex from '@stylexjs/stylex';
import { type ComponentProps } from 'react';

type RecordTableBodyProps = ComponentProps<'div'>;

export const RecordTableBody = (props: RecordTableBodyProps) => (
  // oxlint-disable-next-line react/jsx-props-no-spreading
  <div {...props} {...stylex.props(styles.root)} />
);

const styles = stylex.create({
  root: {
    display: 'flex',
    flexWrap: 'wrap',
  },
});
