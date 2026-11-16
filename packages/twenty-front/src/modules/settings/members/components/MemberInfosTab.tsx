import { useState } from 'react';

import { MemberEmailField } from '@/settings/members/components/MemberEmailField';
import { MemberNameFields } from '@/settings/members/components/MemberNameFields';
import { MemberTwoFactorAuthenticationRecoverySection } from '@/settings/members/components/MemberTwoFactorAuthenticationRecoverySection';
import { WorkspaceMemberPictureUploader } from '@/settings/workspace-member/components/WorkspaceMemberPictureUploader';
import { type WorkspaceMember } from '@/workspace-member/types/WorkspaceMember';
import { t } from '@lingui/core/macro';
import { isDefined } from 'twenty-shared/utils';
import { Section } from 'twenty-ui/components/layout';
import { Button } from 'twenty-ui/primitives/input';
import * as stylex from '@stylexjs/stylex';
import { spacing } from 'twenty-ui/theme/tokens.stylex';

type MemberInfosTabProps = {
  member: WorkspaceMember;
  onNameChange: (firstName: string, lastName: string) => void;
  onDelete: () => void;
  twoFactorAuthenticationRecoveryUserId?: string;
};

const styles = stylex.create({
  nameRow: {
    display: 'grid',
    gap: spacing['--t-spacing-3'],
    gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
  },
  actionRow: {
    display: 'flex',
    gap: spacing['--t-spacing-2'],
  },
});

export const MemberInfosTab = ({
  member,
  onNameChange,
  onDelete,
  twoFactorAuthenticationRecoveryUserId,
}: MemberInfosTabProps) => {
  const [firstName, setFirstName] = useState(member.name.firstName);
  const [lastName, setLastName] = useState(member.name.lastName);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(
    member.avatarUrl || null,
  );

  return (
    <>
      <Section.Root>
        <Section.Header title={t`Picture`} />
        <WorkspaceMemberPictureUploader
          workspaceMemberId={member.id}
          avatarUrl={avatarUrl}
          onAvatarUpdated={setAvatarUrl}
        />
      </Section.Root>

      <Section.Root>
        <Section.Header
          title={t`Name`}
          description={t`As it will be displayed in the workspace`}
        />
        <div {...stylex.props(styles.nameRow)}>
          <MemberNameFields
            memberId={member.id}
            firstName={firstName}
            lastName={lastName}
            onChange={(field, value) => {
              if (field === 'firstName') {
                setFirstName(value);
                onNameChange(value, lastName);
              } else {
                setLastName(value);
                onNameChange(firstName, value);
              }
            }}
          />
        </div>
      </Section.Root>

      <Section.Root>
        <Section.Header
          title={t`Email`}
          description={t`The email associated to this account`}
        />
        <MemberEmailField email={member.userEmail} />
      </Section.Root>

      {isDefined(twoFactorAuthenticationRecoveryUserId) && (
        <MemberTwoFactorAuthenticationRecoverySection
          key={twoFactorAuthenticationRecoveryUserId}
          userId={twoFactorAuthenticationRecoveryUserId}
          memberName={`${firstName} ${lastName}`.trim()}
        />
      )}

      <Section.Root>
        <Section.Header
          title={t`Admin`}
          description={t`Perform administrative actions or permanently delete this user`}
        />
        <div {...stylex.props(styles.actionRow)}>
          <Button
            size="sm"
            onClick={onDelete}
            variant="outline"
            color="danger"
          >{t`Delete account`}</Button>
        </div>
      </Section.Root>
    </>
  );
};
