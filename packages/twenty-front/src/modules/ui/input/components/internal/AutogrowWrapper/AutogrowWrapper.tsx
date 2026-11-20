import * as stylex from '@stylexjs/stylex';
import { type ReactNode } from 'react';

type AutogrowWrapperProps = {
  children: ReactNode;
  node?: ReactNode;
  xstyle?: stylex.StyleXStyles;
};

export const AutogrowWrapper = ({
  children,
  node = children,
  xstyle,
}: AutogrowWrapperProps) => {
  return (
    <div {...stylex.props(styles.container, xstyle)}>
      <span {...stylex.props(styles.nodeWrapper)}>{node}</span>
      <div {...stylex.props(styles.childWrapper)}>{children}</div>
    </div>
  );
};

const styles = stylex.create({
  container: {
    position: 'relative',
    maxWidth: '100%',
  },
  nodeWrapper: {
    pointerEvents: 'none',
    visibility: 'hidden',
    whiteSpace: 'pre',
  },
  childWrapper: {
    position: 'absolute',
    left: 0,
    top: 0,
    width: '100%',
  },
});
