import * as stylex from '@stylexjs/stylex';
import { type ReactNode } from 'react';
import { spacing } from 'twenty-ui/theme/tokens.stylex';

const styles = stylex.create({
  root: {
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
    overflowY: 'auto',
    paddingBlock: spacing['--t-spacing-1'],
    paddingInline: spacing['--t-spacing-2'],
  },
});

export const SidePanelStepListContainer = ({
  children,
}: {
  children?: ReactNode;
}) => <div {...stylex.props(styles.root)}>{children}</div>;
