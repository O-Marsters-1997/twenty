import { SortableKeyboardPlugin } from '@dnd-kit/dom/sortable';
import { useSortable } from '@dnd-kit/react/sortable';
import { type ReactNode } from 'react';

import { SortableDropTargetRefContext } from '@/navigation-menu-item/common/contexts/SortableDropTargetRefContext';
import * as stylex from '@stylexjs/stylex';

const SORTABLE_COLLISION_PRIORITY = 3;

const PLUGINS_WITHOUT_OPTIMISTIC = [SortableKeyboardPlugin];

const styles = stylex.create({
  sortableRoot: {
    position: 'relative',
    minHeight: '0',
  },
});

type NavigationMenuItemSortableItemProps = {
  children: ReactNode;
  disabled?: boolean;
  group: string;
  id: string;
  index: number;
};

export const NavigationMenuItemSortableItem = ({
  id,
  index,
  group,
  disabled = false,
  children,
}: NavigationMenuItemSortableItemProps) => {
  const { handleRef, ref, targetRef } = useSortable({
    id,
    index,
    group,
    collisionPriority: SORTABLE_COLLISION_PRIORITY,
    data: {
      sourceDroppableId: group,
      sourceIndex: index,
    },
    disabled,
    transition: null,
    plugins: PLUGINS_WITHOUT_OPTIMISTIC,
    feedback: 'clone',
  });

  return (
    <SortableDropTargetRefContext.Provider value={targetRef}>
      <div
        ref={(el) => {
          ref(el);
          handleRef?.(el);
        }}
        {...stylex.props(styles.sortableRoot)}
      >
        {children}
      </div>
    </SortableDropTargetRefContext.Provider>
  );
};
