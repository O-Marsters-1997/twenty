
import { WorkspaceSectionListReadOnly } from '@/navigation-menu-item/display/sections/workspace/components/WorkspaceSectionListReadOnly';
import { WorkspaceSectionAddMenuItemButton } from '@/navigation-menu-item/edit/components/WorkspaceSectionAddMenuItemButton';
import type { NavigationMenuItemSectionListDndKitProps } from '@/navigation-menu-item/display/sections/types/NavigationMenuItemSectionListDndKitProps';
import * as stylex from '@stylexjs/stylex';
import { spacing } from 'twenty-ui/theme/tokens.stylex';

const styles = stylex.create({
  fallback: {
    display: 'flex',
    flexDirection: 'column',
    gap: spacing['--t-spacing-1'],
  },
});

type WorkspaceSectionListEditModeFallbackProps = Pick<
  NavigationMenuItemSectionListDndKitProps,
  'filteredItems' | 'folderChildrenById' | 'onActiveObjectMetadataItemClick'
>;

export const WorkspaceSectionListEditModeFallback = ({
  filteredItems,
  folderChildrenById,
  onActiveObjectMetadataItemClick,
}: WorkspaceSectionListEditModeFallbackProps) => (
  <div {...stylex.props(styles.fallback)}>
    <WorkspaceSectionListReadOnly
      filteredItems={filteredItems}
      folderChildrenById={folderChildrenById}
      onActiveObjectMetadataItemClick={onActiveObjectMetadataItemClick}
    />
    <WorkspaceSectionAddMenuItemButton />
  </div>
);
