import { NavigationMenuItemAddDropdown } from '@/navigation-menu-item/edit/components/NavigationMenuItemAddDropdown';
import { useLingui } from '@lingui/react/macro';
import { useCallback, useContext, useMemo } from 'react';
import { LightIconButton } from 'twenty-ui/components/input';
import { IconHeartOff, IconPlus } from 'twenty-ui/icon';
import { type NavigationMenuItem } from '~/generated-metadata/graphql';
import { general } from 'twenty-ui/theme/tokens.stylex';

import { NavigationMenuItemDroppableIds } from '@/navigation-menu-item/common/constants/NavigationMenuItemDroppableIds';
import { NavigationSections } from '@/navigation-menu-item/common/constants/NavigationSections';
import { NavigationMenuItemDragContext } from '@/navigation-menu-item/common/contexts/NavigationMenuItemDragContext';
import { useDeleteManyNavigationMenuItems } from '@/navigation-menu-item/common/hooks/useDeleteManyNavigationMenuItems';
import { isNavigationMenuItemFolder } from '@/navigation-menu-item/common/utils/isNavigationMenuItemFolder';
import { NavigationMenuItemDisplay } from '@/navigation-menu-item/display/components/NavigationMenuItemDisplay';
import { NavigationMenuItemDroppableSlot } from '@/navigation-menu-item/display/dnd/components/NavigationMenuItemDroppableSlot';
import { NavigationMenuItemSortableItem } from '@/navigation-menu-item/display/dnd/components/NavigationMenuItemSortableItem';
import { useIsDropDisabledForSection } from '@/navigation-menu-item/display/dnd/hooks/useIsDropDisabledForSection';
import { useNavigationMenuItemsByFolder } from '@/navigation-menu-item/display/folder/hooks/useNavigationMenuItemsByFolder';
import { useReadableNavigationMenuItems } from '@/navigation-menu-item/display/hooks/useReadableNavigationMenuItems';
import { useSortedNavigationMenuItems } from '@/navigation-menu-item/display/hooks/useSortedNavigationMenuItems';
import { NavigationMenuItemOrphanDropTarget } from '@/navigation-menu-item/display/sections/components/NavigationMenuItemOrphanDropTarget';
import { NavigationMenuItemSection } from '@/navigation-menu-item/display/sections/components/NavigationMenuItemSection';
import { useNavigationSection } from '@/ui/navigation/navigation-drawer/hooks/useNavigationSection';
import { isNavigationSectionOpenFamilyState } from '@/ui/navigation/navigation-drawer/states/isNavigationSectionOpenFamilyState';
import { useAtomFamilyStateValue } from '@/ui/utilities/state/jotai/hooks/useAtomFamilyStateValue';
import * as stylex from '@stylexjs/stylex';

const styles = stylex.create({
  listItemRow: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0',
  },
  list: {
    display: 'flex',
    flexDirection: 'column',
    gap: general['--t-between-siblings-gap'],
  },
});

const ORPHAN_DROPPABLE_ID =
  NavigationMenuItemDroppableIds.FAVORITE_ORPHAN_NAVIGATION_MENU_ITEMS;

export const FavoritesSection = () => {
  const { navigationMenuItemsSorted } = useSortedNavigationMenuItems();
  const { userNavigationMenuItemsByFolder } = useNavigationMenuItemsByFolder();
  const { deleteManyNavigationMenuItems } = useDeleteManyNavigationMenuItems();
  const { isDragging } = useContext(NavigationMenuItemDragContext);
  const favoritesDropDisabled = useIsDropDisabledForSection(false);

  const { t } = useLingui();

  const { toggleNavigationSection, openNavigationSection } =
    useNavigationSection('Favorites');
  const isNavigationSectionOpen = useAtomFamilyStateValue(
    isNavigationSectionOpenFamilyState,
    'Favorites',
  );

  const allTopLevelItems = useMemo(
    () => navigationMenuItemsSorted.filter((item) => !item.folderId),
    [navigationMenuItemsSorted],
  );

  const allFolderChildrenById = useMemo(() => {
    const map = new Map<string, NavigationMenuItem[]>();
    for (const folder of userNavigationMenuItemsByFolder) {
      map.set(folder.id, folder.navigationMenuItems);
    }
    return map;
  }, [userNavigationMenuItemsByFolder]);

  const {
    displayTopLevelItems: topLevelItems,
    displayFolderChildrenById: folderChildrenById,
  } = useReadableNavigationMenuItems({
    topLevelItems: allTopLevelItems,
    folderChildrenById: allFolderChildrenById,
  });

  const folderCount = useMemo(
    () => topLevelItems.filter(isNavigationMenuItemFolder).length,
    [topLevelItems],
  );

  const makeRightOptions = useCallback(
    (item: NavigationMenuItem) => (
      <LightIconButton
        onClick={(event) => {
          event.stopPropagation();
          deleteManyNavigationMenuItems([item.id]);
        }}
        emphasis="subtle"
        aria-label={t`Remove from favorites`}
      >
        <IconHeartOff />
      </LightIconButton>
    ),
    [deleteManyNavigationMenuItems, t],
  );

  if (topLevelItems.length === 0) {
    return null;
  }

  return (
    <NavigationMenuItemSection
      title={t`Favorites`}
      isOpen={isNavigationSectionOpen}
      onToggle={toggleNavigationSection}
      rightIcon={
        <NavigationMenuItemAddDropdown
          instanceId="favorites"
          section="favorite"
          onOpen={openNavigationSection}
        >
          <LightIconButton emphasis="subtle" aria-label={t`Add`}>
            <IconPlus />
          </LightIconButton>
        </NavigationMenuItemAddDropdown>
      }
    >
      <div {...stylex.props(styles.list)}>
        {topLevelItems.map((item, index) => (
          <div key={item.id} {...stylex.props(styles.listItemRow)}>
            {index === 0 ? (
              <NavigationMenuItemDroppableSlot
                droppableId={ORPHAN_DROPPABLE_ID}
                index={0}
                disabled={favoritesDropDisabled}
              >
                <NavigationMenuItemOrphanDropTarget
                  index={0}
                  compact
                  sectionId={NavigationSections.FAVORITES}
                  droppableId={ORPHAN_DROPPABLE_ID}
                />
              </NavigationMenuItemDroppableSlot>
            ) : (
              <NavigationMenuItemOrphanDropTarget
                index={index}
                compact
                sectionId={NavigationSections.FAVORITES}
                droppableId={ORPHAN_DROPPABLE_ID}
              />
            )}
            <NavigationMenuItemSortableItem
              id={item.id}
              index={index}
              group={ORPHAN_DROPPABLE_ID}
              disabled={favoritesDropDisabled}
            >
              <NavigationMenuItemDisplay
                item={item}
                isEditInPlace={isNavigationMenuItemFolder(item)}
                isDragging={isDragging}
                folderChildrenById={folderChildrenById}
                folderCount={folderCount}
                rightOptions={
                  isNavigationMenuItemFolder(item)
                    ? undefined
                    : makeRightOptions(item)
                }
              />
            </NavigationMenuItemSortableItem>
          </div>
        ))}
        <NavigationMenuItemDroppableSlot
          droppableId={ORPHAN_DROPPABLE_ID}
          index={topLevelItems.length}
          disabled={favoritesDropDisabled}
        >
          <NavigationMenuItemOrphanDropTarget
            index={topLevelItems.length}
            compact
            sectionId={NavigationSections.FAVORITES}
            droppableId={ORPHAN_DROPPABLE_ID}
          />
        </NavigationMenuItemDroppableSlot>
      </div>
    </NavigationMenuItemSection>
  );
};
