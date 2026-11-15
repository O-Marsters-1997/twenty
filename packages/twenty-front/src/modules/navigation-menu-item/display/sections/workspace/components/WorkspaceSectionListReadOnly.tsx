import * as stylex from '@stylexjs/stylex';
import { general } from 'twenty-ui/theme/tokens.stylex';

import type { NavigationMenuItem } from '~/generated-metadata/graphql';
import { NavigationMenuItemType } from 'twenty-shared/types';
import type { NavigationMenuItemSectionListDndKitProps } from '@/navigation-menu-item/display/sections/types/NavigationMenuItemSectionListDndKitProps';
import { NavigationMenuItemDisplay } from '@/navigation-menu-item/display/components/NavigationMenuItemDisplay';

const styles = stylex.create({
  list: {
    display: 'flex',
    flexDirection: 'column',
    gap: general['--t-between-siblings-gap'],
    paddingTop: general['--t-between-siblings-gap'],
  },
});

type WorkspaceSectionListReadOnlyProps = Pick<
  NavigationMenuItemSectionListDndKitProps,
  'filteredItems' | 'folderChildrenById' | 'onActiveObjectMetadataItemClick'
>;

const READ_ONLY_EDIT_MODE_PROPS = {
  isSelectedInEditMode: false,
  onEditModeClick: undefined,
} as const;

export const WorkspaceSectionListReadOnly = ({
  filteredItems,
  folderChildrenById,
  onActiveObjectMetadataItemClick,
}: WorkspaceSectionListReadOnlyProps) => {
  const folderCount = filteredItems.filter(
    (item) => item.type === NavigationMenuItemType.FOLDER,
  ).length;

  return (
    <div {...stylex.props(styles.list)}>
      {filteredItems.map((item: NavigationMenuItem) => (
        <NavigationMenuItemDisplay
          key={item.id}
          item={item}
          editModeProps={READ_ONLY_EDIT_MODE_PROPS}
          isDragging={false}
          folderChildrenById={folderChildrenById}
          folderCount={folderCount}
          onActiveObjectMetadataItemClick={onActiveObjectMetadataItemClick}
          readOnly
        />
      ))}
    </div>
  );
};
