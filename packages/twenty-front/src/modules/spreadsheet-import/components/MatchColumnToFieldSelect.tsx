import { useState } from 'react';
import { type ReadonlyDeep } from 'type-fest';
import * as stylex from '@stylexjs/stylex';
import {
  backgroundTransparent,
  borderColor,
  borderRadius,
} from 'twenty-ui/theme/tokens.stylex';

import { type FieldMetadataItem } from '@/object-metadata/types/FieldMetadataItem';
import { MatchColumnSelectFieldSelectDropdownContent } from '@/spreadsheet-import/components/MatchColumnSelectFieldSelectDropdownContent';
import { MatchColumnSelectSubFieldSelectDropdownContent } from '@/spreadsheet-import/components/MatchColumnSelectSubFieldSelectDropdownContent';
import { DO_NOT_IMPORT_OPTION_KEY } from '@/spreadsheet-import/constants/DoNotImportOptionKey';
import { type SpreadsheetImportFieldOption } from '@/spreadsheet-import/types/SpreadsheetImportFieldOption';
import { hasNestedFields } from '@/spreadsheet-import/utils/spreadsheetImportHasNestedFields';
import { DropdownContent } from '@/ui/layout/dropdown/components/DropdownContent';
import { DropdownRoot } from '@/ui/layout/dropdown/components/DropdownRoot';
import { GenericDropdownContentWidth } from '@/ui/layout/dropdown/constants/GenericDropdownContentWidth';
import { useLingui } from '@lingui/react/macro';
import { isDefined } from 'twenty-shared/utils';
import { Dropdown, MenuItem } from 'twenty-ui/components/navigation';
import { IconChevronDown } from 'twenty-ui/icon';
import { type SelectOption } from 'twenty-ui/primitives/input';

type MatchColumnToFieldSelectProps = {
  columnIndex: string;
  onChange: (value: ReadonlyDeep<SelectOption>) => void;
  value?: ReadonlyDeep<SelectOption>;
  options: readonly Readonly<SpreadsheetImportFieldOption>[];
  suggestedOptions: readonly ReadonlyDeep<SelectOption>[];
  placeholder?: string;
};

export const MatchColumnToFieldSelect = ({
  onChange,
  value,
  options,
  suggestedOptions,
  placeholder,
  columnIndex,
}: MatchColumnToFieldSelectProps) => {
  const { t } = useLingui();
  const dropdownId = `match-column-select-dropdown-${columnIndex}`;
  const [selectedFieldMetadataItem, setSelectedFieldMetadataItem] =
    useState<FieldMetadataItem | null>(null);

  const doNotImportOption = options.find(
    (option) => option.value === DO_NOT_IMPORT_OPTION_KEY,
  );

  const handleFieldMetadataItemSelect = (
    fieldMetadataItem: FieldMetadataItem,
  ) => {
    if (hasNestedFields(fieldMetadataItem)) {
      setSelectedFieldMetadataItem(fieldMetadataItem);
      return;
    }

    const correspondingOption = options.find(
      (option) => option.value === fieldMetadataItem.name,
    );

    if (isDefined(correspondingOption)) {
      onChange(correspondingOption);
    }
  };

  const handleSubFieldSelect = (subFieldName: string) => {
    const correspondingOption = options.find(
      (option) => option.value === subFieldName,
    );

    if (isDefined(correspondingOption)) {
      onChange(correspondingOption);
    }
  };

  return (
    <DropdownRoot
      dropdownId={dropdownId}
      type="picker"
      onOpenChange={(open) => {
        if (!open) {
          setSelectedFieldMetadataItem(null);
        }
      }}
    >
      <Dropdown.Trigger render={<div />} nativeButton={false}>
        <MenuItem
          className={stylex.props(styles.menuItem).className}
          LeftIcon={value?.Icon}
          text={value?.label ?? placeholder ?? ''}
          accent={isDefined(value) ? 'default' : 'placeholder'}
          RightIcon={IconChevronDown}
        />
      </Dropdown.Trigger>
      <DropdownContent
        align="start"
        width={GenericDropdownContentWidth.ExtraLarge}
        aria-label={t`Select matching field`}
      >
        <Dropdown.Page id="root">
          <MatchColumnSelectFieldSelectDropdownContent
            selectedValue={value}
            onSelectFieldMetadataItem={handleFieldMetadataItemSelect}
            onSelectSuggestedOption={onChange}
            onDoNotImportSelect={() => {
              if (isDefined(doNotImportOption)) {
                onChange(doNotImportOption);
              }
            }}
            suggestedOptions={suggestedOptions}
          />
        </Dropdown.Page>
        <Dropdown.Page id="sub-field">
          {isDefined(selectedFieldMetadataItem) && (
            <MatchColumnSelectSubFieldSelectDropdownContent
              fieldMetadataItem={selectedFieldMetadataItem}
              selectedValue={value}
              onSubFieldSelect={handleSubFieldSelect}
              options={options}
            />
          )}
        </Dropdown.Page>
      </DropdownContent>
    </DropdownRoot>
  );
};

const styles = stylex.create({
  menuItem: {
    borderColor: borderColor['--t-border-color-medium'],
    borderRadius: borderRadius['--t-border-radius-sm'],
    borderStyle: 'solid',
    borderWidth: '1px',
    backgroundColor:
      backgroundTransparent['--t-background-transparent-lighter'],
  },
});
