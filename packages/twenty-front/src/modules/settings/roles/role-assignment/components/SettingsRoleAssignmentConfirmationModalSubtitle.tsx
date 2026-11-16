import { currentWorkspaceMembersState } from '@/auth/states/currentWorkspaceMembersState';
import { SettingsCard } from '@/settings/components/SettingsCard';
import { type SettingsRoleAssignmentConfirmationModalSelectedRoleTarget } from '@/settings/roles/role-assignment/types/SettingsRoleAssignmentConfirmationModalSelectedRoleTarget';

import { t } from '@lingui/core/macro';
import { Avatar } from 'twenty-ui/primitives/data-display';
import { useAtomStateValue } from '@/ui/utilities/state/jotai/hooks/useAtomStateValue';
import { getAbsoluteImageUrl } from '~/utils/image/getAbsoluteImageUrl';
import * as stylex from '@stylexjs/stylex';
import { spacing } from 'twenty-ui/theme/tokens.stylex';

const styles = stylex.create({
  settingsCardContainer: {
    marginTop: spacing['--t-spacing-6'],
  },
});

type SettingsRoleAssignmentConfirmationModalSubtitleProps = {
  selectedRoleTarget: SettingsRoleAssignmentConfirmationModalSelectedRoleTarget;
  onRoleClick: (roleId: string) => void;
};

export const SettingsRoleAssignmentConfirmationModalSubtitle = ({
  selectedRoleTarget,
  onRoleClick,
}: SettingsRoleAssignmentConfirmationModalSubtitleProps) => {
  const currentWorkspaceMembers = useAtomStateValue(
    currentWorkspaceMembersState,
  );

  const enrichedSelectedWorkspaceMember = currentWorkspaceMembers.find(
    (member) => member.id === selectedRoleTarget.id,
  );

  const workspaceMemberName = enrichedSelectedWorkspaceMember
    ? `${enrichedSelectedWorkspaceMember?.name.firstName} ${enrichedSelectedWorkspaceMember?.name.lastName}`
    : selectedRoleTarget.name;

  return (
    <>
      {t`${workspaceMemberName} will be unassigned from the following role:`}
      <div {...stylex.props(styles.settingsCardContainer)}>
        <SettingsCard
          title={selectedRoleTarget.role?.label || ''}
          Icon={
            <Avatar
              src={getAbsoluteImageUrl(
                enrichedSelectedWorkspaceMember?.avatarUrl,
              )}
              colorSeed={enrichedSelectedWorkspaceMember?.id}
              name={workspaceMemberName}
              size="md"
              shape="circle"
            />
          }
          onClick={() =>
            selectedRoleTarget.role && onRoleClick(selectedRoleTarget.role.id)
          }
        />
      </div>
    </>
  );
};
