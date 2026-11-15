import { type ReactNode } from 'react';
import * as stylex from '@stylexjs/stylex';
import { background, borderColor } from 'twenty-ui/theme/tokens.stylex';

const styles = stylex.create({
  header: {
    backgroundColor: background['--t-background-secondary'],
    borderBottomWidth: '1px',
    borderBottomStyle: 'solid',
    borderBottomColor: borderColor['--t-border-color-medium'],
    display: 'flex',
    flexDirection: 'column',
    width: '100%',
  },
});

export const ComposerHeader = ({ children }: { children: ReactNode }) => (
  <div {...stylex.props(styles.header)}>{children}</div>
);
