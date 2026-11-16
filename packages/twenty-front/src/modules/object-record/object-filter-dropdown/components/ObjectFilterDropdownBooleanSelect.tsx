import { t } from '@lingui/core/macro';
import { useTheme } from 'twenty-ui/theme';

import { useApplyObjectFilterDropdownFilterValue } from '@/object-record/object-filter-dropdown/hooks/useApplyObjectFilterDropdownFilterValue';
import { useObjectFilterDropdownFilterValue } from '@/object-record/object-filter-dropdown/hooks/useObjectFilterDropdownFilterValue';
import { BooleanDisplay } from '@/ui/field/display/components/BooleanDisplay';
import { LegacyDropdownContent } from '@/ui/layout/dropdown/components/LegacyDropdownContent';
import { DropdownMenuItemsContainer } from '@/ui/layout/dropdown/components/DropdownMenuItemsContainer';
import { GenericDropdownContentWidth } from '@/ui/layout/dropdown/constants/GenericDropdownContentWidth';
import { useCloseDropdown } from '@/ui/layout/dropdown/hooks/useCloseDropdown';
import { SelectableList } from '@/ui/layout/selectable-list/components/SelectableList';
import { ObjectFilterDropdownComponentInstanceContext } from '@/object-record/object-filter-dropdown/states/contexts/ObjectFilterDropdownComponentInstanceContext';
import { useAvailableComponentInstanceIdOrThrow } from '@/ui/utilities/state/component-state/hooks/useAvailableComponentInstanceIdOrThrow';
import { IconCheck } from 'twenty-ui/icon';
import * as stylex from '@stylexjs/stylex';
import {
  backgroundTransparent,
  borderRadius,
  fontColor,
  spacing,
} from 'twenty-ui/theme/tokens.stylex';

const styles = stylex.create({
  booleanSelectContainer: {
    alignItems: 'center',
    borderTopLeftRadius: borderRadius['--t-border-radius-sm'],
    borderTopRightRadius: borderRadius['--t-border-radius-sm'],
    borderBottomRightRadius: borderRadius['--t-border-radius-sm'],
    borderBottomLeftRadius: borderRadius['--t-border-radius-sm'],
    color: fontColor['--t-font-color-primary'],
    cursor: 'pointer',
    display: 'flex',
    paddingTop: spacing['--t-spacing-2'],
    paddingRight: spacing['--t-spacing-2'],
    paddingBottom: spacing['--t-spacing-2'],
    paddingLeft: spacing['--t-spacing-1'],
    background: {
      default: null,
      ':hover': backgroundTransparent['--t-background-transparent-light'],
    },
  },
  iconCheckContainer: {
    display: 'flex',
    flex: '1',
    justifyContent: 'flex-end',
  },
});

export const ObjectFilterDropdownBooleanSelect = () => {
  const objectFilterDropdownComponentInstanceId =
    useAvailableComponentInstanceIdOrThrow(
      ObjectFilterDropdownComponentInstanceContext,
    );
  const theme = useTheme();
  const options = [true, false];

  const { objectFilterDropdownFilterValue } =
    useObjectFilterDropdownFilterValue();

  const { applyObjectFilterDropdownFilterValue } =
    useApplyObjectFilterDropdownFilterValue();

  const { closeDropdown } = useCloseDropdown();

  const handleOptionSelect = (newValue: boolean) => {
    applyObjectFilterDropdownFilterValue(
      newValue.toString(),
      newValue ? t`True` : t`False`,
    );

    closeDropdown();
  };

  return (
    <LegacyDropdownContent
      widthInPixels={GenericDropdownContentWidth.ExtraLarge}
    >
      <SelectableList
        selectableListInstanceId={`${objectFilterDropdownComponentInstanceId}-boolean-select`}
        selectableItemIdArray={options.map((option) => option.toString())}
        focusId="boolean-select"
      >
        <DropdownMenuItemsContainer hasMaxHeight>
          {options.map((option) => (
            <div
              key={String(option)}
              onClick={() => handleOptionSelect(option)}
              {...stylex.props(styles.booleanSelectContainer)}
            >
              <BooleanDisplay value={option} />
              {objectFilterDropdownFilterValue === option.toString() && (
                <div {...stylex.props(styles.iconCheckContainer)}>
                  <IconCheck color={theme.grayScale.gray11} size={16} />
                </div>
              )}
            </div>
          ))}
        </DropdownMenuItemsContainer>
      </SelectableList>
    </LegacyDropdownContent>
  );
};
