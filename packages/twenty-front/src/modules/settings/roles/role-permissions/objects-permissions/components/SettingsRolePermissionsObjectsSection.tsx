import { SettingsRolePermissionsObjectsTableHeader } from '@/settings/roles/role-permissions/objects-permissions/components/SettingsRolePermissionsObjectsTableHeader';
import { SettingsRolePermissionsObjectsTableRow } from '@/settings/roles/role-permissions/objects-permissions/components/SettingsRolePermissionsObjectsTableRow';
import { type SettingsRolePermissionsObjectPermission } from '@/settings/roles/role-permissions/objects-permissions/types/SettingsRolePermissionsObjectPermission';
import { settingsDraftRoleFamilyState } from '@/settings/roles/states/settingsDraftRoleFamilyState';
import { useAtomFamilyStateValue } from '@/ui/utilities/state/jotai/hooks/useAtomFamilyStateValue';
import { useSetAtomFamilyState } from '@/ui/utilities/state/jotai/hooks/useSetAtomFamilyState';
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

type SettingsRolePermissionsObjectsSectionProps = {
  roleId: string;
  isEditable: boolean;
};

export const SettingsRolePermissionsObjectsSection = ({
  roleId,
  isEditable,
}: SettingsRolePermissionsObjectsSectionProps) => {
  const settingsDraftRole = useAtomFamilyStateValue(
    settingsDraftRoleFamilyState,
    roleId,
  );
  const setSettingsDraftRole = useSetAtomFamilyState(
    settingsDraftRoleFamilyState,
    roleId,
  );

  const objectPermissions = settingsDraftRole.objectPermissions;

  const objectPermissionsConfig: SettingsRolePermissionsObjectPermission[] = [
    {
      key: 'canReadObjectRecords',
      label: t`See Records on All Objects`,
      grantedBy:
        objectPermissions?.filter(
          (permission) =>
            permission.canReadObjectRecords === true &&
            settingsDraftRole.canReadAllObjectRecords === false,
        )?.length ?? 0,
      revokedBy:
        objectPermissions?.filter(
          (permission) =>
            permission.canReadObjectRecords === false &&
            settingsDraftRole.canReadAllObjectRecords === true,
        )?.length ?? 0,
      value: settingsDraftRole.canReadAllObjectRecords,
      setValue: (value: boolean) => {
        setSettingsDraftRole({
          ...settingsDraftRole,
          canReadAllObjectRecords: value,
          ...(value === false
            ? {
                canUpdateAllObjectRecords: value,
                canSoftDeleteAllObjectRecords: value,
                canDestroyAllObjectRecords: value,
              }
            : {}),
        });
      },
    },
    {
      key: 'canUpdateObjectRecords',
      label: t`Edit Records on All Objects`,
      grantedBy:
        objectPermissions?.filter(
          (permission) =>
            permission.canUpdateObjectRecords === true &&
            settingsDraftRole.canUpdateAllObjectRecords === false,
        )?.length ?? 0,
      revokedBy:
        objectPermissions?.filter(
          (permission) =>
            permission.canUpdateObjectRecords === false &&
            settingsDraftRole.canUpdateAllObjectRecords === true,
        )?.length ?? 0,
      value: settingsDraftRole.canUpdateAllObjectRecords,
      setValue: (value: boolean) => {
        setSettingsDraftRole({
          ...settingsDraftRole,
          canUpdateAllObjectRecords: value,
          ...(value === true
            ? {
                canReadAllObjectRecords: value,
              }
            : {}),
        });
      },
    },
    {
      key: 'canSoftDeleteObjectRecords',
      label: t`Delete Records on All Objects`,
      grantedBy:
        objectPermissions?.filter(
          (permission) =>
            permission.canSoftDeleteObjectRecords === true &&
            settingsDraftRole.canSoftDeleteAllObjectRecords === false,
        )?.length ?? 0,
      revokedBy:
        objectPermissions?.filter(
          (permission) =>
            permission.canSoftDeleteObjectRecords === false &&
            settingsDraftRole.canSoftDeleteAllObjectRecords === true,
        )?.length ?? 0,
      value: settingsDraftRole.canSoftDeleteAllObjectRecords,
      setValue: (value: boolean) => {
        setSettingsDraftRole({
          ...settingsDraftRole,
          canSoftDeleteAllObjectRecords: value,
          ...(value === true
            ? {
                canReadAllObjectRecords: value,
              }
            : {}),
        });
      },
    },
    {
      key: 'canDestroyObjectRecords',
      label: t`Destroy Records on All Objects`,
      grantedBy:
        objectPermissions?.filter(
          (permission) =>
            permission.canDestroyObjectRecords === true &&
            settingsDraftRole.canDestroyAllObjectRecords === false,
        )?.length ?? 0,
      revokedBy:
        objectPermissions?.filter(
          (permission) =>
            permission.canDestroyObjectRecords === false &&
            settingsDraftRole.canDestroyAllObjectRecords === true,
        )?.length ?? 0,
      value: settingsDraftRole.canDestroyAllObjectRecords,
      setValue: (value: boolean) => {
        setSettingsDraftRole({
          ...settingsDraftRole,
          canDestroyAllObjectRecords: value,
          ...(value === true
            ? {
                canReadAllObjectRecords: value,
              }
            : {}),
        });
      },
    },
  ];

  return (
    <Section.Root>
      <Section.Header
        title={t`Objects`}
        description={t`Objects and fields permissions settings`}
      />
      <div {...stylex.props(styles.table)}>
        <SettingsRolePermissionsObjectsTableHeader
          roleId={roleId}
          objectPermissionsConfig={objectPermissionsConfig}
          isEditable={isEditable}
        />
        <div {...stylex.props(styles.tableRows)}>
          {objectPermissionsConfig.map((permission) => (
            <SettingsRolePermissionsObjectsTableRow
              key={permission.key}
              permission={permission}
              isEditable={isEditable}
            />
          ))}
        </div>
      </div>
    </Section.Root>
  );
};
