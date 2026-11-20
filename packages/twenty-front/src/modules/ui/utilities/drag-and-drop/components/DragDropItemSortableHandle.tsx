import * as stylex from '@stylexjs/stylex';
import { type ReactNode, useContext } from 'react';
import { color } from 'twenty-ui/theme/tokens.stylex';

import { DragDropItemSortableHandleRefContext } from '@/ui/utilities/drag-and-drop/context/DragDropItemSortableHandleRefContext';

const styles = stylex.create({
  handle: {
    cursor: 'grab',
    display: 'block',
    outlineColor: color['--t-color-blue'],
    outlineOffset: { default: null, ':focus-visible': '-2px' },
    outlineStyle: { default: 'none', ':focus-visible': 'solid' },
    outlineWidth: { default: null, ':focus-visible': '2px' },
    height: '100%',
    minWidth: 0,
    width: 'auto',
  },
  handleDisabled: {
    cursor: 'default',
  },
  handleFill: {
    display: 'flex',
    width: '100%',
  },
});

type DragDropItemSortableHandleProps = {
  children: ReactNode;
  fill?: boolean;
  disabled?: boolean;
};

export const DragDropItemSortableHandle = ({
  children,
  fill = false,
  disabled = false,
}: DragDropItemSortableHandleProps) => {
  const sortableHandleRef = useContext(DragDropItemSortableHandleRefContext);

  return (
    <div
      ref={sortableHandleRef}
      data-dnd-sortable-handle
      {...stylex.props(
        styles.handle,
        disabled && styles.handleDisabled,
        fill && styles.handleFill,
      )}
    >
      {children}
    </div>
  );
};
