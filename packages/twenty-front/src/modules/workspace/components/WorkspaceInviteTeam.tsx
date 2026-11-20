import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { z } from 'zod';

import { type RoleWithPartialMembers } from '@/settings/roles/types/RoleWithPartialMembers';
import { Select } from '@/ui/input/components/Select';
import { SettingsTextInput } from '@/ui/input/components/SettingsTextInput';
import { useCreateWorkspaceInvitation } from '@/workspace-invitation/hooks/useCreateWorkspaceInvitation';
import { sanitizeEmailList } from '@/workspace/utils/sanitizeEmailList';
import { i18n } from '@lingui/core';
import { msg } from '@lingui/core/macro';
import { useLingui } from '@lingui/react/macro';
import { isDefined } from 'twenty-shared/utils';
import { useToast } from 'twenty-ui/components/feedback';
import {
  IconLock,
  IconSend,
  IconUser,
  useIcons,
  type IconComponent,
} from 'twenty-ui/icon';
import { Button } from 'twenty-ui/primitives/input';
import * as stylex from '@stylexjs/stylex';
import { spacing } from 'twenty-ui/theme/tokens.stylex';
import { media } from 'twenty-ui/theme/constants.stylex';

const styles = stylex.create({
  container: {
    gap: spacing['--t-spacing-2'],
    alignItems: 'center',
    display: 'flex',
    flexDirection: 'row',
    flexWrap: { default: null, [media.mobile]: 'wrap' },
    paddingBottom: spacing['--t-spacing-3'],
  },
  linkContainer: {
    flex: { default: '1 1 auto', [media.mobile]: '1 1 100%' },
    minWidth: '0',
  },
  roleContainer: {
    flex: { default: '0 0 130px', [media.mobile]: '1 1 100%' },
    minWidth: '130px',
  },
});

const emailsEmptyErrorMessage = msg`Emails should not be empty`;

const validationSchema = z.object({
  emails: z.string().superRefine((value, ctx) => {
    if (!value.length) {
      return;
    }
    const emails = sanitizeEmailList(value.split(','));
    if (emails.length === 0) {
      ctx.addIssue({
        code: 'custom',
        message: i18n._(emailsEmptyErrorMessage),
      });
    }
    const invalidEmails: string[] = [];
    for (const email of emails) {
      const result = z.email().safeParse(email);
      if (!result.success) {
        invalidEmails.push(email);
      }
    }
    if (invalidEmails.length > 0) {
      const invalidEmailsList = invalidEmails.join(', ');
      ctx.addIssue({
        code: 'custom',
        message:
          invalidEmails.length > 1
            ? `Invalid emails: ${invalidEmailsList}`
            : `Invalid email: ${invalidEmailsList}`,
      });
    }
  }),
  roleId: z.string().optional(),
});

type FormInput = {
  emails: string;
  roleId?: string;
};

type WorkspaceInviteTeamProps = {
  roles: RoleWithPartialMembers[];
};

export const WorkspaceInviteTeam = ({ roles }: WorkspaceInviteTeamProps) => {
  const { t } = useLingui();
  const { getIcon } = useIcons();

  const { enqueueToast } = useToast();
  const { sendInvitation } = useCreateWorkspaceInvitation();

  const roleOptions: Array<{
    label: string;
    value: string;
    Icon?: IconComponent;
  }> = roles
    .filter((role) => role.canBeAssignedToUsers)
    .map((role) => ({
      label: role.label,
      value: role.id,
      Icon: getIcon(role.icon) ?? IconUser,
    }));

  const emptyRoleOption = {
    label: t`Default role`,
    value: '',
    Icon: IconLock,
  };

  const { reset, handleSubmit, control, formState, watch } = useForm<FormInput>(
    {
      mode: 'onSubmit',
      resolver: zodResolver(validationSchema),
      defaultValues: {
        emails: '',
        roleId: '',
      },
    },
  );
  const isEmailsEmpty = !watch('emails');

  const submit = handleSubmit(async ({ emails, roleId }) => {
    const emailsList = sanitizeEmailList(emails.split(','));
    const { data } = await sendInvitation({
      emails: emailsList,
      ...(roleId ? { roleId } : {}),
    });
    if (!isDefined(data)) {
      return;
    }

    if (data.sendInvitations.result.length > 0) {
      const invitationCount = data.sendInvitations.result.length;
      enqueueToast({
        status: 'success',
        children: t`${invitationCount} invitations sent`,
        duration: 2000,
      });

      return;
    }

    if (!data.sendInvitations.success) {
      enqueueToast({
        status: 'error',
        children: data.sendInvitations.errors.join(', '),
        duration: 5000,
      });
    }
  });

  const { isSubmitSuccessful, errors } = formState;

  useEffect(() => {
    if (isSubmitSuccessful) {
      reset();
    }
  }, [isSubmitSuccessful, reset]);

  return (
    <form onSubmit={submit}>
      <div {...stylex.props(styles.container)}>
        <div {...stylex.props(styles.linkContainer)}>
          <Controller
            name="emails"
            control={control}
            render={({ field: { value, onChange }, fieldState: { error } }) => {
              return (
                <SettingsTextInput
                  instanceId="workspace-invite-team-emails"
                  // oxlint-disable-next-line lingui/no-unlocalized-strings
                  placeholder="tim@apple.com, jony.ive@apple.dev"
                  value={value}
                  onChange={onChange}
                  error={error?.message}
                  fullWidth
                />
              );
            }}
          />
        </div>
        <div {...stylex.props(styles.roleContainer)}>
          <Controller
            name="roleId"
            control={control}
            render={({ field: { value, onChange } }) => {
              return (
                <Select
                  dropdownId="workspace-invite-team-role"
                  options={roleOptions}
                  emptyOption={emptyRoleOption}
                  value={value}
                  onChange={onChange}
                  withSearchInput
                  fullWidth
                  disabled={roleOptions.length === 0}
                />
              );
            }}
          />
        </div>
        <Button
          startIcon={<IconSend />}
          type="submit"
          disabled={isEmailsEmpty || !!errors.emails}
          variant="solid"
          color="accent"
        >{t`Invite`}</Button>
      </div>
    </form>
  );
};
