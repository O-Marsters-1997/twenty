import * as stylex from '@stylexjs/stylex';
import { type ReactNode } from 'react';

const styles = stylex.create({
  table: {
    display: 'flex',
    flexDirection: 'column',
    width: '100%',
  },
});

export const Table = ({ children }: { children?: ReactNode }) => (
  <div {...stylex.props(styles.table)}>{children}</div>
);
