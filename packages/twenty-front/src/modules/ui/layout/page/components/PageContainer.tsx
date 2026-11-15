import * as stylex from '@stylexjs/stylex';
import { type ReactNode } from 'react';

const styles = stylex.create({
  container: {
    display: 'flex',
    flexDirection: 'column',
    width: '100%',
  },
});

export const PageContainer = ({ children }: { children?: ReactNode }) => (
  <div {...stylex.props(styles.container)}>{children}</div>
);
