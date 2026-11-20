import { navigationMenuItemIdToRenameState } from '@/navigation-menu-item/common/states/navigationMenuItemIdToRenameState';
import { getLinkNavigationMenuItemLabel } from '@/navigation-menu-item/display/link/utils/getLinkNavigationMenuItemLabel';
import { ColoredIcon } from '@/ui/icon/components/ColoredIcon';
import { useIcons } from 'twenty-ui/icon';
import { NavigationMenuItemNameInputFocusEffect } from '@/navigation-menu-item/edit/effect-components/NavigationMenuItemNameInputFocusEffect';
import { useState, type ReactNode } from 'react';
import { useLingui } from '@lingui/react/macro';
import { NavigationMenuItemType } from 'twenty-shared/types';
import { isDefined } from 'twenty-shared/utils';
import { parseThemeColor } from 'twenty-ui/utilities';
import { type NavigationMenuItem } from '~/generated-metadata/graphql';
import { TextInput } from '@/ui/field/input/components/TextInput';
import { IconPicker } from '@/ui/input/components/IconPicker';
import { NavigationMenuItemIcon } from '@/navigation-menu-item/display/components/NavigationMenuItemIcon';
import { useNavigationMenuItemEditController } from '@/navigation-menu-item/edit/hooks/useNavigationMenuItemEditController';
import { DEFAULT_NAVIGATION_MENU_ITEM_COLOR_FOLDER } from '@/navigation-menu-item/common/constants/NavigationMenuItemDefaultColorFolder';
import { FOLDER_ICON_DEFAULT } from '@/navigation-menu-item/common/constants/FolderIconDefault';
import { NavigationDrawerItemEditingContext } from '@/ui/navigation/navigation-drawer/contexts/NavigationDrawerItemEditingContext';
import { selectedNavigationMenuItemIdInEditModeState } from '@/navigation-menu-item/common/states/selectedNavigationMenuItemIdInEditModeState';
import { useAtomState } from '@/ui/utilities/state/jotai/hooks/useAtomState';
import { useIsNavigationDrawerContentExpanded } from '@/ui/navigation/navigation-drawer/hooks/useIsNavigationDrawerContentExpanded';
import * as stylex from '@stylexjs/stylex';
import { fontWeight } from 'twenty-ui/theme/tokens.stylex';

const styles = stylex.create({
  editor: {
    display: 'contents',
  },
  iconPickerTrigger: {
    alignItems: 'center',
    cursor: 'pointer',
    display: 'flex',
  },
  labelButton: {
    font: 'inherit',
    padding: 0,
    borderWidth: 0,
    overflow: 'hidden',
    alignItems: 'center',
    backgroundColor: 'transparent',
    color: 'inherit',
    cursor: 'pointer',
    display: 'block',
    fontWeight: fontWeight['--t-font-weight-medium'],
    textAlign: 'left',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
    minWidth: 0,
    width: '100%',
  },
  nameInput: {
    padding: 0,
    fontWeight: fontWeight['--t-font-weight-medium'],
    minWidth: 0,
  },
  iconButton: {
    font: 'inherit',
    padding: 0,
    borderWidth: 0,
    alignItems: 'center',
    backgroundColor: 'transparent',
    color: 'inherit',
    cursor: 'pointer',
    display: 'flex',
    fontWeight: fontWeight['--t-font-weight-medium'],
    textAlign: 'left',
    minWidth: 0,
  },
});

type NavigationMenuItemInlineEditorProps = {
  item: NavigationMenuItem;
  children: ReactNode;
  dropdownId: string;
  rowAnchorId: string;
  onEditLink: () => void;
};

export const NavigationMenuItemInlineEditor = ({
  item,
  children,
  dropdownId,
  rowAnchorId,
  onEditLink,
}: NavigationMenuItemInlineEditorProps) => {
  const { t } = useLingui();
  const { getIcon } = useIcons();
  const { updateItem } = useNavigationMenuItemEditController(
    isDefined(item.userWorkspaceId) ? 'favorite' : 'workspace',
  );
  const [
    selectedNavigationMenuItemIdInEditMode,
    setSelectedNavigationMenuItemIdInEditMode,
  ] = useAtomState(selectedNavigationMenuItemIdInEditModeState);
  const isExpanded = useIsNavigationDrawerContentExpanded();
  const isSelected = selectedNavigationMenuItemIdInEditMode === item.id;
  const [navigationMenuItemIdToRename, setNavigationMenuItemIdToRename] =
    useAtomState(navigationMenuItemIdToRenameState);
  const [isRenaming, setIsRenaming] = useState(false);
  const [initialName, setInitialName] = useState(item.name ?? '');
  const [name, setName] = useState(item.name ?? '');
  const focusId = `${dropdownId}-name`;
  const isNameInputVisible =
    (isRenaming || navigationMenuItemIdToRename === item.id) &&
    isExpanded &&
    isSelected;
  const clearFavoriteSelection = () => {
    if (isDefined(item.userWorkspaceId)) {
      setSelectedNavigationMenuItemIdInEditMode((currentId) =>
        currentId === item.id ? null : currentId,
      );
    }
  };
  const stopRenaming = (clearSelection = true) => {
    if (clearSelection) {
      clearFavoriteSelection();
    }
    setIsRenaming(false);
    setNavigationMenuItemIdToRename((currentId) =>
      currentId === item.id ? null : currentId,
    );
  };
  const isFolder = item.type === NavigationMenuItemType.FOLDER;
  const select = () => setSelectedNavigationMenuItemIdInEditMode(item.id);
  const finishRename = (value: string, clearSelection = true) => {
    void updateItem(item.id, { name: value.trim() || initialName });
    stopRenaming(clearSelection);
  };
  const icon = isFolder ? (
    <IconPicker
      dropdownId={`${dropdownId}-icon`}
      selectedIconKey={item.icon ?? FOLDER_ICON_DEFAULT}
      onOpen={select}
      onClose={clearFavoriteSelection}
      onChange={({ iconKey }) => void updateItem(item.id, { icon: iconKey })}
      iconColorPicker={{
        selectedColor: parseThemeColor(
          item.color ?? DEFAULT_NAVIGATION_MENU_ITEM_COLOR_FOLDER,
        ),
        onColorChange: (color) => void updateItem(item.id, { color }),
      }}
      clickableComponent={
        <div
          aria-label={t`Choose icon and color`}
          {...stylex.props(styles.iconPickerTrigger)}
        >
          <ColoredIcon
            Icon={getIcon(item.icon ?? FOLDER_ICON_DEFAULT)}
            color={item.color ?? DEFAULT_NAVIGATION_MENU_ITEM_COLOR_FOLDER}
          />
        </div>
      }
    />
  ) : (
    <button
      type="button"
      aria-label={t`Edit link`}
      onClick={onEditLink}
      {...stylex.props(styles.iconButton)}
    >
      <NavigationMenuItemIcon navigationMenuItem={item} />
    </button>
  );
  const label =
    isFolder && isNameInputVisible ? (
      <TextInput
        {...stylex.props(styles.nameInput)}
        instanceId={focusId}
        autoFocus
        selectOnFocus
        copyButton={false}
        shouldTrim={false}
        value={name}
        onChange={setName}
        onEnter={finishRename}
        onTab={finishRename}
        onShiftTab={finishRename}
        onEscape={() => stopRenaming()}
        onClickOutside={(event, value) =>
          finishRename(
            value,
            !(
              event.target instanceof Element &&
              isDefined(event.target.closest(`#${rowAnchorId}`))
            ),
          )
        }
      />
    ) : (
      <button
        type="button"
        {...stylex.props(styles.labelButton)}
        onClick={(event) => {
          event.stopPropagation();
          if (!isFolder) {
            onEditLink();
          } else if (isSelected) {
            setInitialName(item.name ?? '');
            setName(item.name ?? '');
            setIsRenaming(true);
          } else {
            select();
          }
        }}
      >
        {isFolder ? item.name : getLinkNavigationMenuItemLabel(item)}
      </button>
    );
  return (
    <NavigationDrawerItemEditingContext.Provider
      value={{
        icon,
        label,
        isSelected:
          isSelected &&
          (!isFolder || !isExpanded || isDefined(item.userWorkspaceId)),
      }}
    >
      {isNameInputVisible && (
        <NavigationMenuItemNameInputFocusEffect focusId={focusId} />
      )}
      <div {...stylex.props(styles.editor)}>{children}</div>
    </NavigationDrawerItemEditingContext.Provider>
  );
};
