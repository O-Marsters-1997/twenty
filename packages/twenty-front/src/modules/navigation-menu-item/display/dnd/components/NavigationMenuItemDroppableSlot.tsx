import * as stylex from '@stylexjs/stylex';
import { pointerIntersection } from '@dnd-kit/collision';
import { useDroppable } from '@dnd-kit/react';
import { type ReactNode } from 'react';
import { spacing } from 'twenty-ui/theme/tokens.stylex';

import type { DroppableData } from '@/navigation-menu-item/common/types/NavigationMenuItemDndKitDroppableData';
import { getDndKitDropTargetId } from '@/navigation-menu-item/common/utils/getDndKitDropTargetId';

const styles = stylex.create({
  slot: { minHeight: 0 },
  empty: { minHeight: spacing['--t-spacing-2'] },
});

const SLOT_COLLISION_PRIORITY = 1;
export const FOLDER_HEADER_SLOT_COLLISION_PRIORITY = 4;

type NavigationMenuItemDroppableSlotProps = {
  droppableId: string;
  index: number;
  children?: ReactNode;
  disabled?: boolean;
  collisionPriority?: number;
};

export const NavigationMenuItemDroppableSlot = ({
  droppableId,
  index,
  children,
  disabled = false,
  collisionPriority = SLOT_COLLISION_PRIORITY,
}: NavigationMenuItemDroppableSlotProps) => {
  const id = getDndKitDropTargetId(droppableId, index);
  const data: DroppableData = { droppableId, index };
  const { ref } = useDroppable({
    id,
    disabled,
    collisionPriority,
    collisionDetector: pointerIntersection,
    data,
  });

  const isEmpty =
    children == null || (Array.isArray(children) && children.length === 0);

  return (
    <div ref={ref} {...stylex.props(styles.slot, isEmpty && styles.empty)}>
      {children}
    </div>
  );
};
