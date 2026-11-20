import { useLingui } from '@lingui/react/macro';
import { useState } from 'react';

import { currentUserState } from '@/auth/states/currentUserState';
import { useCanEditProfileField } from '@/settings/profile/hooks/useCanEditProfileField';
import { useUpdateEmail } from '@/settings/profile/hooks/useUpdateEmail';
import { SettingsTextInput } from '@/ui/input/components/SettingsTextInput';
import { TooltipDelay } from '@/ui/layout/tooltip/constants/TooltipDelay';
import { useAtomStateValue } from '@/ui/utilities/state/jotai/hooks/useAtomStateValue';
import { IconCheck, IconPencil, IconX } from 'twenty-ui/icon';
import { Tooltip } from 'twenty-ui/primitives/surfaces';
import { Button, ButtonGroup } from 'twenty-ui/primitives/input';
import * as stylex from '@stylexjs/stylex';
import { spacing } from 'twenty-ui/theme/tokens.stylex';

const styles = stylex.create({
  container: {
    gap: spacing['--t-spacing-2'],
    display: 'flex',
    flexDirection: 'column',
  },
  fieldRow: {
    gap: spacing['--t-spacing-2'],
    alignItems: 'stretch',
    display: 'flex',
  },
  actionButtonContainer: {
    alignItems: 'stretch',
    display: 'inline-flex',
    justifyContent: 'center',
    height: '100%',
  },
  actionWrapper: {
    alignItems: 'stretch',
    display: 'flex',
  },
});

export const EmailField = () => {
  const { t } = useLingui();
  const currentUser = useAtomStateValue(currentUserState);
  const { canEdit, isBlockedByWorkspaceLimit } =
    useCanEditProfileField('email');
  const { updateEmail } = useUpdateEmail();

  const [draftEmail, setDraftEmail] = useState('');
  const [isEditing, setIsEditing] = useState(false);

  const currentEmail = currentUser?.email ?? '';

  const normalizedDraftEmail = draftEmail.trim().toLowerCase();

  const isEmailChanged =
    normalizedDraftEmail.length > 0 && normalizedDraftEmail !== currentEmail;
  const isEmailFormatValid =
    normalizedDraftEmail.includes('@') && !normalizedDraftEmail.endsWith('@');

  const isSaveDisabled =
    !canEdit || !isEditing || !isEmailChanged || !isEmailFormatValid;

  const handleStartEditing = () => {
    if (!canEdit) {
      return;
    }

    setDraftEmail(currentEmail);
    setIsEditing(true);
  };

  const handleCancelEditing = () => {
    setIsEditing(false);
  };

  const handleSave = async () => {
    if (isSaveDisabled) {
      return;
    }

    setIsEditing(false);
    await updateEmail(normalizedDraftEmail);
  };

  const currentUserId = currentUser?.id;
  const shouldShowWorkspaceLimitTooltip =
    !isEditing && isBlockedByWorkspaceLimit;

  return (
    <div {...stylex.props(styles.container)}>
      <div {...stylex.props(styles.fieldRow)}>
        <SettingsTextInput
          instanceId={`user-email-${currentUserId}`}
          value={isEditing ? draftEmail : currentEmail}
          onChange={setDraftEmail}
          disabled={!canEdit || !isEditing}
          fullWidth
          type="email"
          onInputEnter={handleSave}
        />
        {isEditing ? (
          <ButtonGroup key="editing" aria-label={t`Edit email`}>
            <Button
              startIcon={<IconCheck />}
              aria-label={t`Save`}
              size="md"
              onClick={handleSave}
              disabled={isSaveDisabled}
              type="button"
              variant="outline"
            />

            <Button
              startIcon={<IconX />}
              aria-label={t`Cancel`}
              size="md"
              onClick={handleCancelEditing}
              type="button"
              variant="outline"
            />
          </ButtonGroup>
        ) : (
          <div key="view" {...stylex.props(styles.actionWrapper)}>
            <Tooltip
              content={t`You can't change your email because you belong to 2 or more workspaces.`}
              delay={TooltipDelay.noDelay}
              side="top"
              disabled={!shouldShowWorkspaceLimitTooltip}
            >
              <div {...stylex.props(styles.actionButtonContainer)}>
                <Button
                  startIcon={<IconPencil />}
                  aria-label={t`Edit`}
                  variant="outline"
                  size="md"
                  onClick={handleStartEditing}
                  disabled={!canEdit}
                  type="button"
                />
              </div>
            </Tooltip>
          </div>
        )}
      </div>
    </div>
  );
};
