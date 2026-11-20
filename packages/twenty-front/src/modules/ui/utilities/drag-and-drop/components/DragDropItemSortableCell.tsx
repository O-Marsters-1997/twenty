import { type CollisionDetector } from '@dnd-kit/abstract';
import { defaultCollisionDetection } from '@dnd-kit/collision';
import {
  RestrictToHorizontalAxis,
  RestrictToVerticalAxis,
} from '@dnd-kit/abstract/modifiers';
import { type UseSortableInput, useSortable } from '@dnd-kit/react/sortable';
import * as stylex from '@stylexjs/stylex';
import { type ReactNode, useCallback, useState } from 'react';
import { isDefined } from 'twenty-shared/utils';
import {
  backgroundTransparent,
  borderRadius,
} from 'twenty-ui/theme/tokens.stylex';

import { DND_KIT_PLUGINS_WITHOUT_OPTIMISTIC } from '@/ui/utilities/drag-and-drop/constants/DndKitPluginsWithoutOptimistic';
import { DragDropItemSortableHandleRefContext } from '@/ui/utilities/drag-and-drop/context/DragDropItemSortableHandleRefContext';
import { type DragDropItemDropTargetOrientation } from '@/ui/utilities/drag-and-drop/types/DragDropItemDropTargetOrientation';
import { preventNativeDragStart } from '@/ui/utilities/drag-and-drop/utils/preventNativeDragStart';
import { getOwnDndKitAccessibilityAttributes } from '@/ui/utilities/drag-and-drop/utils/getOwnDndKitAccessibilityAttributes';
import { removeDndKitAccessibilityAttributes } from '@/ui/utilities/drag-and-drop/utils/removeDndKitAccessibilityAttributes';

const SORTABLE_COLLISION_PRIORITY = 3;

const SORTABLE_TRANSITION = {
  duration: 180,
  easing: 'cubic-bezier(0.2, 0, 0, 1)',
  idle: true,
};

const styles = stylex.create({
  root: {
    backgroundColor: 'transparent',
    cursor: {
      default: 'grab',
      ':has([data-dnd-sortable-handle])': 'inherit',
    },
    display: 'block',
    outlineStyle: 'none',
    position: 'relative',
    transitionDuration: '0.1s',
    transitionProperty: 'background-color',
    transitionTimingFunction: 'ease',
    willChange: 'transform',
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
    borderTopLeftRadius: 0,
    borderTopRightRadius: 0,
    height: 'auto',
    minHeight: 0,
    minWidth: 'auto',
  },
  rootDisabled: {
    cursor: 'inherit',
  },
  rootFill: {
    display: 'flex',
    flexShrink: 0,
    height: '100%',
    minWidth: 0,
  },
  rootDragSourceFaded: {
    opacity: 'var(--dnd-drag-source-opacity)',
  },
  rootDraggingHighlighted: {
    backgroundColor: backgroundTransparent['--t-background-transparent-light'],
    borderBottomLeftRadius: borderRadius['--t-border-radius-sm'],
    borderBottomRightRadius: borderRadius['--t-border-radius-sm'],
    borderTopLeftRadius: borderRadius['--t-border-radius-sm'],
    borderTopRightRadius: borderRadius['--t-border-radius-sm'],
  },
});

type DragDropItemSortableCellProps = {
  accept?: UseSortableInput['accept'];
  allowNativeDragWhenDisabled?: boolean;
  children: ReactNode;
  collisionDetector?: CollisionDetector;
  data?: Record<string, unknown>;
  disabled?: boolean;
  fadeSourceWhileDragging?: boolean;
  fill?: boolean;
  group: string;
  hasTransition?: boolean;
  highlightWhileDragging?: boolean;
  id: string;
  index: number;
  restrictMovementTo?: 'x' | 'y' | 'none';
  // Lets a pointer resolver pick the drop boundary per item across lists of mixed orientations
  orientation?: DragDropItemDropTargetOrientation;
  type?: string;
};

export const DragDropItemSortableCell = ({
  accept,
  allowNativeDragWhenDisabled = false,
  children,
  collisionDetector = defaultCollisionDetection,
  data,
  disabled = false,
  fadeSourceWhileDragging = false,
  fill = false,
  group,
  hasTransition = true,
  highlightWhileDragging = false,
  id,
  index,
  restrictMovementTo = 'none',
  orientation,
  type,
}: DragDropItemSortableCellProps) => {
  const { handleRef, ref, isDragging, isDragSource } = useSortable({
    id,
    index,
    group,
    type,
    accept,
    collisionPriority: SORTABLE_COLLISION_PRIORITY,
    collisionDetector,
    // Sortable metadata overrides consumer data so handlers resolve the cell's real group and position
    data: {
      ...data,
      droppableId: group,
      index,
      ...(isDefined(orientation) ? { orientation } : {}),
    },
    disabled,
    transition: hasTransition ? SORTABLE_TRANSITION : null,
    plugins: DND_KIT_PLUGINS_WITHOUT_OPTIMISTIC,
    modifiers: [
      ...(restrictMovementTo === 'x' ? [RestrictToHorizontalAxis] : []),
      ...(restrictMovementTo === 'y' ? [RestrictToVerticalAxis] : []),
    ],
    feedback: 'clone',
  });

  const [ownAccessibilityAttributesByElement] = useState(
    () => new WeakMap<Element, Set<string>>(),
  );

  // A disabled sortable stays unregistered so dnd-kit cannot mark its
  // activator, and everything inside it, as a disabled button.
  const connectToDndKit = useCallback(
    (element: Element | null, connect: (element: Element | null) => void) => {
      if (!disabled) {
        if (
          isDefined(element) &&
          !ownAccessibilityAttributesByElement.has(element)
        ) {
          ownAccessibilityAttributesByElement.set(
            element,
            getOwnDndKitAccessibilityAttributes(element),
          );
        }
        connect(element);
        return;
      }

      connect(null);

      const ownAttributes = isDefined(element)
        ? ownAccessibilityAttributesByElement.get(element)
        : undefined;

      if (isDefined(element) && isDefined(ownAttributes)) {
        removeDndKitAccessibilityAttributes({ element, ownAttributes });
      }
    },
    [disabled, ownAccessibilityAttributesByElement],
  );

  const setSortableRef = useCallback(
    (element: Element | null) => connectToDndKit(element, ref),
    [connectToDndKit, ref],
  );

  const setSortableHandleRef = useCallback(
    (element: Element | null) => connectToDndKit(element, handleRef),
    [connectToDndKit, handleRef],
  );

  return (
    <DragDropItemSortableHandleRefContext.Provider value={setSortableHandleRef}>
      <div
        ref={setSortableRef}
        onDragStart={
          disabled && allowNativeDragWhenDisabled
            ? undefined
            : preventNativeDragStart
        }
        {...stylex.props(
          styles.root,
          disabled && styles.rootDisabled,
          fill && styles.rootFill,
          fadeSourceWhileDragging && isDragSource && styles.rootDragSourceFaded,
          highlightWhileDragging &&
            isDragging &&
            styles.rootDraggingHighlighted,
        )}
      >
        {children}
      </div>
    </DragDropItemSortableHandleRefContext.Provider>
  );
};
