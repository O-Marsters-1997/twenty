import * as stylex from '@stylexjs/stylex';
import { type ReactNode } from 'react';
import { spacing } from 'twenty-ui/theme/tokens.stylex';

const styles = stylex.create({
  root: {
    padding: spacing['--t-spacing-10'],
    alignItems: 'center',
    display: 'flex',
    flexBasis: '0%',
    flexDirection: 'column',
    flexGrow: 1,
    flexShrink: 1,
    justifyContent: 'center',
  },
});

export const StyledAuthContent = ({ children }: { children: ReactNode }) => (
  <div {...stylex.props(styles.root)}>{children}</div>
);
