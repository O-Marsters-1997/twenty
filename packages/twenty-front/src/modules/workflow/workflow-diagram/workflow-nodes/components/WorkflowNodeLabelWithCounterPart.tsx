import * as stylex from '@stylexjs/stylex';
import { type ReactNode } from 'react';

const styles = stylex.create({
  root: {
    alignItems: 'center',
    alignSelf: 'stretch',
    boxSizing: 'border-box',
    display: 'flex',
    height: '14px',
    justifyContent: 'space-between',
  },
});

export const WorkflowNodeLabelWithCounterPart = ({
  children,
}: {
  children?: ReactNode;
}) => <div {...stylex.props(styles.root)}>{children}</div>;
