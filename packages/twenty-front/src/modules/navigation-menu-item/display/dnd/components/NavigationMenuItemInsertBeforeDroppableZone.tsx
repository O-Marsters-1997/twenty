import * as stylex from '@stylexjs/stylex';
import { pointerIntersection } from '@dnd-kit/collision';
import { useDroppable } from '@dnd-kit/react';

import type { DroppableData } from '@/navigation-menu-item/common/types/NavigationMenuItemDndKitDroppableData';
import { getDndKitDropTargetId } from '@/navigation-menu-item/common/utils/getDndKitDropTargetId';

const styles = stylex.create({
  insertBeforeZone: {
    pointerEvents: 'auto',
    position: 'absolute',
    zIndex: 1,
    height: '5px',
    left: 0,
    right: 0,
    top: '-5px',
  },
});

type NavigationMenuItemInsertBeforeDroppableZoneProps = {
  orphanDroppableId: string;
  orphanIndex: number;
  itemId: string;
  disabled?: boolean;
};

export const NavigationMenuItemInsertBeforeDroppableZone = ({
  orphanDroppableId,
  orphanIndex,
  itemId,
  disabled = false,
}: NavigationMenuItemInsertBeforeDroppableZoneProps) => {
  const id = getDndKitDropTargetId(orphanDroppableId, orphanIndex);
  const data: DroppableData = {
    droppableId: orphanDroppableId,
    index: orphanIndex,
    insertBeforeItemId: itemId,
  };
  const { ref } = useDroppable({
    id,
    disabled,
    collisionPriority: 5,
    collisionDetector: pointerIntersection,
    data,
  });

  return <div ref={ref} {...stylex.props(styles.insertBeforeZone)} />;
};
