import { AppChip } from '@/applications/components/AppChip';
import { type ApplicationWithoutRelation } from '@/applications/types/ApplicationWithoutRelation';
import { getCustomApplicationLogoUrl } from '@/applications/utils/getCustomApplicationLogoUrl';
import { currentWorkspaceMembersState } from '@/auth/states/currentWorkspaceMembersState';
import { type RoleWithPartialMembers } from '@/settings/roles/types/RoleWithPartialMembers';
import { TableCell } from '@/ui/layout/table/components/TableCell';
import { TableRow } from '@/ui/layout/table/components/TableRow';
import { t } from '@lingui/core/macro';
import { useAtomStateValue } from '@/ui/utilities/state/jotai/hooks/useAtomStateValue';
import { SettingsPath } from 'twenty-shared/types';
import { getSettingsPath } from 'twenty-shared/utils';
import { IconChevronRight, IconLock, useIcons } from 'twenty-ui/icon';
import { useTheme } from 'twenty-ui/theme';
import { WorkspaceMemberAvatarStack } from '@/workspace-member/components/WorkspaceMemberAvatarStack';
import * as stylex from '@stylexjs/stylex';
import { fontColor, spacing } from 'twenty-ui/theme/tokens.stylex';

const styles = stylex.create({
  nameCell: {
    color: fontColor['--t-font-color-primary'],
    display: 'flex',
    gap: spacing['--t-spacing-1'],
  },
  assignedToCell: {
    display: 'flex',
    justifyContent: 'flex-end',
  },
  iconLockContainer: {
    alignItems: 'center',
    display: 'flex',
    justifyContent: 'flex-end',
  },
});

type SettingsRolesTableRowProps = {
  role: RoleWithPartialMembers;
  application?: ApplicationWithoutRelation;
};

const MAX_VISIBLE_ROLE_MEMBER_AVATARS = 5;

export const SettingsRolesTableRow = ({
  role,
  application,
}: SettingsRolesTableRowProps) => {
  const theme = useTheme();
  const { getIcon } = useIcons();
  const Icon = getIcon(role.icon ?? 'IconUser');

  const currentWorkspaceMembers = useAtomStateValue(
    currentWorkspaceMembersState,
  );

  const enrichedWorkspaceMembers = role.workspaceMembers.map(
    (workspaceMember) =>
      currentWorkspaceMembers.find(
        (member) => member.id === workspaceMember.id,
      ) ?? workspaceMember,
  );

  return (
    <TableRow
      key={role.id}
      gridAutoColumns="332px 3fr 3fr 1fr"
      mobileGridAutoColumns="3fr 2fr 2fr 35px"
      to={getSettingsPath(SettingsPath.RoleDetail, { roleId: role.id })}
    >
      <TableCell>
        <div {...stylex.props(styles.nameCell)}>
          <Icon size={theme.icon.size.md} stroke={theme.icon.stroke.sm} />
          {role.label}
          {!role.isEditable && (
            <div {...stylex.props(styles.iconLockContainer)}>
              <IconLock
                color={theme.font.color.light}
                stroke={theme.icon.stroke.sm}
                size={theme.icon.size.sm}
              />
            </div>
          )}
        </div>
      </TableCell>
      <TableCell>
        <AppChip
          applicationId={application?.id}
          size="md"
          fallbackApplicationData={{
            name: t`Workspace app`,
            logoUrl: getCustomApplicationLogoUrl(),
          }}
        />
      </TableCell>
      <TableCell align="right">
        <div {...stylex.props(styles.assignedToCell)}>
          <WorkspaceMemberAvatarStack
            defaultAvatarName={t`Workspace member`}
            maxVisible={MAX_VISIBLE_ROLE_MEMBER_AVATARS}
            totalWorkspaceMembersCount={role.workspaceMembers.length}
            workspaceMembers={enrichedWorkspaceMembers}
          />
        </div>
      </TableCell>
      <TableCell align="right" color={theme.font.color.tertiary}>
        <IconChevronRight size={theme.icon.size.md} />
      </TableCell>
    </TableRow>
  );
};
