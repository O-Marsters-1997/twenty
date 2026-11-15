import * as stylex from '@stylexjs/stylex';
import { type ReactNode } from 'react';
import { spacing } from 'twenty-ui/theme/tokens.stylex';

const styles = stylex.create({
  column: {
    display: 'flex',
    flexDirection: 'column',
    gap: spacing['--t-spacing-1'],
    width: '100%',
  },
});

export const AdvancedFilterSidePanelColumn = ({
  children,
}: {
  children: ReactNode;
}) => <div {...stylex.props(styles.column)}>{children}</div>;
