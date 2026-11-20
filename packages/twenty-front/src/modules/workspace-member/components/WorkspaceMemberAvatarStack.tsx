import { isNonEmptyString } from '@sniptt/guards';
import { AvatarGroup } from 'twenty-ui/components/data-display';
import { Avatar } from 'twenty-ui/primitives/data-display';

import { getAbsoluteImageUrl } from '~/utils/image/getAbsoluteImageUrl';
import * as stylex from '@stylexjs/stylex';
import { background } from 'twenty-ui/theme/tokens.stylex';

const DEFAULT_MAX_VISIBLE_MEMBER_AVATARS = 5;

type WorkspaceMemberAvatarStackMember = {
  avatarUrl?: string | null;
  id: string;
  name?: {
    firstName?: string | null;
    lastName?: string | null;
  } | null;
  userEmail?: string | null;
};

type WorkspaceMemberAvatarStackProps = {
  defaultAvatarName: string;
  maxVisible?: number;
  totalWorkspaceMembersCount?: number | null;
  workspaceMembers: WorkspaceMemberAvatarStackMember[];
};

const styles = stylex.create({
  avatarContainer: {
    borderColor: background['--t-background-secondary'],
    borderRadius: '50%',
    borderStyle: 'solid',
    borderWidth: '1px',
    cornerShape: 'round',
    display: 'flex',
  },
  avatarStackContainer: {
    alignItems: 'center',
    display: 'flex',
    minWidth: '0',
  },
});

const getWorkspaceMemberDisplayName = ({
  workspaceMember,
  defaultAvatarName,
}: {
  workspaceMember: WorkspaceMemberAvatarStackMember;
  defaultAvatarName: string;
}) => {
  const fullName = [
    workspaceMember.name?.firstName,
    workspaceMember.name?.lastName,
  ]
    .filter(isNonEmptyString)
    .join(' ')
    .trim();

  if (isNonEmptyString(fullName)) {
    return fullName;
  }

  return isNonEmptyString(workspaceMember.userEmail)
    ? workspaceMember.userEmail
    : defaultAvatarName;
};

export const WorkspaceMemberAvatarStack = ({
  defaultAvatarName,
  maxVisible = DEFAULT_MAX_VISIBLE_MEMBER_AVATARS,
  totalWorkspaceMembersCount,
  workspaceMembers,
}: WorkspaceMemberAvatarStackProps) => {
  return (
    <AvatarGroup
      render={<div {...stylex.props(styles.avatarStackContainer)} />}
      avatars={workspaceMembers.map((workspaceMember) => {
        const displayName = getWorkspaceMemberDisplayName({
          workspaceMember,
          defaultAvatarName,
        });

        return (
          <div
            key={workspaceMember.id}
            {...stylex.props(styles.avatarContainer)}
          >
            <Avatar
              src={getAbsoluteImageUrl(workspaceMember.avatarUrl)}
              name={displayName}
              imageProps={{ alt: displayName }}
              colorSeed={workspaceMember.id}
              size="md"
              shape="circle"
            />
          </div>
        );
      })}
      maxVisible={maxVisible}
      total={totalWorkspaceMembersCount ?? undefined}
      overflowShape="circle"
      overlap="left"
      overlapOffset="4px"
    />
  );
};
