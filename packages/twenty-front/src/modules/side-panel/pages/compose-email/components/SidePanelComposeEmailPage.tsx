import { useCallback } from 'react';

import { EmailComposerFields } from '@/activities/emails/components/EmailComposerFields';
import { useEmailComposerState } from '@/activities/emails/hooks/useEmailComposerState';
import { SIDE_PANEL_FOCUS_ID } from '@/side-panel/constants/SidePanelFocusId';
import { useSidePanelHistory } from '@/side-panel/hooks/useSidePanelHistory';
import { composeEmailConnectedAccountIdComponentState } from '@/side-panel/pages/compose-email/states/composeEmailConnectedAccountIdComponentState';
import { composeEmailContextRecordComponentState } from '@/side-panel/pages/compose-email/states/composeEmailContextRecordComponentState';
import { composeEmailDefaultInReplyToComponentState } from '@/side-panel/pages/compose-email/states/composeEmailDefaultInReplyToComponentState';
import { composeEmailDefaultSubjectComponentState } from '@/side-panel/pages/compose-email/states/composeEmailDefaultSubjectComponentState';
import { composeEmailDefaultToComponentState } from '@/side-panel/pages/compose-email/states/composeEmailDefaultToComponentState';
import { SidePanelFooter } from '@/ui/layout/side-panel/components/SidePanelFooter';
import { useHotkeysOnFocusedElement } from '@/ui/utilities/hotkey/hooks/useHotkeysOnFocusedElement';
import { useAtomComponentStateValue } from '@/ui/utilities/state/jotai/hooks/useAtomComponentStateValue';
import { t } from '@lingui/core/macro';
import { IconPaperclip, IconSend, IconTrash } from 'twenty-ui/icon';
import { Button } from 'twenty-ui/primitives/input';
import { IconButton } from 'twenty-ui/components/input';

import { useAttachEmailFiles } from '@/activities/emails/hooks/useAttachEmailFiles';
import * as stylex from '@stylexjs/stylex';

const styles = stylex.create({
  container: {
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
  },
  content: {
    display: 'flex',
    flex: '1',
    flexDirection: 'column',
    overflowY: 'auto',
  },
});

export const SidePanelComposeEmailPage = () => {
  const composeEmailConnectedAccountId = useAtomComponentStateValue(
    composeEmailConnectedAccountIdComponentState,
  );
  const composeEmailDefaultTo = useAtomComponentStateValue(
    composeEmailDefaultToComponentState,
  );
  const composeEmailDefaultSubject = useAtomComponentStateValue(
    composeEmailDefaultSubjectComponentState,
  );
  const composeEmailDefaultInReplyTo = useAtomComponentStateValue(
    composeEmailDefaultInReplyToComponentState,
  );
  const composeEmailContextRecord = useAtomComponentStateValue(
    composeEmailContextRecordComponentState,
  );

  const { goBackFromSidePanel } = useSidePanelHistory();

  const composerState = useEmailComposerState({
    connectedAccountId: composeEmailConnectedAccountId ?? '',
    defaultTo: composeEmailDefaultTo ?? '',
    defaultSubject: composeEmailDefaultSubject ?? '',
    defaultInReplyTo: composeEmailDefaultInReplyTo ?? undefined,
    onSent: goBackFromSidePanel,
  });

  const { openAttachmentPicker, isUploadingAttachments } = useAttachEmailFiles({
    onFilesAttached: composerState.setFiles,
  });

  const canSend = composerState.canSend && !isUploadingAttachments;

  const handleSendHotkey = useCallback(() => {
    if (canSend) {
      composerState.handleSend();
    }
  }, [canSend, composerState]);

  useHotkeysOnFocusedElement({
    keys: ['ctrl+Enter,meta+Enter'],
    callback: handleSendHotkey,
    focusId: SIDE_PANEL_FOCUS_ID,
    dependencies: [handleSendHotkey],
  });

  if (!composeEmailConnectedAccountId) {
    return null;
  }

  return (
    <div {...stylex.props(styles.container)}>
      <div {...stylex.props(styles.content)}>
        <EmailComposerFields
          composerState={composerState}
          contextRecord={composeEmailContextRecord}
        />
      </div>
      <SidePanelFooter
        actions={[
          <IconButton
            key="discard"
            size="sm"
            variant="outline"
            aria-label={t`Discard`}
            onClick={goBackFromSidePanel}
          >
            <IconTrash />
          </IconButton>,
          <IconButton
            key="attach"
            size="sm"
            variant="outline"
            aria-label={t`Attach files`}
            onClick={openAttachmentPicker}
          >
            <IconPaperclip />
          </IconButton>,
          <Button
            key="send"
            size="sm"
            startIcon={<IconSend />}
            shortcut={['Mod', 'Enter']}
            onClick={composerState.handleSend}
            disabled={!canSend}
            variant="solid"
            color="accent"
          >{t`Send`}</Button>,
        ]}
      />
    </div>
  );
};
