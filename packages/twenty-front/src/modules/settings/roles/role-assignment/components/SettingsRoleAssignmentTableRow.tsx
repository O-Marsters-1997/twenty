import { currentWorkspaceMembersState } from '@/auth/states/currentWorkspaceMembersState';
import { type PartialWorkspaceMember } from '@/settings/roles/types/RoleWithPartialMembers';
import { TableCell } from '@/ui/layout/table/components/TableCell';
import { TableRow } from '@/ui/layout/table/components/TableRow';
import { useAtomStateValue } from '@/ui/utilities/state/jotai/hooks/useAtomStateValue';
import { UserContext } from '@/users/contexts/UserContext';
import { t } from '@lingui/core/macro';
import { useContext } from 'react';
import { OverflowingTextWithTooltip } from 'twenty-ui/primitives/typography';
import { IconKey, useIcons } from 'twenty-ui/icon';
import { Avatar } from 'twenty-ui/primitives/data-display';
import { useTheme } from 'twenty-ui/theme';
import { type Agent, type ApiKeyForRole } from '~/generated-metadata/graphql';
import { dateLocaleState } from '@/localization/states/dateLocaleState';
import { getAbsoluteImageUrl } from '~/utils/image/getAbsoluteImageUrl';
import { formatDateString } from '@/object-record/record-field/ui/utils/formatDateString';
import * as stylex from '@stylexjs/stylex';
import { fontColor, spacing } from 'twenty-ui/theme/tokens.stylex';

const styles = stylex.create({
  iconWrapper: {
    alignItems: 'center',
    display: 'flex',
    flexShrink: '0',
  },
  nameCell: {
    flex: '1',
    color: fontColor['--t-font-color-primary'],
    minWidth: '0',
  },
  nameContainer: {
    gap: spacing['--t-spacing-2'],
    overflow: 'hidden',
    alignItems: 'center',
    display: 'flex',
    width: '100%',
  },
});

export type RoleTarget =
  | { type: 'member'; data: PartialWorkspaceMember }
  | { type: 'agent'; data: Agent }
  | { type: 'apiKey'; data: ApiKeyForRole };

type SettingsRoleAssignmentTableRowProps = {
  roleTarget: RoleTarget;
};

export const SettingsRoleAssignmentTableRow = ({
  roleTarget,
}: SettingsRoleAssignmentTableRowProps) => {
  const currentWorkspaceMembers = useAtomStateValue(
    currentWorkspaceMembersState,
  );
  const theme = useTheme();
  const { getIcon } = useIcons();
  const { dateFormat, timeZone } = useContext(UserContext);
  const dateLocale = useAtomStateValue(dateLocaleState);

  const renderIcon = () => {
    switch (roleTarget.type) {
      case 'member': {
        const enrichedWorkspaceMember = currentWorkspaceMembers.find(
          (member) => member.id === roleTarget.data.id,
        );
        return (
          <Avatar
            src={getAbsoluteImageUrl(enrichedWorkspaceMember?.avatarUrl)}
            colorSeed={enrichedWorkspaceMember?.id}
            name={enrichedWorkspaceMember?.name.firstName ?? ''}
            shape="circle"
            size="md"
          />
        );
      }
      case 'agent': {
        const Icon = getIcon(roleTarget.data.icon || 'IconLego');
        return <Icon size={theme.icon.size.md} stroke={theme.icon.stroke.sm} />;
      }
      case 'apiKey': {
        return (
          <IconKey size={theme.icon.size.md} stroke={theme.icon.stroke.sm} />
        );
      }
    }
  };

  const renderName = () => {
    switch (roleTarget.type) {
      case 'member':
        return `${roleTarget.data.name.firstName} ${roleTarget.data.name.lastName}`;
      case 'agent':
        return roleTarget.data.label;
      case 'apiKey':
        return roleTarget.data.name;
    }
  };

  const renderSecondaryInfo = () => {
    switch (roleTarget.type) {
      case 'member':
        return roleTarget.data.userEmail;
      case 'agent':
        return roleTarget.data.description;
      case 'apiKey':
        return roleTarget.data.expiresAt
          ? formatDateString({
              value: roleTarget.data.expiresAt,
              timeZone,
              dateFormat,
              localeCatalog: dateLocale.localeCatalog,
            })
          : t`Never expires`;
    }
  };

  return (
    <TableRow gridAutoColumns="2fr 4fr">
      <TableCell overflow="hidden">
        <div {...stylex.props(styles.nameContainer)}>
          <div {...stylex.props(styles.iconWrapper)}>{renderIcon()}</div>
          <div {...stylex.props(styles.nameCell)}>
            <OverflowingTextWithTooltip text={renderName()} />
          </div>
        </div>
      </TableCell>
      <TableCell overflow="hidden">
        <OverflowingTextWithTooltip text={renderSecondaryInfo()} />
      </TableCell>
    </TableRow>
  );
};
