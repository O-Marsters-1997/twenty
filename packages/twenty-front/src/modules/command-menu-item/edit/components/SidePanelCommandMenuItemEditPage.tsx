import { AppMenuItemIcon } from '@/applications/components/AppMenuItemIcon';
import { ApplicationStackIcon } from '@/applications/components/ApplicationStackIcon';
import { CommandMenuItemEditRecordSelectionDropdown } from '@/command-menu-item/edit/components/CommandMenuItemEditRecordSelectionDropdown';
import { CommandMenuItemOptionsDropdown } from '@/command-menu-item/edit/components/CommandMenuItemOptionsDropdown';
import { useEditableCommandMenuItems } from '@/command-menu-item/edit/hooks/useEditableCommandMenuItems';
import { useReorderCommandMenuItemsInDraft } from '@/command-menu-item/edit/hooks/useReorderCommandMenuItemsInDraft';
import { useUpdateCommandMenuItemInDraft } from '@/command-menu-item/edit/hooks/useUpdateCommandMenuItemInDraft';
import { useCurrentCommandMenuContextApi } from '@/command-menu-item/hooks/useCurrentCommandMenuContextApi';
import { commandMenuItemsSelector } from '@/command-menu-item/states/commandMenuItemsSelector';
import { getCommandMenuItemPlaceholderValues } from '@/command-menu-item/utils/getCommandMenuItemPlaceholderValues';
import { groupCommandMenuItems } from '@/command-menu-item/utils/groupCommandMenuItems';
import { COMMAND_MENU_CLICK_OUTSIDE_ID } from '@/command-menu/constants/CommandMenuClickOutsideId';
import { SidePanelGroup } from '@/side-panel/components/SidePanelGroup';
import { SidePanelList } from '@/side-panel/components/SidePanelList';
import { sidePanelSearchState } from '@/side-panel/states/sidePanelSearchState';
import { DraggableItem } from '@/ui/layout/draggable-list/components/DraggableItem';
import { DraggableList } from '@/ui/layout/draggable-list/components/DraggableList';
import { type DraggableListDropResult } from '@/ui/layout/draggable-list/types/DraggableListDropResult';
import { SelectableListItem } from '@/ui/layout/selectable-list/components/SelectableListItem';
import { useAtomStateValue } from '@/ui/utilities/state/jotai/hooks/useAtomStateValue';
import { useLingui } from '@lingui/react/macro';
import { interpolateMessagePlaceholders } from 'twenty-shared/i18n';
import { ContextStorePageType } from 'twenty-shared/types';
import { isDefined } from 'twenty-shared/utils';
import { LightIconButton } from 'twenty-ui/components/input';
import { MenuItem, MenuItemDraggable } from 'twenty-ui/components/navigation';
import {
  IconDotsVertical,
  IconPin,
  IconPinnedOff,
  useIcons,
} from 'twenty-ui/icon';
import { ButtonGroup } from 'twenty-ui/primitives/input';
import { type CommandMenuItemFieldsFragment } from '~/generated-metadata/graphql';
import { normalizeSearchText } from 'twenty-ui/utilities';
import * as stylex from '@stylexjs/stylex';
import { borderColor, spacing } from 'twenty-ui/theme/tokens.stylex';

const styles = stylex.create({
  container: {
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
  },
  viewbar: {
    alignItems: 'center',
    backdropFilter: 'blur(5px)',
    borderBottomWidth: '1px',
    borderBottomStyle: 'solid',
    borderBottomColor: borderColor['--t-border-color-light'],
    display: 'flex',
    flexShrink: '0',
    height: '40px',
    paddingTop: spacing['--t-spacing-1'],
    paddingRight: spacing['--t-spacing-2'],
    paddingBottom: spacing['--t-spacing-1'],
    paddingLeft: spacing['--t-spacing-2'],
  },
  content: {
    flex: '1',
    overflow: 'auto',
  },
});

export const SidePanelCommandMenuItemEditPage = () => {
  const { t } = useLingui();
  const { getIcon } = useIcons();
  const commandMenuContextApi = useCurrentCommandMenuContextApi();

  const currentObjectMetadataItemId =
    commandMenuContextApi.objectMetadataItem.id;

  const hasObjectContext = isDefined(currentObjectMetadataItemId);

  const isRecordPage =
    commandMenuContextApi.pageType === ContextStorePageType.Record;

  const sidePanelSearch = useAtomStateValue(sidePanelSearchState);

  const commandMenuItems = useAtomStateValue(commandMenuItemsSelector);
  const serverItemsById = new Map(
    commandMenuItems.map((item) => [item.id, item]),
  );
  const { updateCommandMenuItemInDraft } = useUpdateCommandMenuItemInDraft();
  const { reorderCommandMenuItemInDraft } = useReorderCommandMenuItemsInDraft();

  const editableCommandMenuItems = useEditableCommandMenuItems();

  const filteredCommandMenuItemIds = new Set(
    editableCommandMenuItems.map((item) => item.id),
  );

  const getDisplayLabel = (item: CommandMenuItemFieldsFragment) =>
    interpolateMessagePlaceholders(
      item.label,
      getCommandMenuItemPlaceholderValues(commandMenuContextApi),
    );

  const { pinned: allPinnedItems, other: allOtherItems } =
    groupCommandMenuItems(editableCommandMenuItems);

  const normalizedSearch =
    sidePanelSearch.length > 0
      ? normalizeSearchText(sidePanelSearch)
      : undefined;

  const matchesSearch = (item: CommandMenuItemFieldsFragment) =>
    normalizedSearch === undefined ||
    normalizeSearchText(getDisplayLabel(item)).includes(normalizedSearch);

  const displayedPinnedItems = allPinnedItems.filter(matchesSearch);
  const displayedOtherItems = allOtherItems.filter(matchesSearch);

  const selectableItemIds = [
    ...displayedPinnedItems.map((item) => item.id),
    ...displayedOtherItems.map((item) => item.id),
  ];

  const handleTogglePin = (itemId: string, currentlyPinned: boolean) => {
    if (currentlyPinned) {
      const nextOtherPosition =
        allOtherItems.length === 0
          ? 0
          : allOtherItems[allOtherItems.length - 1].position + 1;

      updateCommandMenuItemInDraft(itemId, {
        isPinned: false,
        position: nextOtherPosition,
      });

      return;
    }

    const nextPinnedPosition =
      allPinnedItems.length === 0
        ? 0
        : allPinnedItems[allPinnedItems.length - 1].position + 1;

    updateCommandMenuItemInDraft(itemId, {
      isPinned: true,
      position: nextPinnedPosition,
    });
  };

  const handlePinnedDragEnd = (result: DraggableListDropResult) => {
    const { source, destination, draggableId } = result;

    if (!isDefined(destination)) {
      return;
    }

    if (source.index === destination.index) {
      return;
    }

    const displayedPinnedItemIdsWithoutSource = displayedPinnedItems
      .map((item) => item.id)
      .filter((itemId) => itemId !== draggableId);

    const allPinnedItemsWithoutSource = allPinnedItems.filter(
      (item) => item.id !== draggableId,
    );

    const nextDisplayedPinnedItemId =
      displayedPinnedItemIdsWithoutSource[destination.index];
    const previousDisplayedPinnedItemId =
      displayedPinnedItemIdsWithoutSource[destination.index - 1];

    let destinationIndexInAllPinnedItemsWithoutSource: number;

    if (isDefined(nextDisplayedPinnedItemId)) {
      destinationIndexInAllPinnedItemsWithoutSource =
        allPinnedItemsWithoutSource.findIndex(
          (item) => item.id === nextDisplayedPinnedItemId,
        );
    } else if (isDefined(previousDisplayedPinnedItemId)) {
      const previousIndex = allPinnedItemsWithoutSource.findIndex(
        (item) => item.id === previousDisplayedPinnedItemId,
      );

      if (previousIndex === -1) {
        return;
      }

      destinationIndexInAllPinnedItemsWithoutSource = previousIndex + 1;
    } else {
      return;
    }

    if (destinationIndexInAllPinnedItemsWithoutSource === -1) {
      return;
    }

    reorderCommandMenuItemInDraft(
      draggableId,
      destinationIndexInAllPinnedItemsWithoutSource,
      'pinned',
      filteredCommandMenuItemIds,
    );
  };

  return (
    <div
      data-click-outside-id={COMMAND_MENU_CLICK_OUTSIDE_ID}
      {...stylex.props(styles.container)}
    >
      {hasObjectContext && (
        <div {...stylex.props(styles.viewbar)}>
          <CommandMenuItemEditRecordSelectionDropdown
            isRecordPage={isRecordPage}
          />
        </div>
      )}
      <div {...stylex.props(styles.content)}>
        <SidePanelList selectableItemIds={selectableItemIds}>
          <SidePanelGroup heading={t`Pinned`}>
            <DraggableList
              onDragEnd={handlePinnedDragEnd}
              draggableItems={displayedPinnedItems.map((item, index) => {
                const ItemIcon = isDefined(item.icon)
                  ? getIcon(item.icon)
                  : undefined;

                return (
                  <DraggableItem
                    key={item.id}
                    draggableId={item.id}
                    index={index}
                    itemComponent={
                      <SelectableListItem
                        itemId={item.id}
                        onEnter={() => handleTogglePin(item.id, true)}
                      >
                        <MenuItemDraggable
                          withIconContainer
                          LeftComponent={
                            <ApplicationStackIcon
                              Icon={ItemIcon}
                              applicationId={item.applicationId}
                            />
                          }
                          text={getDisplayLabel(item)}
                          gripMode="onHover"
                          isIconDisplayedOnHoverOnly={false}
                          iconButtons={
                            <ButtonGroup
                              attached={false}
                              aria-label={t`Menu item actions`}
                            >
                              <CommandMenuItemOptionsDropdown
                                itemId={item.id}
                                shortLabel={item.shortLabel}
                                serverShortLabel={
                                  serverItemsById.get(item.id)?.shortLabel ??
                                  null
                                }
                                iconButton={
                                  <LightIconButton aria-label={t`More options`}>
                                    <IconDotsVertical />
                                  </LightIconButton>
                                }
                              />
                              <LightIconButton
                                aria-label={t`Unpin`}
                                onClick={(event) => {
                                  event.stopPropagation();
                                  handleTogglePin(item.id, true);
                                }}
                              >
                                <IconPinnedOff />
                              </LightIconButton>
                            </ButtonGroup>
                          }
                        />
                      </SelectableListItem>
                    }
                  />
                );
              })}
            />
          </SidePanelGroup>

          <SidePanelGroup heading={t`Other`}>
            {displayedOtherItems.map((item) => {
              const ItemIcon = isDefined(item.icon)
                ? getIcon(item.icon)
                : undefined;

              return (
                <SelectableListItem
                  key={item.id}
                  itemId={item.id}
                  onEnter={() => handleTogglePin(item.id, false)}
                >
                  <MenuItem
                    LeftComponent={
                      <AppMenuItemIcon
                        Icon={ItemIcon}
                        applicationId={item.applicationId}
                      />
                    }
                    text={getDisplayLabel(item)}
                    isIconDisplayedOnHoverOnly={false}
                    iconButtons={
                      <LightIconButton
                        aria-label={t`Pin`}
                        onClick={(event) => {
                          event.stopPropagation();
                          handleTogglePin(item.id, false);
                        }}
                      >
                        <IconPin />
                      </LightIconButton>
                    }
                  />
                </SelectableListItem>
              );
            })}
          </SidePanelGroup>
        </SidePanelList>
      </div>
    </div>
  );
};
