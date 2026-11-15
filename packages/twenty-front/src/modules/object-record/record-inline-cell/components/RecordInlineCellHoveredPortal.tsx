import * as stylex from '@stylexjs/stylex';
import { type ReactNode } from 'react';

const styles = stylex.create({
  hoveredPortal: {
    height: '100%',
    left: 0,
    position: 'absolute',
    top: 0,
    width: '100%',
  },
});

export const RecordInlineCellHoveredPortal = ({
  children,
}: {
  children: ReactNode;
}) => <div {...stylex.props(styles.hoveredPortal)}>{children}</div>;
