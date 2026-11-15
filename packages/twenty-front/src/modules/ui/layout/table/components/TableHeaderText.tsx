import * as stylex from '@stylexjs/stylex';
import { spacing } from 'twenty-ui/theme/tokens.stylex';
import { type ReactNode } from 'react';

const styles = stylex.create({
  text: {
    paddingBottom: spacing['--t-spacing-0_5'],
  },
});

export const TableHeaderText = ({ children }: { children?: ReactNode }) => (
  <div {...stylex.props(styles.text)}>{children}</div>
);
