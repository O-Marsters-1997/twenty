import { type EnrichedObjectMetadataItem } from '@/object-metadata/types/EnrichedObjectMetadataItem';
import { SettingsRolePermissionsObjectLevelObjectFormObjectLevelTableHeader } from '@/settings/roles/role-permissions/object-level-permissions/object-form/components/SettingsRolePermissionsObjectLevelObjectFormObjectLevelTableHeader';
import { SettingsRolePermissionsObjectLevelObjectFormObjectLevelTableRow } from '@/settings/roles/role-permissions/object-level-permissions/object-form/components/SettingsRolePermissionsObjectLevelObjectFormObjectLevelTableRow';
import { type SettingsRolePermissionsObjectLevelPermission } from '@/settings/roles/role-permissions/objects-permissions/types/SettingsRolePermissionsObjectPermission';
import { settingsDraftRoleFamilyState } from '@/settings/roles/states/settingsDraftRoleFamilyState';
import { useAtomFamilyStateValue } from '@/ui/utilities/state/jotai/hooks/useAtomFamilyStateValue';
import { t } from '@lingui/core/macro';
import { Section } from 'twenty-ui/components/layout';
import * as stylex from '@stylexjs/stylex';
import { borderColor, spacing } from 'twenty-ui/theme/tokens.stylex';

const styles = stylex.create({
  table: {
    borderBottomColor: borderColor['--t-border-color-light'],
    borderBottomStyle: 'solid',
    borderBottomWidth: '1px',
  },
  tableRows: {
    paddingBottom: spacing['--t-spacing-2'],
    paddingTop: spacing['--t-spacing-2'],
  },
});

type SettingsRolePermissionsObjectLevelObjectFormObjectLevelProps = {
  roleId: string;
  objectMetadataItem: EnrichedObjectMetadataItem;
};

export const SettingsRolePermissionsObjectLevelObjectFormObjectLevel = ({
  roleId,
  objectMetadataItem,
}: SettingsRolePermissionsObjectLevelObjectFormObjectLevelProps) => {
  const settingsDraftRole = useAtomFamilyStateValue(
    settingsDraftRoleFamilyState,
    roleId,
  );

  const settingsDraftRoleObjectPermissions =
    settingsDraftRole.objectPermissions?.find(
      (permission) => permission.objectMetadataId === objectMetadataItem.id,
    );

  const objectLabelPlural = objectMetadataItem.labelPlural;

  const objectPermissionsConfig: SettingsRolePermissionsObjectLevelPermission[] =
    [
      {
        key: 'canReadObjectRecords',
        label: t`See ${objectLabelPlural}`,
        value: settingsDraftRoleObjectPermissions?.canReadObjectRecords,
      },
      {
        key: 'canUpdateObjectRecords',
        label: t`Edit ${objectLabelPlural}`,
        value: settingsDraftRoleObjectPermissions?.canUpdateObjectRecords,
      },
      {
        key: 'canSoftDeleteObjectRecords',
        label: t`Delete ${objectLabelPlural}`,
        value: settingsDraftRoleObjectPermissions?.canSoftDeleteObjectRecords,
      },
      {
        key: 'canDestroyObjectRecords',
        label: t`Destroy ${objectLabelPlural}`,
        value: settingsDraftRoleObjectPermissions?.canDestroyObjectRecords,
      },
    ];

  return (
    <Section.Root>
      <Section.Header
        title={t`Object-Level`}
        description={t`Actions users can perform on this object`}
      />
      <div {...stylex.props(styles.table)}>
        <SettingsRolePermissionsObjectLevelObjectFormObjectLevelTableHeader />
        <div {...stylex.props(styles.tableRows)}>
          {objectPermissionsConfig.map((permission) => (
            <SettingsRolePermissionsObjectLevelObjectFormObjectLevelTableRow
              key={permission.key}
              permission={permission}
              isEditable={settingsDraftRole.isEditable}
              settingsDraftRoleObjectPermissions={
                settingsDraftRoleObjectPermissions
              }
              roleId={roleId}
              objectMetadataItemId={objectMetadataItem.id}
            />
          ))}
        </div>
      </div>
    </Section.Root>
  );
};
