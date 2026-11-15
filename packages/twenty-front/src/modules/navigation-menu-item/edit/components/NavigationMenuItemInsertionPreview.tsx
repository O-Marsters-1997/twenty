import * as stylex from '@stylexjs/stylex';
import { isDefined } from 'twenty-shared/utils';
import { type NavigationDrawerSubItemState } from '@/ui/navigation/navigation-drawer/types/NavigationDrawerSubItemState';
import { useCallback } from 'react';
import { navigationMenuItemInsertionAnchorState } from '@/navigation-menu-item/common/states/navigationMenuItemInsertionAnchorState';
import { useSetAtomState } from '@/ui/utilities/state/jotai/hooks/useSetAtomState';
import { NavigationSections } from '@/navigation-menu-item/common/constants/NavigationSections';
import { navigationMenuItemInsertionPreviewState } from '@/navigation-menu-item/common/states/navigationMenuItemInsertionPreviewState';
import { NavigationDrawerItem } from '@/ui/navigation/navigation-drawer/components/NavigationDrawerItem';
import { useAtomStateValue } from '@/ui/utilities/state/jotai/hooks/useAtomStateValue';
import { useLingui } from '@lingui/react/macro';
import { useIcons } from 'twenty-ui/icon';
import { general } from 'twenty-ui/theme/tokens.stylex';

type NavigationMenuItemInsertionPreviewProps = {
  folderId: string | null;
  index: number;
  sectionId: NavigationSections;
  subItemState?: NavigationDrawerSubItemState;
};

const styles = stylex.create({
  preview: { marginBottom: general['--t-between-siblings-gap'] },
  previewInFolder: { marginBottom: 0 },
});

export const NavigationMenuItemInsertionPreview = ({
  folderId,
  index,
  sectionId,
  subItemState,
}: NavigationMenuItemInsertionPreviewProps) => {
  const navigationMenuItemInsertionPreview = useAtomStateValue(
    navigationMenuItemInsertionPreviewState,
  );
  const setNavigationMenuItemInsertionAnchor = useSetAtomState(
    navigationMenuItemInsertionAnchorState,
  );
  const dropdownId = navigationMenuItemInsertionPreview?.dropdownId;
  const setAnchor = useCallback(
    (element: HTMLDivElement | null) => {
      if (!isDefined(dropdownId)) {
        return;
      }
      const button = element?.querySelector('button');
      setNavigationMenuItemInsertionAnchor((anchor) => {
        if (isDefined(button)) {
          return { dropdownId, element: button };
        }
        return anchor?.dropdownId === dropdownId ? null : anchor;
      });
    },
    [dropdownId, setNavigationMenuItemInsertionAnchor],
  );
  const { t } = useLingui();
  const { getIcon } = useIcons();
  const section =
    sectionId === NavigationSections.WORKSPACE ? 'workspace' : 'favorite';

  if (
    navigationMenuItemInsertionPreview?.section !== section ||
    navigationMenuItemInsertionPreview.folderId !== folderId ||
    navigationMenuItemInsertionPreview.index !== index
  ) {
    return null;
  }

  return (
    <div
      ref={setAnchor}
      {...stylex.props(
        styles.preview,
        isDefined(folderId) && styles.previewInFolder,
      )}
      role="status"
      aria-label={t`Select a menu item`}
    >
      <NavigationDrawerItem
        label={t`Select a menu item`}
        Icon={getIcon('IconFold')}
        variant="placeholder"
        indentationLevel={isDefined(folderId) ? 2 : 1}
        subItemState={subItemState}
      />
    </div>
  );
};
