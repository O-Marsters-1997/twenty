/* @license Enterprise */

import { t } from '@lingui/core/macro';
import { useContext } from 'react';
import { capitalize } from 'twenty-shared/utils';

import { AdvancedFilterLogicalOperatorDropdown } from '@/object-record/advanced-filter/components/AdvancedFilterLogicalOperatorDropdown';
import { ADVANCED_FILTER_LOGICAL_OPERATOR_OPTIONS } from '@/object-record/advanced-filter/constants/AdvancedFilterLogicalOperatorOptions';
import { DEFAULT_ADVANCED_FILTER_DROPDOWN_SIDE_OFFSET } from '@/object-record/advanced-filter/constants/DefaultAdvancedFilterDropdownSideOffset';
import { AdvancedFilterContext } from '@/object-record/advanced-filter/states/context/AdvancedFilterContext';
import { type RecordFilterGroup } from '@/object-record/record-filter-group/types/RecordFilterGroup';
import { Select } from '@/ui/input/components/Select';
import { GenericDropdownContentWidth } from '@/ui/layout/dropdown/constants/GenericDropdownContentWidth';
import * as stylex from '@stylexjs/stylex';
import { fontColor, spacing } from 'twenty-ui/theme/tokens.stylex';

const styles = stylex.create({
  text: {
    alignItems: 'center',
    color: fontColor['--t-font-color-tertiary'],
    display: 'flex',
    height: spacing['--t-spacing-8'],
    paddingLeft: spacing['--t-spacing-2'],
  },
  container: {
    alignItems: 'start',
    color: fontColor['--t-font-color-tertiary'],
    display: 'flex',
    minWidth: spacing['--t-spacing-16'],
  },
});

type SettingsRolePermissionsObjectLevelRecordLevelPermissionLogicalOperatorCellProps =
  {
    index: number;
    recordFilterGroup: RecordFilterGroup;
  };

export const SettingsRolePermissionsObjectLevelRecordLevelPermissionLogicalOperatorCell =
  ({
    index,
    recordFilterGroup,
  }: SettingsRolePermissionsObjectLevelRecordLevelPermissionLogicalOperatorCellProps) => {
    const { readonly } = useContext(AdvancedFilterContext);

    return (
      <div {...stylex.props(styles.container)}>
        {index === 0 ? (
          <div {...stylex.props(styles.text)}>{t`Where`}</div>
        ) : index === 1 ? (
          readonly ? (
            <Select
              dropdownWidth={GenericDropdownContentWidth.Narrow}
              dropdownId={`advanced-filter-logical-operator-${recordFilterGroup.id}`}
              value={recordFilterGroup.logicalOperator}
              options={ADVANCED_FILTER_LOGICAL_OPERATOR_OPTIONS}
              dropdownSideOffset={DEFAULT_ADVANCED_FILTER_DROPDOWN_SIDE_OFFSET}
              disabled
            />
          ) : (
            <AdvancedFilterLogicalOperatorDropdown
              recordFilterGroup={recordFilterGroup}
            />
          )
        ) : (
          <div {...stylex.props(styles.text)}>
            {capitalize(recordFilterGroup.logicalOperator.toLowerCase())}
          </div>
        )}
      </div>
    );
  };
