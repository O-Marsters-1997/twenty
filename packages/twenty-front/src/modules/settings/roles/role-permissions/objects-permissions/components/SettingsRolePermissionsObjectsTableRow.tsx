import { PermissionIcon } from '@/settings/roles/role-permissions/objects-permissions/components/PermissionIcon';
import { type SettingsRoleObjectPermissionKey } from '@/settings/roles/role-permissions/objects-permissions/constants/SettingsRoleObjectPermissionIconConfig';
import { type SettingsRolePermissionsObjectPermission } from '@/settings/roles/role-permissions/objects-permissions/types/SettingsRolePermissionsObjectPermission';
import { TableCell } from '@/ui/layout/table/components/TableCell';
import { TableRow } from '@/ui/layout/table/components/TableRow';
import { plural } from '@lingui/core/macro';
import { Checkbox } from 'twenty-ui/primitives/input';
import { themeCssVariables } from 'twenty-ui/theme';
import * as stylex from '@stylexjs/stylex';
import { fontColor, spacing } from 'twenty-ui/theme/tokens.stylex';

const styles = stylex.create({
  permissionContent: {
    gap: spacing['--t-spacing-2'],
    alignItems: 'center',
    display: 'flex',
    whiteSpace: 'nowrap',
  },
  permissionLabel: {
    color: fontColor['--t-font-color-primary'],
  },
  overrideInfo: {
    gap: spacing['--t-spacing-1'],
    alignItems: 'center',
    color: fontColor['--t-font-color-tertiary'],
    display: 'flex',
    whiteSpace: 'nowrap',
  },
});

type SettingsRolePermissionsObjectsTableRowProps = {
  permission: SettingsRolePermissionsObjectPermission;
  isEditable: boolean;
};

export const SettingsRolePermissionsObjectsTableRow = ({
  permission,
  isEditable,
}: SettingsRolePermissionsObjectsTableRowProps) => {
  const revokedBy = permission.revokedBy;
  const grantedBy = permission.grantedBy;
  const isRevoked =
    revokedBy !== undefined && revokedBy !== null && revokedBy > 0;
  const label = permission.label;
  const isDisabled = !isEditable;

  const handleRowClick = () => {
    if (isDisabled) return;

    permission.setValue(!permission.value);
  };

  return (
    <TableRow
      onClick={handleRowClick}
      cursor={isDisabled ? 'default' : 'pointer'}
    >
      <TableCell gap={themeCssVariables.spacing[1]}>
        <div {...stylex.props(styles.permissionContent)}>
          <PermissionIcon
            permission={permission.key as SettingsRoleObjectPermissionKey}
            state={isRevoked ? 'revoked' : 'granted'}
          />
          <span {...stylex.props(styles.permissionLabel)}>{label}</span>
        </div>
        <div {...stylex.props(styles.overrideInfo)}>
          {isRevoked && revokedBy > 0 ? (
            <>
              {' · '}
              {plural(revokedBy, {
                one: `Revoked for ${revokedBy} object`,
                other: `Revoked for ${revokedBy} objects`,
              })}
            </>
          ) : grantedBy && grantedBy > 0 ? (
            <>
              {' · '}
              {plural(grantedBy, {
                one: `Granted for ${grantedBy} object`,
                other: `Granted for ${grantedBy} objects`,
              })}
            </>
          ) : null}
        </div>
      </TableCell>
      <TableCell
        align="right"
        padding={`0 ${themeCssVariables.spacing[1]} 0 ${themeCssVariables.spacing[2]}`}
        onClick={(e) => e.stopPropagation()}
      >
        <Checkbox
          checked={permission.value ?? false}
          onCheckedChange={() => permission.setValue(!permission.value)}
          disabled={isDisabled}
          color={isRevoked ? 'warning' : 'accent'}
        />
      </TableCell>
    </TableRow>
  );
};
