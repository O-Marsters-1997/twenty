import { useLingui } from '@lingui/react/macro';
import { useEffect, useState } from 'react';
import { useDebouncedCallback } from 'use-debounce';

import { currentUserState } from '@/auth/states/currentUserState';
import { currentWorkspaceMemberState } from '@/auth/states/currentWorkspaceMemberState';
import { useAtomStateValue } from '@/ui/utilities/state/jotai/hooks/useAtomStateValue';
import { useCanEditProfileField } from '@/settings/profile/hooks/useCanEditProfileField';
import { useUpdateWorkspaceMemberSettings } from '@/workspace-member/hooks/useUpdateWorkspaceMemberSettings';
import { SettingsTextInput } from '@/ui/input/components/SettingsTextInput';
import { logError } from '~/utils/logError';
import * as stylex from '@stylexjs/stylex';
import { spacing } from 'twenty-ui/theme/tokens.stylex';

const styles = stylex.create({
  comboInputContainer: {
    gap: spacing['--t-spacing-4'],
    display: 'flex',
    flexDirection: 'row',
  },
});

type NameFieldsProps = {
  autoSave?: boolean;
};

export const NameFields = ({ autoSave = true }: NameFieldsProps) => {
  const { t } = useLingui();
  const currentUser = useAtomStateValue(currentUserState);
  const currentWorkspaceMember = useAtomStateValue(currentWorkspaceMemberState);
  const { canEdit: canEditFirstName } = useCanEditProfileField('firstName');
  const { canEdit: canEditLastName } = useCanEditProfileField('lastName');

  const [firstName, setFirstName] = useState(
    currentWorkspaceMember?.name?.firstName ?? '',
  );
  const [lastName, setLastName] = useState(
    currentWorkspaceMember?.name?.lastName ?? '',
  );

  const { updateWorkspaceMemberSettings } = useUpdateWorkspaceMemberSettings();

  // TODO: Enhance this with react-web-hook-form (https://www.react-hook-form.com)
  const debouncedUpdate = useDebouncedCallback(async () => {
    try {
      if (!currentWorkspaceMember?.id) {
        throw new Error('User is not logged in');
      }

      if (autoSave) {
        await updateWorkspaceMemberSettings({
          workspaceMemberId: currentWorkspaceMember.id,
          update: {
            name: {
              firstName: firstName,
              lastName: lastName,
            },
          },
        });
      }
    } catch (error) {
      logError(error);
    }
  }, 500);

  useEffect(() => {
    if (!currentWorkspaceMember) {
      return;
    }

    const { firstName: currentFirstName, lastName: currentLastName } =
      currentWorkspaceMember.name;

    if (
      (currentFirstName !== firstName || currentLastName !== lastName) &&
      firstName !== '' &&
      lastName !== ''
    ) {
      debouncedUpdate();
    }

    return () => {
      debouncedUpdate.cancel();
    };
  }, [
    firstName,
    lastName,
    currentUser,
    debouncedUpdate,
    autoSave,
    currentWorkspaceMember,
    canEditFirstName,
    canEditLastName,
  ]);

  const firstNameTextInputId = `${currentWorkspaceMember?.id}-first-name`;
  const lastNameTextInputId = `${currentWorkspaceMember?.id}-last-name`;

  return (
    <div {...stylex.props(styles.comboInputContainer)}>
      <SettingsTextInput
        instanceId={firstNameTextInputId}
        label={t`First Name`}
        value={firstName}
        onChange={setFirstName}
        placeholder={t`Tim`}
        fullWidth
        disabled={!canEditFirstName}
      />
      <SettingsTextInput
        instanceId={lastNameTextInputId}
        label={t`Last Name`}
        value={lastName}
        onChange={setLastName}
        placeholder={t`Cook`}
        fullWidth
        disabled={!canEditLastName}
      />
    </div>
  );
};
