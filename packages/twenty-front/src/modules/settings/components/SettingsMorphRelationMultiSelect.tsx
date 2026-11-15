import { SelectOptionIcon } from '@/ui/input/components/SelectOptionIcon';
import { plural, t } from '@lingui/core/macro';
import { useRef, useState } from 'react';

import { useFilteredObjectMetadataItems } from '@/object-metadata/hooks/useFilteredObjectMetadataItems';
import { useObjectMetadataSelectHelpers } from '@/object-metadata/hooks/useObjectMetadataSelectHelpers';
import { isAdvancedRelationTargetObjectMetadata } from '@/object-metadata/utils/isAdvancedRelationTargetObjectMetadata';
import { isObjectMetadataEligibleAsRelationTarget } from '@/object-metadata/utils/isObjectMetadataEligibleAsRelationTarget';
import { MultiSelectControl } from '@/ui/input/components/MultiSelectControl';
import { getSelectDropdownInitialFocus } from '@/ui/input/components/internal/select/utils/getSelectDropdownInitialFocus';
import { isFocusMovingWithinSelect } from '@/ui/input/components/internal/select/utils/isFocusMovingWithinSelect';
import { type SelectCallToActionButton } from '@/ui/input/types/SelectCallToActionButton';
import { type SelectSizeVariant } from '@/ui/input/types/SelectSizeVariant';
import { DropdownContent } from '@/ui/layout/dropdown/components/DropdownContent';
import { DropdownRoot } from '@/ui/layout/dropdown/components/DropdownRoot';
import { GenericDropdownContentWidth } from '@/ui/layout/dropdown/constants/GenericDropdownContentWidth';
import { isNonEmptyArray, isNonEmptyString } from '@sniptt/guards';
import { isDefined } from 'twenty-shared/utils';
import { Dropdown } from 'twenty-ui/components/navigation';
import { IconBox } from 'twenty-ui/icon';
import * as stylex from '@stylexjs/stylex';
import {
  color,
  fontColor,
  fontSize,
  fontWeight,
  spacing,
  textLineHeight,
} from 'twenty-ui/theme/tokens.stylex';

type SettingsMorphRelationMultiSelectProps = {
  xstyle?: stylex.StyleXStyles;
  disabled?: boolean;
  selectSizeVariant?: SelectSizeVariant;
  dropdownId: string;
  dropdownWidth?: number;
  dropdownWidthAuto?: boolean;
  fullWidth?: boolean;
  label?: string;
  description?: string;
  onChange?: (value: string[]) => void;
  onBlur?: () => void;
  selectedObjectMetadataIds: string[];
  withSearchInput?: boolean;
  callToActionButton?: SelectCallToActionButton;
  hasRightElement?: boolean;
  error?: string;
};

const styles = stylex.create({
  container: {
    width: 'auto',
  },
  containerFullWidth: {
    width: '100%',
  },
  label: {
    color: fontColor['--t-font-color-light'],
    display: 'block',
    fontSize: fontSize['--t-font-size-xs'],
    fontWeight: fontWeight['--t-font-weight-semi-bold'],
    marginBottom: spacing['--t-spacing-1'],
  },
  description: {
    color: fontColor['--t-font-color-light'],
    fontSize: fontSize['--t-font-size-sm'],
    lineHeight: textLineHeight['--t-text-line-height-lg'],
  },
  error: {
    color: color['--t-color-red'],
    display: 'block',
    fontSize: fontSize['--t-font-size-xs'],
    marginTop: spacing['--t-spacing-1'],
  },
});

export const SettingsMorphRelationMultiSelect = ({
  xstyle,
  disabled: disabledFromProps,
  selectSizeVariant,
  dropdownId,
  dropdownWidth = GenericDropdownContentWidth.Medium,
  dropdownWidthAuto = false,
  fullWidth,
  label,
  description,
  onChange,
  onBlur,
  selectedObjectMetadataIds,
  withSearchInput,
  callToActionButton,
  hasRightElement,
  error,
}: SettingsMorphRelationMultiSelectProps) => {
  const dropdownContentRef = useRef<HTMLDivElement>(null);

  const [searchInputValue, setSearchInputValue] = useState('');

  const { getSelectIconPropsFromObjectMetadataItem } =
    useObjectMetadataSelectHelpers();
  const { activeObjectMetadataItems } = useFilteredObjectMetadataItems();

  const [localSelectedObjectMetadataIds, setLocalSelectedObjectMetadataIds] =
    useState<string[]>(selectedObjectMetadataIds);

  const options = activeObjectMetadataItems
    .filter(isObjectMetadataEligibleAsRelationTarget)
    .sort((item1, item2) =>
      item1.labelSingular.localeCompare(item2.labelSingular),
    )
    .map((objectMetadataItem) => ({
      label: objectMetadataItem.labelSingular,
      objectMetadataId: objectMetadataItem.id,
      isAdvanced: isAdvancedRelationTargetObjectMetadata(objectMetadataItem),
      ...getSelectIconPropsFromObjectMetadataItem(objectMetadataItem),
    }));

  const selectedOptions = options.filter((option) =>
    localSelectedObjectMetadataIds.includes(option.objectMetadataId),
  );

  const matchingOptions = isNonEmptyString(searchInputValue)
    ? options.filter(({ label: optionLabel }) =>
        optionLabel.toLowerCase().includes(searchInputValue.toLowerCase()),
      )
    : options;

  const regularOptions = matchingOptions.filter(
    ({ isAdvanced }) => !isAdvanced,
  );

  const advancedOptions = matchingOptions.filter(
    ({ isAdvanced }) => isAdvanced,
  );

  const isDisabled =
    disabledFromProps ||
    (options.length <= 1 && !isDefined(callToActionButton));

  const handleOptionToggle = (objectMetadataId: string) => {
    const newSelectedObjectMetadataIds =
      localSelectedObjectMetadataIds.includes(objectMetadataId)
        ? localSelectedObjectMetadataIds.filter(
            (selectedObjectMetadataId) =>
              selectedObjectMetadataId !== objectMetadataId,
          )
        : [...localSelectedObjectMetadataIds, objectMetadataId];

    setLocalSelectedObjectMetadataIds(newSelectedObjectMetadataIds);
    onChange?.(newSelectedObjectMetadataIds);
    onBlur?.();
  };

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      setSearchInputValue('');
    }
  };

  const renderOption = (option: (typeof options)[number]) => (
    <Dropdown.OptionItem
      key={option.objectMetadataId}
      selected={selectedObjectMetadataIds.includes(option.objectMetadataId)}
      onSelect={() => handleOptionToggle(option.objectMetadataId)}
      startIcon={
        <SelectOptionIcon
          Icon={option.Icon ?? undefined}
          color={option.iconThemeColor}
        />
      }
    >
      {option.label}
    </Dropdown.OptionItem>
  );

  const selectControl = (
    <MultiSelectControl
      selectedOptions={selectedOptions}
      fixedIcon={selectedOptions.length < 2 ? undefined : IconBox}
      fixedText={
        selectedOptions.length < 2
          ? undefined
          : plural(selectedOptions.length, {
              one: `# Object`,
              other: `# Objects`,
            })
      }
      isDisabled={isDisabled}
      selectSizeVariant={selectSizeVariant}
      hasRightElement={hasRightElement}
    />
  );

  return (
    <div
      {...stylex.props(
        styles.container,
        fullWidth && styles.containerFullWidth,
        xstyle,
      )}
      onBlur={(event) => {
        if (
          isFocusMovingWithinSelect({
            event,
            dropdownContent: dropdownContentRef.current,
          })
        ) {
          return;
        }

        onBlur?.();
      }}
    >
      {isNonEmptyString(label) && (
        <span {...stylex.props(styles.label)}>{label}</span>
      )}
      {isDisabled ? (
        selectControl
      ) : (
        <DropdownRoot
          dropdownId={dropdownId}
          type="picker"
          multiple
          onOpenChange={handleOpenChange}
        >
          <Dropdown.Trigger render={<div />} nativeButton={false}>
            {selectControl}
          </Dropdown.Trigger>
          <DropdownContent
            ref={dropdownContentRef}
            width={dropdownWidthAuto ? 'var(--anchor-width)' : dropdownWidth}
            align="start"
            initialFocus={
              withSearchInput
                ? undefined
                : () =>
                    getSelectDropdownInitialFocus(dropdownContentRef.current)
            }
            aria-label={isNonEmptyString(label) ? label : undefined}
          >
            {withSearchInput && (
              <Dropdown.Search
                value={searchInputValue}
                onValueChange={setSearchInputValue}
                placeholder={t`Search`}
                aria-label={t`Search`}
              />
            )}
            {withSearchInput && isNonEmptyArray(matchingOptions) && (
              <Dropdown.Separator />
            )}
            {isNonEmptyArray(matchingOptions) && (
              <Dropdown.Section scrollable>
                {isNonEmptyArray(regularOptions) && (
                  <Dropdown.Section>
                    {regularOptions.map(renderOption)}
                  </Dropdown.Section>
                )}
                {isNonEmptyArray(regularOptions) &&
                  isNonEmptyArray(advancedOptions) && <Dropdown.Separator />}
                {isNonEmptyArray(advancedOptions) && (
                  <Dropdown.Section label={t`Advanced`}>
                    {advancedOptions.map(renderOption)}
                  </Dropdown.Section>
                )}
              </Dropdown.Section>
            )}
            {isDefined(callToActionButton) &&
              isNonEmptyArray(matchingOptions) && <Dropdown.Separator />}
            {isDefined(callToActionButton) && (
              <Dropdown.Section>
                <Dropdown.ActionItem
                  onClick={callToActionButton.onClick}
                  closeOnClick={false}
                  startIcon={
                    <SelectOptionIcon Icon={callToActionButton.Icon} />
                  }
                >
                  {callToActionButton.text}
                </Dropdown.ActionItem>
              </Dropdown.Section>
            )}
          </DropdownContent>
        </DropdownRoot>
      )}
      {isNonEmptyString(description) && (
        <span {...stylex.props(styles.description)}>{description}</span>
      )}
      {isNonEmptyString(error) && (
        <span {...stylex.props(styles.error)}>{error}</span>
      )}
    </div>
  );
};
