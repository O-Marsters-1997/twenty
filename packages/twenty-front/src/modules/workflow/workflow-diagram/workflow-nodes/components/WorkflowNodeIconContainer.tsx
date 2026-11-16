import * as stylex from '@stylexjs/stylex';
import { type ReactNode } from 'react';
import {
  backgroundTransparent,
  borderRadius,
} from 'twenty-ui/theme/tokens.stylex';

const styles = stylex.create({
  root: {
    alignItems: 'center',
    background: backgroundTransparent['--t-background-transparent-light'],
    borderRadius: borderRadius['--t-border-radius-sm'],
    boxSizing: 'border-box',
    display: 'flex',
    height: '32px',
    justifyContent: 'center',
    width: '32px',
  },
});

export const WorkflowNodeIconContainer = ({
  children,
}: {
  children?: ReactNode;
}) => <div {...stylex.props(styles.root)}>{children}</div>;
