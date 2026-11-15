import { type ComponentProps } from 'react';
import * as stylex from '@stylexjs/stylex';
import React from 'react';
import {
  borderColor,
  borderRadius,
  fontColor,
  fontSize,
  spacing,
} from 'twenty-ui/theme/tokens.stylex';

import { objectFilterDropdownSearchInputComponentState } from '@/object-record/object-filter-dropdown/states/objectFilterDropdownSearchInputComponentState';

import { DropdownMenuSeparator } from '@/ui/layout/dropdown/components/DropdownMenuSeparator';
import { SelectableList } from '@/ui/layout/selectable-list/components/SelectableList';

import { useFilterDropdownSelectableFieldMetadataItems } from '@/object-record/object-filter-dropdown/hooks/useFilterDropdownSelectableFieldMetadataItems';
import { LegacyDropdownContent } from '@/ui/layout/dropdown/components/LegacyDropdownContent';
import { DropdownMenuSectionLabel } from '@/ui/layout/dropdown/components/DropdownMenuSectionLabel';
import { useAtomComponentState } from '@/ui/utilities/state/jotai/hooks/useAtomComponentState';
import { ViewBarFilterDropdownBottomMenu } from '@/views/components/ViewBarFilterDropdownBottomMenu';
import { ViewBarFilterDropdownFieldSelectMenuItem } from '@/views/components/ViewBarFilterDropdownFieldSelectMenuItem';

import { DropdownMenuHeader } from '@/ui/layout/dropdown/components/DropdownMenuHeader/DropdownMenuHeader';
import { DropdownMenuHeaderLeftComponent } from '@/ui/layout/dropdown/components/DropdownMenuHeader/internal/DropdownMenuHeaderLeftComponent';
import { DropdownMenuItemsContainer } from '@/ui/layout/dropdown/components/DropdownMenuItemsContainer';
import { GenericDropdownContentWidth } from '@/ui/layout/dropdown/constants/GenericDropdownContentWidth';
import { useCloseDropdown } from '@/ui/layout/dropdown/hooks/useCloseDropdown';
import { ScrollWrapper } from '@/ui/utilities/scroll/components/ScrollWrapper';
import { VIEW_BAR_FILTER_BOTTOM_MENU_ITEM_IDS } from '@/views/constants/ViewBarFilterBottomMenuItemIds';
import { DropdownComponentInstanceContext } from '@/ui/layout/dropdown/contexts/DropdownComponentInstanceContext';
import { useAvailableComponentInstanceIdOrThrow } from '@/ui/utilities/state/component-state/hooks/useAvailableComponentInstanceIdOrThrow';
import { useLingui } from '@lingui/react/macro';
import { IconX } from 'twenty-ui/icon';

const styles = stylex.create({
  input: {
    backgroundColor: 'transparent',
    borderBottomColor: borderColor['--t-border-color-light'],
    borderBottomStyle: 'solid',
    borderBottomWidth: '1px',
    borderLeftWidth: 0,
    borderRightWidth: 0,
    borderTopLeftRadius: borderRadius['--t-border-radius-md'],
    borderTopRightRadius: borderRadius['--t-border-radius-md'],
    borderTopWidth: 0,
    color: fontColor['--t-font-color-primary'],
    fontFamily: 'inherit',
    fontSize: fontSize['--t-font-size-sm'],
    fontWeight: 'inherit',
    margin: 0,
    maxWidth: '100%',
    minHeight: '19px',
    outline: 'none',
    overflow: 'hidden',
    padding: spacing['--t-spacing-2'],
    textDecoration: 'none',
    '::placeholder': { color: fontColor['--t-font-color-light'] },
  },
});

export const StyledInput = (props: ComponentProps<'input'>) => (
  <input {...props} {...stylex.props(styles.input)} />
);

export const ViewBarFilterDropdownFieldSelectMenu = () => {
  const [objectFilterDropdownSearchInput, setObjectFilterDropdownSearchInput] =
    useAtomComponentState(objectFilterDropdownSearchInputComponentState);

  const {
    selectableHiddenFieldMetadataItems,
    selectableVisibleFieldMetadataItems,
  } = useFilterDropdownSelectableFieldMetadataItems();

  const { closeDropdown } = useCloseDropdown();
  const dropdownId = useAvailableComponentInstanceIdOrThrow(
    DropdownComponentInstanceContext,
  );

  const selectableFieldMetadataItemIds = [
    ...selectableVisibleFieldMetadataItems.map(
      (fieldMetadataItem) => fieldMetadataItem.id,
    ),
    ...selectableHiddenFieldMetadataItems.map(
      (fieldMetadataItem) => fieldMetadataItem.id,
    ),
    VIEW_BAR_FILTER_BOTTOM_MENU_ITEM_IDS.SEARCH,
    VIEW_BAR_FILTER_BOTTOM_MENU_ITEM_IDS.ADVANCED_FILTER,
  ];

  const shouldShowSeparator =
    selectableVisibleFieldMetadataItems.length > 0 &&
    selectableHiddenFieldMetadataItems.length > 0;

  const hasSelectableItems =
    selectableVisibleFieldMetadataItems.length > 0 ||
    selectableHiddenFieldMetadataItems.length > 0;

  const shouldShowVisibleFields =
    selectableVisibleFieldMetadataItems.length > 0;
  const shouldShowHiddenFields = selectableHiddenFieldMetadataItems.length > 0;

  const { t } = useLingui();

  return (
    <LegacyDropdownContent
      widthInPixels={GenericDropdownContentWidth.ExtraLarge}
    >
      <DropdownMenuHeader
        StartComponent={
          <DropdownMenuHeaderLeftComponent
            onClick={() => closeDropdown()}
            Icon={IconX}
          />
        }
      >
        {t`Filter`}
      </DropdownMenuHeader>
      <ScrollWrapper componentInstanceId="view-bar-dropdown-filter-field-select-menu">
        <StyledInput
          value={objectFilterDropdownSearchInput}
          autoFocus
          placeholder={t`Search fields`}
          onChange={(event: React.ChangeEvent<HTMLInputElement>) =>
            setObjectFilterDropdownSearchInput(event.target.value)
          }
        />
        <SelectableList
          selectableItemIdArray={selectableFieldMetadataItemIds}
          selectableListInstanceId={`${dropdownId}-field-list`}
          focusId={dropdownId}
        >
          {shouldShowVisibleFields && (
            <>
              <DropdownMenuSectionLabel label={t`Visible fields`} />
              <DropdownMenuItemsContainer scrollable={false}>
                {selectableVisibleFieldMetadataItems.map(
                  (visibleFieldMetadataItem) => (
                    <ViewBarFilterDropdownFieldSelectMenuItem
                      key={visibleFieldMetadataItem.id}
                      fieldMetadataItemToSelect={visibleFieldMetadataItem}
                    />
                  ),
                )}
              </DropdownMenuItemsContainer>
            </>
          )}
          {shouldShowSeparator && <DropdownMenuSeparator />}
          {shouldShowHiddenFields && (
            <>
              <DropdownMenuSectionLabel label={t`Hidden fields`} />
              <DropdownMenuItemsContainer scrollable={false}>
                {selectableHiddenFieldMetadataItems.map(
                  (hiddenFieldMetadataItem) => (
                    <ViewBarFilterDropdownFieldSelectMenuItem
                      key={hiddenFieldMetadataItem.id}
                      fieldMetadataItemToSelect={hiddenFieldMetadataItem}
                    />
                  ),
                )}
              </DropdownMenuItemsContainer>
            </>
          )}
          {hasSelectableItems && <DropdownMenuSeparator />}
          <ViewBarFilterDropdownBottomMenu />
        </SelectableList>
      </ScrollWrapper>
    </LegacyDropdownContent>
  );
};
