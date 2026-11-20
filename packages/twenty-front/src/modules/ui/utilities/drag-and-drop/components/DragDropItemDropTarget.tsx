import * as stylex from '@stylexjs/stylex';
import { type ReactNode, useContext } from 'react';
import { isDefined } from 'twenty-shared/utils';
import {
  backgroundTransparent,
  borderRadius,
  color,
  spacing,
} from 'twenty-ui/theme/tokens.stylex';

import { DragDropItemDndContext } from '@/ui/utilities/drag-and-drop/context/DragDropItemDndContext';
import { type DragDropItemDropTargetOrientation } from '@/ui/utilities/drag-and-drop/types/DragDropItemDropTargetOrientation';

const styles = stylex.create({
  root: {
    '--drop-line-nudge': spacing['--t-spacing-1'],
    position: 'relative',
    transitionDuration: '120ms',
    transitionProperty: 'background-color',
    transitionTimingFunction: 'ease-out',
    minHeight: spacing['--t-spacing-2'],
    '::before': {
      backgroundColor: color['--t-color-blue'],
      content: '""',
      opacity: 0,
      position: 'absolute',
      transformOrigin: 'center',
      transitionDuration: '120ms, 120ms',
      transitionProperty: 'opacity, transform',
      transitionTimingFunction: 'ease-out',
      borderBottomLeftRadius: borderRadius['--t-border-radius-sm'],
      borderBottomRightRadius: borderRadius['--t-border-radius-sm'],
      borderTopLeftRadius: borderRadius['--t-border-radius-sm'],
      borderTopRightRadius: borderRadius['--t-border-radius-sm'],
    },
  },
  compact: {
    minHeight: 0,
  },
  overlay: {
    position: 'absolute',
  },
  seamAligned: {
    '--drop-line-nudge': '0px',
  },
  dragOver: {
    backgroundColor: backgroundTransparent['--t-background-transparent-blue'],
    '::before': {
      opacity: 1,
    },
  },
  vertical: {
    height: '100%',
    width: '100%',
    '::before': {
      transform: 'translateX(-50%) scaleY(0.7)',
      height: '100%',
      left: '50%',
      top: 0,
      width: '2px',
    },
  },
  verticalDragOver: {
    '::before': {
      transform: 'translateX(-50%) scaleY(1)',
    },
  },
  horizontal: {
    width: '100%',
    '::before': {
      transform: 'translateY(calc(-50% - var(--drop-line-nudge))) scaleX(0.7)',
      height: '2px',
      left: 0,
      top: '50%',
      width: '100%',
    },
  },
  horizontalDragOver: {
    '::before': {
      transform: 'translateY(calc(-50% - var(--drop-line-nudge))) scaleX(1)',
    },
  },
  horizontalLeading: {
    '::before': {
      transform: 'scaleX(0.7)',
      zIndex: 1,
      top: 0,
    },
  },
  horizontalLeadingDragOver: {
    '::before': {
      transform: 'scaleX(1)',
    },
  },
});

type DragDropItemDropTargetProps = {
  children?: ReactNode;
  compact?: boolean;
  droppableId?: string;
  index: number;
  orientation?: DragDropItemDropTargetOrientation;
  overlay?: boolean;
  // Centers the line on the seam between two cells; use for bordered items where
  // the default gap nudge would overlap the leading cell's border.
  seamAligned?: boolean;
};

export const DragDropItemDropTarget = ({
  children,
  compact = false,
  droppableId,
  index,
  orientation,
  overlay = false,
  seamAligned = false,
}: DragDropItemDropTargetProps) => {
  const { activeDropTargetIndex, activeDroppableId } = useContext(
    DragDropItemDndContext,
  );

  const matchesDroppable =
    !isDefined(droppableId) || activeDroppableId === droppableId;

  const isDragOver = activeDropTargetIndex === index && matchesDroppable;

  const isLeading = orientation === 'horizontal' && index === 0;

  return (
    <div
      data-orientation={orientation}
      data-leading={isLeading ? 'true' : undefined}
      data-drag-over={isDragOver ? 'true' : undefined}
      {...stylex.props(
        styles.root,
        compact && styles.compact,
        overlay && styles.overlay,
        seamAligned && styles.seamAligned,
        isDragOver && styles.dragOver,
        orientation === 'vertical' && styles.vertical,
        orientation === 'vertical' && isDragOver && styles.verticalDragOver,
        orientation === 'horizontal' && styles.horizontal,
        orientation === 'horizontal' &&
          !isLeading &&
          isDragOver &&
          styles.horizontalDragOver,
        isLeading && styles.horizontalLeading,
        isLeading && isDragOver && styles.horizontalLeadingDragOver,
      )}
    >
      {children}
    </div>
  );
};
