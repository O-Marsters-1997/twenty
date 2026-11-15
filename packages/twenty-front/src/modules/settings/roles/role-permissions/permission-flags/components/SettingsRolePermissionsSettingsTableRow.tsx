import { SettingsItemTypeTag } from '@/settings/components/SettingsItemTypeTag';
import { type SettingsRolePermissionsSettingPermission } from '@/settings/roles/role-permissions/permission-flags/types/SettingsRolePermissionsSettingPermission';
import { settingsDraftRoleFamilyState } from '@/settings/roles/states/settingsDraftRoleFamilyState';
import { TableCell } from '@/ui/layout/table/components/TableCell';
import { useAtomFamilyStateValue } from '@/ui/utilities/state/jotai/hooks/useAtomFamilyStateValue';
import { useSetAtomFamilyState } from '@/ui/utilities/state/jotai/hooks/useSetAtomFamilyState';
import { TableRow } from '@/ui/layout/table/components/TableRow';
import { Checkbox } from 'twenty-ui/primitives/input';
import { useTheme, themeCssVariables } from 'twenty-ui/theme';
import { v4 } from 'uuid';
import * as stylex from '@stylexjs/stylex';
import { fontColor } from 'twenty-ui/theme/tokens.stylex';

const styles = stylex.create({
  name: {
    color: fontColor['--t-font-color-primary'],
  },
  description: {
    color: fontColor['--t-font-color-secondary'],
  },
  iconContainer: {
    alignItems: 'center',
    display: 'flex',
    justifyContent: 'center',
  },
});

type SettingsRolePermissionsSettingsTableRowProps = {
  roleId: string;
  permission: SettingsRolePermissionsSettingPermission;
  isEditable: boolean;
  isToolPermission?: boolean;
};

export const SettingsRolePermissionsSettingsTableRow = ({
  roleId,
  permission,
  isEditable,
}: SettingsRolePermissionsSettingsTableRowProps) => {
  const theme = useTheme();
  const settingsDraftRole = useAtomFamilyStateValue(
    settingsDraftRoleFamilyState,
    roleId,
  );
  const setSettingsDraftRole = useSetAtomFamilyState(
    settingsDraftRoleFamilyState,
    roleId,
  );

  const isPermissionEnabled =
    settingsDraftRole.permissionFlags?.some(
      (permissionFlag) => permissionFlag.flag === permission.key,
    ) ?? false;

  const isAllSettingsOverride =
    !permission.isToolPermission &&
    settingsDraftRole.canUpdateAllSettings === true;
  const isAllToolsOverride =
    permission.isToolPermission && settingsDraftRole.canAccessAllTools === true;
  const isChecked = Boolean(
    isPermissionEnabled || isAllSettingsOverride || isAllToolsOverride,
  );
  const isDisabled = Boolean(
    !isEditable || isAllSettingsOverride || isAllToolsOverride,
  );

  const handleChange = (value: boolean) => {
    const currentPermissions = settingsDraftRole.permissionFlags ?? [];

    if (value === true) {
      setSettingsDraftRole({
        ...settingsDraftRole,
        permissionFlags: [
          ...currentPermissions,
          {
            id: v4(),
            flag: permission.key,
            roleId,
          },
        ],
      });
    } else {
      setSettingsDraftRole({
        ...settingsDraftRole,
        permissionFlags: currentPermissions.filter(
          (p) => p.flag !== permission.key,
        ),
      });
    }
  };

  const handleRowClick = () => {
    if (isDisabled) return;
    handleChange(!isChecked);
  };

  return (
    <TableRow
      key={permission.key}
      gridAutoColumns="3fr 2fr 4fr 24px"
      onClick={handleRowClick}
      cursor={isDisabled ? 'default' : 'pointer'}
    >
      <TableCell gap={themeCssVariables.spacing[2]}>
        <div {...stylex.props(styles.iconContainer)}>
          <permission.Icon
            size={theme.icon.size.md}
            color={theme.font.color.primary}
            stroke={theme.icon.stroke.sm}
          />
        </div>
        <span {...stylex.props(styles.name)}>{permission.name}</span>
      </TableCell>
      <TableCell>
        <SettingsItemTypeTag item={permission} />
      </TableCell>
      <TableCell gap={themeCssVariables.spacing[2]}>
        <span {...stylex.props(styles.description)}>
          {permission.description}
        </span>
      </TableCell>
      <TableCell
        align="right"
        padding={`0 ${themeCssVariables.spacing[1]} 0 ${themeCssVariables.spacing[2]}`}
        onClick={(e) => e.stopPropagation()}
      >
        <Checkbox
          aria-label={permission.name}
          checked={isChecked}
          disabled={isDisabled}
          onCheckedChange={(isChecked) => handleChange(isChecked)}
        />
      </TableCell>
    </TableRow>
  );
};
