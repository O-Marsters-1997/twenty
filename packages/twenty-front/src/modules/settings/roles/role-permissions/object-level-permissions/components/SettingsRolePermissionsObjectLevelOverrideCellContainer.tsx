import { type EnrichedObjectMetadataItem } from '@/object-metadata/types/EnrichedObjectMetadataItem';
import { SETTINGS_ROLE_OBJECT_LEVEL_PERMISSION_TO_ROLE_OBJECT_PERMISSION_MAPPING } from '@/settings/roles/role-permissions/objects-permissions/constants/SettingsRoleObjectLevelPermissionToRoleObjectPermissionMapping';
import { type SettingsRoleObjectPermissionKey } from '@/settings/roles/role-permissions/objects-permissions/constants/SettingsRoleObjectPermissionIconConfig';
import { SettingsRolePermissionsObjectLevelOverrideCell } from './SettingsRolePermissionsObjectLevelOverrideCell';
import * as stylex from '@stylexjs/stylex';
import { spacing } from 'twenty-ui/theme/tokens.stylex';

const styles = stylex.create({
  settingsRolePermissionsObjectLevelOverrideCell: {
    gap: spacing['--t-spacing-1'],
    display: 'flex',
  },
});

type SettingsRolePermissionsObjectLevelOverrideCellContainerProps = {
  objectMetadataItem: EnrichedObjectMetadataItem;
  roleId: string;
  objectLabel: string;
};

export const SettingsRolePermissionsObjectLevelOverrideCellContainer = ({
  objectMetadataItem,
  roleId,
  objectLabel,
}: SettingsRolePermissionsObjectLevelOverrideCellContainerProps) => {
  const permissionMappings =
    SETTINGS_ROLE_OBJECT_LEVEL_PERMISSION_TO_ROLE_OBJECT_PERMISSION_MAPPING;

  return (
    <div
      {...stylex.props(styles.settingsRolePermissionsObjectLevelOverrideCell)}
    >
      {(
        Object.keys(permissionMappings) as SettingsRoleObjectPermissionKey[]
      ).map((permissionKey) => {
        return (
          <SettingsRolePermissionsObjectLevelOverrideCell
            key={permissionKey}
            objectMetadataItem={objectMetadataItem}
            objectPermissionKey={permissionKey}
            roleId={roleId}
            objectLabel={objectLabel}
          />
        );
      })}
    </div>
  );
};
