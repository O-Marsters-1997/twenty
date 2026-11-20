import {
  SETTINGS_ROLE_OBJECT_PERMISSION_ICON_CONFIG,
  type SettingsRoleObjectPermissionKey,
} from '@/settings/roles/role-permissions/objects-permissions/constants/SettingsRoleObjectPermissionIconConfig';
import * as stylex from '@stylexjs/stylex';
import { useTheme } from 'twenty-ui/theme';
import { borderRadius, color, spacing } from 'twenty-ui/theme/tokens.stylex';

type PermissionIconProps = {
  permission: SettingsRoleObjectPermissionKey;
  state: 'granted' | 'revoked';
};

const styles = stylex.create({
  iconWrapper: {
    borderColor: color['--t-color-blue7'],
    borderRadius: borderRadius['--t-border-radius-sm'],
    borderStyle: 'solid',
    borderWidth: '1px',
    alignItems: 'center',
    backgroundColor: color['--t-color-blue3'],
    display: 'flex',
    justifyContent: 'center',
    height: spacing['--t-spacing-4'],
    width: spacing['--t-spacing-4'],
  },
  iconWrapperRevoked: {
    borderColor: color['--t-color-orange7'],
    backgroundColor: color['--t-color-orange3'],
  },
  icon: {
    alignItems: 'center',
    color: color['--t-color-blue'],
    display: 'flex',
    justifyContent: 'center',
  },
  iconRevoked: {
    color: color['--t-color-orange'],
  },
});

export const PermissionIcon = ({ permission, state }: PermissionIconProps) => {
  const { Icon, IconForbidden } =
    SETTINGS_ROLE_OBJECT_PERMISSION_ICON_CONFIG[permission];

  const theme = useTheme();
  const isRevoked = state === 'revoked';

  return (
    <div
      {...stylex.props(
        styles.iconWrapper,
        isRevoked && styles.iconWrapperRevoked,
      )}
    >
      <div {...stylex.props(styles.icon, isRevoked && styles.iconRevoked)}>
        {isRevoked && <IconForbidden size={theme.icon.size.sm} />}
        {!isRevoked && <Icon size={theme.icon.size.sm} />}
      </div>
    </div>
  );
};
