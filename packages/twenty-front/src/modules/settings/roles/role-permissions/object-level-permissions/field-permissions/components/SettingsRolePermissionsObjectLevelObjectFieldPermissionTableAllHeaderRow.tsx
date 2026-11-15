import { type EnrichedObjectMetadataItem } from '@/object-metadata/types/EnrichedObjectMetadataItem';
import { FIELD_LEVEL_PERMISSION_TABLE_GRID_TEMPLATE_COLUMNS } from '@/settings/roles/role-permissions/object-level-permissions/field-permissions/constants/FieldLevelPermissionTableGridTemplateColumns';
import { useObjectPermissionDerivedStates } from '@/settings/roles/role-permissions/object-level-permissions/field-permissions/hooks/useObjectPermissionDerivedStates';
import { useRemoveReadOverrideOnAllFieldsOfObject } from '@/settings/roles/role-permissions/object-level-permissions/field-permissions/hooks/useRemoveReadOverrideOnAllFieldsOfObject';
import { useRemoveUpdateOverrideOnAllFieldsOfObject } from '@/settings/roles/role-permissions/object-level-permissions/field-permissions/hooks/useRemoveUpdateOverrideOnAllFieldsOfObject';
import { useRestrictReadOnAllFieldsOfObject } from '@/settings/roles/role-permissions/object-level-permissions/field-permissions/hooks/useRestrictReadOnAllFieldsOfObject';
import { useRestrictUpdateOnAllFieldsOfObject } from '@/settings/roles/role-permissions/object-level-permissions/field-permissions/hooks/useRestrictUpdateOnAllFieldsOfObject';
import { OverridableCheckbox } from '@/settings/roles/role-permissions/object-level-permissions/object-form/components/OverridableCheckbox';
import { settingsDraftRoleFamilyState } from '@/settings/roles/states/settingsDraftRoleFamilyState';
import { useAtomFamilyStateValue } from '@/ui/utilities/state/jotai/hooks/useAtomFamilyStateValue';
import { useLingui } from '@lingui/react/macro';
import * as stylex from '@stylexjs/stylex';
import {
  backgroundTransparent,
  borderColor,
  fontColor,
  fontWeight,
  spacing,
} from 'twenty-ui/theme/tokens.stylex';

const styles = stylex.create({
  sectionHeader: (gridTemplateColumns: string) => ({
    alignItems: 'center',
    backgroundColor:
      backgroundTransparent['--t-background-transparent-lighter'],
    borderBottomColor: borderColor['--t-border-color-light'],
    borderBottomStyle: 'solid',
    borderBottomWidth: '1px',
    display: 'grid',
    gridTemplateColumns,
    height: spacing['--t-spacing-6'],
    paddingLeft: spacing['--t-spacing-2'],
  }),
  displayLabel: {
    color: fontColor['--t-font-color-light'],
    fontSize: '11px',
    fontWeight: fontWeight['--t-font-weight-semi-bold'],
  },
  checkboxContainer: {
    display: 'flex',
    justifyContent: 'flex-end',
    paddingRight: spacing['--t-spacing-1'],
  },
});

export const SettingsRolePermissionsObjectLevelObjectFieldPermissionTableAllHeaderRow =
  ({
    roleId,
    objectMetadataItem,
  }: {
    roleId: string;
    objectMetadataItem: EnrichedObjectMetadataItem;
  }) => {
    const { t } = useLingui();

    const settingsDraftRole = useAtomFamilyStateValue(
      settingsDraftRoleFamilyState,
      roleId,
    );

    const { cannotAllowFieldReadRestrict, cannotAllowFieldUpdateRestrict } =
      useObjectPermissionDerivedStates({
        roleId,
        objectMetadataItemId: objectMetadataItem.id,
      });

    const fieldPermissionsForThisObject =
      settingsDraftRole.fieldPermissions?.filter(
        (fieldPermissionToFilter) =>
          fieldPermissionToFilter.objectMetadataId === objectMetadataItem.id,
      ) ?? [];

    const hasAnyRestrictionOnRead = fieldPermissionsForThisObject.some(
      (fieldPermission) => fieldPermission.canReadFieldValue === false,
    );

    const hasAnyRestrictionOnUpdate = fieldPermissionsForThisObject.some(
      (fieldPermission) => fieldPermission.canUpdateFieldValue === false,
    );

    const { restrictReadOnAllFieldsOfObject } =
      useRestrictReadOnAllFieldsOfObject({ roleId });

    const { removeReadOverrideOnAllFieldsOfObject } =
      useRemoveReadOverrideOnAllFieldsOfObject({ roleId });

    const { removeUpdateOverrideOnAllFieldsOfObject } =
      useRemoveUpdateOverrideOnAllFieldsOfObject({ roleId });

    const { restrictUpdateOnAllFieldsOfObject } =
      useRestrictUpdateOnAllFieldsOfObject({ roleId });

    const handleReadAllChange = () => {
      if (hasAnyRestrictionOnRead) {
        removeReadOverrideOnAllFieldsOfObject(objectMetadataItem);
      } else {
        restrictReadOnAllFieldsOfObject(objectMetadataItem);
      }
    };

    const handleUpdateAllChange = () => {
      if (hasAnyRestrictionOnUpdate) {
        removeUpdateOverrideOnAllFieldsOfObject(objectMetadataItem);
      } else {
        restrictUpdateOnAllFieldsOfObject(objectMetadataItem);
      }
    };

    const shouldShowSeeTableHeader = !cannotAllowFieldReadRestrict;
    const shouldShowUpdateTableHeader =
      !cannotAllowFieldReadRestrict && !cannotAllowFieldUpdateRestrict;
    const shouldShowEmptyTableHeader = cannotAllowFieldUpdateRestrict;

    return (
      <>
        <div
          {...stylex.props(
            styles.sectionHeader(
              FIELD_LEVEL_PERMISSION_TABLE_GRID_TEMPLATE_COLUMNS,
            ),
          )}
        >
          <div {...stylex.props(styles.displayLabel)}>{t`All`}</div>
          <div></div>
          <>
            {shouldShowEmptyTableHeader && <div />}
            {shouldShowSeeTableHeader && (
              <div {...stylex.props(styles.checkboxContainer)}>
                <OverridableCheckbox
                  disabled={false}
                  checked={true}
                  onChange={handleReadAllChange}
                  type={hasAnyRestrictionOnRead ? 'override' : 'default'}
                />
              </div>
            )}
            {shouldShowUpdateTableHeader && (
              <div {...stylex.props(styles.checkboxContainer)}>
                <OverridableCheckbox
                  disabled={false}
                  checked={true}
                  onChange={handleUpdateAllChange}
                  type={hasAnyRestrictionOnUpdate ? 'override' : 'default'}
                />
              </div>
            )}
          </>
        </div>
      </>
    );
  };
