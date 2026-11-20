import * as stylex from '@stylexjs/stylex';
import { type ReactNode } from 'react';
import { spacing } from 'twenty-ui/theme/tokens.stylex';

const styles = stylex.create({
  root: {
    paddingBlock: spacing['--t-spacing-1'],
    paddingInline: spacing['--t-spacing-2'],
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
    overflowY: 'auto',
  },
});

export const SidePanelStepListContainer = ({
  children,
}: {
  children?: ReactNode;
}) => <div {...stylex.props(styles.root)}>{children}</div>;
