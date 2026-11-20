import * as stylex from '@stylexjs/stylex';
import { type ReactNode } from 'react';
import { background, borderRadius } from 'twenty-ui/theme/tokens.stylex';

const styles = stylex.create({
  root: {
    borderRadius: borderRadius['--t-border-radius-sm'],
    alignItems: 'center',
    backgroundColor: background['--t-background-primary'],
    display: 'flex',
    justifyContent: 'center',
  },
});

export const SidePanelContextChipIconWrapper = ({
  children,
}: {
  children: ReactNode;
}) => <div {...stylex.props(styles.root)}>{children}</div>;
