/* @license Enterprise */

import { AdvancedFilterSidePanelRecordFilterOperandSelect } from '@/object-record/advanced-filter/side-panel/components/AdvancedFilterSidePanelRecordFilterOperandSelect';
import { AdvancedFilterRecordFilterOptionsDropdown } from '@/object-record/advanced-filter/components/AdvancedFilterRecordFilterOptionsDropdown';
import { getAdvancedFilterObjectFilterDropdownComponentInstanceId } from '@/object-record/advanced-filter/utils/getAdvancedFilterObjectFilterDropdownComponentInstanceId';
import { ObjectFilterDropdownComponentInstanceContext } from '@/object-record/object-filter-dropdown/states/contexts/ObjectFilterDropdownComponentInstanceContext';
import { type RecordFilterGroup } from '@/object-record/record-filter-group/types/RecordFilterGroup';
import { type RecordFilter } from '@/object-record/record-filter/types/RecordFilter';
import { SettingsRolePermissionsObjectLevelRecordLevelPermissionFieldSelect } from '@/settings/roles/role-permissions/object-level-permissions/record-level-permissions/components/SettingsRolePermissionsObjectLevelRecordLevelPermissionFieldSelect';
import { SettingsRolePermissionsObjectLevelRecordLevelPermissionLogicalOperatorCell } from '@/settings/roles/role-permissions/object-level-permissions/record-level-permissions/components/SettingsRolePermissionsObjectLevelRecordLevelPermissionLogicalOperatorCell';
import { SettingsRolePermissionsObjectLevelRecordLevelPermissionValueInput } from '@/settings/roles/role-permissions/object-level-permissions/record-level-permissions/components/SettingsRolePermissionsObjectLevelRecordLevelPermissionValueInput';
import * as stylex from '@stylexjs/stylex';
import { spacing } from 'twenty-ui/theme/tokens.stylex';

const styles = stylex.create({
  filterRow: {
    gap: spacing['--t-spacing-2'],
    alignItems: 'center',
    display: 'flex',
    flexDirection: 'row',
  },
  operandSelectContainer: {
    width: '50px',
  },
});

type SettingsRolePermissionsObjectLevelRecordLevelPermissionFilterRowProps = {
  recordFilter: RecordFilter;
  index: number;
  recordFilterGroup: RecordFilterGroup;
};

export const SettingsRolePermissionsObjectLevelRecordLevelPermissionFilterRow =
  ({
    recordFilter,
    index,
    recordFilterGroup,
  }: SettingsRolePermissionsObjectLevelRecordLevelPermissionFilterRowProps) => {
    return (
      <ObjectFilterDropdownComponentInstanceContext.Provider
        value={{
          instanceId: getAdvancedFilterObjectFilterDropdownComponentInstanceId(
            recordFilter.id,
          ),
        }}
      >
        <div {...stylex.props(styles.filterRow)}>
          <SettingsRolePermissionsObjectLevelRecordLevelPermissionLogicalOperatorCell
            index={index}
            recordFilterGroup={recordFilterGroup}
          />
          <SettingsRolePermissionsObjectLevelRecordLevelPermissionFieldSelect
            recordFilterId={recordFilter.id}
          />
          <div {...stylex.props(styles.operandSelectContainer)}>
            <AdvancedFilterSidePanelRecordFilterOperandSelect
              recordFilterId={recordFilter.id}
            />
          </div>
          <SettingsRolePermissionsObjectLevelRecordLevelPermissionValueInput
            recordFilterId={recordFilter.id}
          />
          <AdvancedFilterRecordFilterOptionsDropdown
            recordFilterId={recordFilter.id}
          />
        </div>
      </ObjectFilterDropdownComponentInstanceContext.Provider>
    );
  };
