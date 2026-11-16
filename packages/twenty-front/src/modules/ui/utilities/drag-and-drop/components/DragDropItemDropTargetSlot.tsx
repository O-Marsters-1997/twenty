import { type ReactNode } from 'react';
import * as stylex from '@stylexjs/stylex';

// Zero-footprint seam between adjacent sortable cells: 2px of indicator space
// pulled 1px into each neighbor so the cells keep their layout.
const styles = stylex.create({
  dropTargetSlot: {
    alignSelf: 'stretch',
    flex: '0 0 2px',
    marginLeft: '-1px',
    marginRight: '-1px',
    minHeight: '0',
    position: 'relative',
    zIndex: '100',
  },
});

type DragDropItemDropTargetSlotProps = {
  children: ReactNode;
};

export const DragDropItemDropTargetSlot = ({
  children,
}: DragDropItemDropTargetSlotProps) => (
  <div {...stylex.props(styles.dropTargetSlot)}>{children}</div>
);
