import { type ReactNode } from 'react';
import * as stylex from '@stylexjs/stylex';
import { background, borderColor } from 'twenty-ui/theme/tokens.stylex';

const styles = stylex.create({
  header: {
    backgroundColor: background['--t-background-secondary'],
    display: 'flex',
    flexDirection: 'column',
    borderBottomColor: borderColor['--t-border-color-medium'],
    borderBottomStyle: 'solid',
    borderBottomWidth: '1px',
    width: '100%',
  },
});

export const ComposerHeader = ({ children }: { children: ReactNode }) => (
  <div {...stylex.props(styles.header)}>{children}</div>
);
