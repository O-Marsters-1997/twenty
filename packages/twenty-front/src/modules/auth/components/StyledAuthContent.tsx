import * as stylex from '@stylexjs/stylex';
import { type ReactNode } from 'react';
import { spacing } from 'twenty-ui/theme/tokens.stylex';

const styles = stylex.create({
  root: {
    alignItems: 'center',
    display: 'flex',
    flexBasis: '0%',
    flexDirection: 'column',
    flexGrow: 1,
    flexShrink: 1,
    justifyContent: 'center',
    padding: spacing['--t-spacing-10'],
  },
});

export const StyledAuthContent = ({ children }: { children: ReactNode }) => (
  <div {...stylex.props(styles.root)}>{children}</div>
);
