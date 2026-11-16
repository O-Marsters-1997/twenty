import * as stylex from '@stylexjs/stylex';
import { type ReactNode } from 'react';
import { spacing } from 'twenty-ui/theme/tokens.stylex';

const styles = stylex.create({
  row: {
    display: 'flex',
    gap: spacing['--t-spacing-1'],
    width: '100%',
  },
});

export const AdvancedFilterDropdownRow = ({
  children,
}: {
  children: ReactNode;
}) => <div {...stylex.props(styles.row)}>{children}</div>;
