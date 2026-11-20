import { isLayoutCustomizationModeEnabledState } from '@/layout-customization/states/isLayoutCustomizationModeEnabledState';
import { NavigationMenuItemDroppableIds } from '@/navigation-menu-item/common/constants/NavigationMenuItemDroppableIds';
import {
  FOLDER_HEADER_SLOT_COLLISION_PRIORITY,
  NavigationMenuItemDroppableSlot,
} from '@/navigation-menu-item/display/dnd/components/NavigationMenuItemDroppableSlot';
import { NavigationMenuItemSortableItem } from '@/navigation-menu-item/display/dnd/components/NavigationMenuItemSortableItem';
import { useIsDropDisabledForSection } from '@/navigation-menu-item/display/dnd/hooks/useIsDropDisabledForSection';
import { useAtomStateValue } from '@/ui/utilities/state/jotai/hooks/useAtomStateValue';
import { useContext } from 'react';
import { NavigationMenuItemType } from 'twenty-shared/types';
import { general } from 'twenty-ui/theme/tokens.stylex';

import { NavigationMenuItemDragContext } from '@/navigation-menu-item/common/contexts/NavigationMenuItemDragContext';
import { NavigationMenuItemDisplay } from '@/navigation-menu-item/display/components/NavigationMenuItemDisplay';
import { NavigationMenuItemOrphanDropTarget } from '@/navigation-menu-item/display/sections/components/NavigationMenuItemOrphanDropTarget';
import type { NavigationMenuItemSectionListDndKitProps } from '@/navigation-menu-item/display/sections/types/NavigationMenuItemSectionListDndKitProps';
import { WorkspaceSectionAddMenuItemButton } from '@/navigation-menu-item/edit/components/WorkspaceSectionAddMenuItemButton';
import * as stylex from '@stylexjs/stylex';

type WorkspaceSectionListDndKitProps = NavigationMenuItemSectionListDndKitProps;

const styles = stylex.create({
  listItemRow: {
    gap: '0',
    display: 'flex',
    flexDirection: 'column',
  },
  list: {
    gap: general['--t-between-siblings-gap'],
    display: 'flex',
    flexDirection: 'column',
    paddingTop: general['--t-between-siblings-gap'],
  },
});

export const WorkspaceSectionListDndKit = ({
  filteredItems,
  getEditModeProps,
  folderChildrenById,
  onNavigationMenuItemClick,
  onActiveObjectMetadataItemClick,
}: WorkspaceSectionListDndKitProps) => {
  const isLayoutCustomizationModeEnabled = useAtomStateValue(
    isLayoutCustomizationModeEnabledState,
  );
  const workspaceDropDisabled = useIsDropDisabledForSection(true);
  const { isDragging } = useContext(NavigationMenuItemDragContext);
  const folderCount = filteredItems.filter(
    (item) => item.type === NavigationMenuItemType.FOLDER,
  ).length;
  const isAddMenuItemButtonVisible = isLayoutCustomizationModeEnabled;
  const orphanAppendDndIndex = filteredItems.length;
  return (
    <div {...stylex.props(styles.list)}>
      {filteredItems.map((item, index) => (
        <div key={item.id} {...stylex.props(styles.listItemRow)}>
          <NavigationMenuItemOrphanDropTarget index={index} compact />
          <NavigationMenuItemSortableItem
            id={item.id}
            index={index}
            group={
              NavigationMenuItemDroppableIds.WORKSPACE_ORPHAN_NAVIGATION_MENU_ITEMS
            }
            disabled={
              !isLayoutCustomizationModeEnabled || workspaceDropDisabled
            }
          >
            <NavigationMenuItemDisplay
              item={item}
              editModeProps={getEditModeProps(item)}
              isDragging={isDragging}
              folderChildrenById={folderChildrenById}
              folderCount={folderCount}
              onNavigationMenuItemClick={onNavigationMenuItemClick}
              onActiveObjectMetadataItemClick={onActiveObjectMetadataItemClick}
              orphanIndex={index}
            />
          </NavigationMenuItemSortableItem>
        </div>
      ))}
      <NavigationMenuItemDroppableSlot
        droppableId={
          NavigationMenuItemDroppableIds.WORKSPACE_ORPHAN_NAVIGATION_MENU_ITEMS
        }
        index={orphanAppendDndIndex}
        disabled={workspaceDropDisabled}
        collisionPriority={FOLDER_HEADER_SLOT_COLLISION_PRIORITY}
      >
        <NavigationMenuItemOrphanDropTarget
          index={orphanAppendDndIndex}
          compact
          highlightPosition="top"
        />
        {isAddMenuItemButtonVisible && <WorkspaceSectionAddMenuItemButton />}
      </NavigationMenuItemDroppableSlot>
    </div>
  );
};
