import * as stylex from '@stylexjs/stylex';
import { spacing } from 'twenty-ui/theme/tokens.stylex';
import { type ReactNode } from 'react';

const styles = stylex.create({
  body: {
    display: 'flex',
    flexDirection: 'column',
    gap: '2px',
    paddingBlock: spacing['--t-spacing-2'],
    paddingInline: 0,
  },
});

export const TableBody = ({ children }: { children?: ReactNode }) => (
  <div {...stylex.props(styles.body)}>{children}</div>
);
