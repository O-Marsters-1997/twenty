import { EmailOperation } from 'twenty-shared/types';
import { useQuery } from '@apollo/client/react';
import { DragDropProvider } from '@dnd-kit/react';
import { t } from '@lingui/core/macro';
import {
  canConnectedAccountPerformEmailOperation,
  getSendableEmailHandles,
  isDefined,
} from 'twenty-shared/utils';
import { IconPaperclip } from 'twenty-ui/icon';
import { useTheme } from 'twenty-ui/theme';

import { ComposerFieldRow } from '@/activities/components/ComposerFieldRow';
import { ComposerHeader } from '@/activities/components/ComposerHeader';
import { StyledComposerTextInput } from '@/activities/components/ComposerTextInput';
import { EmailAttachmentsField } from '@/activities/emails/components/EmailAttachmentsField';
import { INLINE_EMAIL_BODY_EDITOR_PROFILE } from '@/activities/emails/editor/constants/InlineEmailBodyEditorProfile';
import { useUploadEmailImage } from '@/activities/emails/hooks/useUploadEmailImage';
import { EmailRecipientsFieldInput } from '@/activities/emails/recipients/components/EmailRecipientsFieldInput';
import { useEmailRecipientsDragAndDrop } from '@/activities/emails/recipients/hooks/useEmailRecipientsDragAndDrop';
import { type EmailComposerContextRecord } from '@/activities/emails/recipients/types/EmailComposerContextRecord';
import { type EmailRecipientDragData } from '@/activities/emails/recipients/types/EmailRecipientDragData';
import { type EmailRecipientsFieldId } from '@/activities/emails/recipients/types/EmailRecipientsFieldId';
import { getEmailRecipientKey } from '@/activities/emails/recipients/utils/getEmailRecipientKey';
import { type EmailRecipientsByFieldId } from '@/activities/emails/recipients/utils/moveEmailRecipientsBetweenFields';
import { type EmailComposerState } from '@/activities/emails/types/EmailComposerState';
import { type ConnectedAccount } from '@/accounts/types/ConnectedAccount';
import { buildConnectedAccountSenderOptions } from '@/accounts/utils/buildConnectedAccountSenderOptions';
import { FormAdvancedTextFieldInput } from '@/advanced-text-editor/components/FormAdvancedTextFieldInput';
import { Select } from '@/ui/input/components/Select';
import { DND_KIT_PROVIDER_PLUGINS_WITHOUT_DROP_ANIMATION } from '@/ui/utilities/drag-and-drop/constants/DndKitProviderPluginsWithoutDropAnimation';
import { DND_KIT_SENSORS } from '@/ui/utilities/drag-and-drop/constants/DndKitSensors';
import { DragDropItemDndContext } from '@/ui/utilities/drag-and-drop/context/DragDropItemDndContext';
import { GET_MY_CONNECTED_ACCOUNTS } from '@/settings/accounts/graphql/queries/getMyConnectedAccounts';
import * as stylex from '@stylexjs/stylex';
import {
  color,
  fontColor,
  fontSize,
  spacing,
} from 'twenty-ui/theme/tokens.stylex';

const styles = stylex.create({
  fieldsContainer: {
    display: 'flex',
    flex: '1',
    flexDirection: 'column',
    minHeight: '0',
    width: '100%',
  },
  ccBccToggle: {
    all: 'unset',
    color: {
      default: fontColor['--t-font-color-tertiary'],
      ':hover': fontColor['--t-font-color-secondary'],
    },
    cursor: 'pointer',
    flexShrink: '0',
    fontSize: fontSize['--t-font-size-md'],
    paddingBlock: '0',
    paddingInline: spacing['--t-spacing-1'],
    outline: {
      default: null,
      ':focus-visible': `2px solid ${color['--t-color-blue']}`,
    },
    outlineOffset: { default: null, ':focus-visible': '2px' },
  },
  body: {
    display: 'flex',
    flex: '1',
    flexDirection: 'column',
    minHeight: '0',
    paddingBlock: spacing['--t-spacing-2'],
    paddingInline: spacing['--t-spacing-3'],
  },
  attachments: {
    display: 'flex',
    flexDirection: 'column',
    gap: spacing['--t-spacing-2'],
    paddingTop: '0',
    paddingBottom: spacing['--t-spacing-2'],
    paddingInline: spacing['--t-spacing-3'],
  },
  attachAction: {
    alignItems: 'center',
    alignSelf: 'flex-start',
    all: 'unset',
    color: {
      default: fontColor['--t-font-color-tertiary'],
      ':hover': fontColor['--t-font-color-secondary'],
    },
    cursor: 'pointer',
    display: 'flex',
    fontSize: fontSize['--t-font-size-md'],
    gap: spacing['--t-spacing-1'],
    outline: {
      default: null,
      ':focus-visible': `2px solid ${color['--t-color-blue']}`,
    },
    outlineOffset: { default: null, ':focus-visible': '2px' },
  },
  recipientLimitWarning: {
    color: color['--t-color-red'],
    fontSize: fontSize['--t-font-size-xs'],
    paddingBlock: spacing['--t-spacing-1'],
    paddingInline: spacing['--t-spacing-3'],
  },
});

type EmailComposerFieldsProps = {
  composerState: EmailComposerState;
  contextRecord?: EmailComposerContextRecord | null;
  // For surfaces without a composer footer of their own.
  onAttachFiles?: () => void;
};

export const EmailComposerFields = ({
  composerState,
  contextRecord,
  onAttachFiles,
}: EmailComposerFieldsProps) => {
  const theme = useTheme();
  const { uploadEmailImage } = useUploadEmailImage();
  const { data: accountsData } = useQuery<{
    myConnectedAccounts: Pick<
      ConnectedAccount,
      'id' | 'handle' | 'handleAliases' | 'provider'
    >[];
  }>(GET_MY_CONNECTED_ACCOUNTS);

  const sendableAccounts = (accountsData?.myConnectedAccounts ?? []).filter(
    (connectedAccount) =>
      canConnectedAccountPerformEmailOperation({
        connectedAccount,
        operation: EmailOperation.SEND,
      }),
  );

  const senderOptions = buildConnectedAccountSenderOptions(sendableAccounts);

  const hasMultipleSenders = senderOptions.length > 1;

  const selectedAccount = sendableAccounts.find(
    (account) => account.id === composerState.connectedAccountId,
  );

  const selectedSenderValue =
    composerState.fromHandle ?? selectedAccount?.handle;

  const handleSenderChange = (handle: string) => {
    const senderAccount = sendableAccounts.find((account) =>
      getSendableEmailHandles(account).includes(handle),
    );

    if (!isDefined(senderAccount)) {
      return;
    }

    composerState.setSender({
      connectedAccountId: senderAccount.id,
      fromHandle: handle,
    });
  };

  const allRecipientKeys = [
    ...composerState.to,
    ...composerState.cc,
    ...composerState.bcc,
  ].map((recipient) => getEmailRecipientKey(recipient.address));

  const recipientsByFieldId: EmailRecipientsByFieldId = {
    to: composerState.to,
    cc: composerState.cc,
    bcc: composerState.bcc,
  };

  const handleRecipientsByFieldIdChange = (
    nextRecipientsByFieldId: EmailRecipientsByFieldId,
  ) => {
    composerState.setTo(nextRecipientsByFieldId.to);
    composerState.setCc(nextRecipientsByFieldId.cc);
    composerState.setBcc(nextRecipientsByFieldId.bcc);

    if (
      nextRecipientsByFieldId.cc.length > 0 ||
      nextRecipientsByFieldId.bcc.length > 0
    ) {
      composerState.setShowCcBcc(true);
    }
  };

  const { contextValues, draggedRecipients, handlers } =
    useEmailRecipientsDragAndDrop({
      recipientsByFieldId,
      onRecipientsByFieldIdChange: handleRecipientsByFieldIdChange,
    });

  const isDraggingRecipients = isDefined(draggedRecipients);

  const getDraggedIndicesForField = (fieldId: EmailRecipientsFieldId) =>
    draggedRecipients?.fieldId === fieldId ? draggedRecipients.indices : null;

  const areCcBccFieldsVisible = composerState.showCcBcc || isDraggingRecipients;

  return (
    <div {...stylex.props(styles.fieldsContainer)}>
      <DragDropItemDndContext.Provider value={contextValues}>
        <DragDropProvider<EmailRecipientDragData>
          sensors={DND_KIT_SENSORS}
          plugins={DND_KIT_PROVIDER_PLUGINS_WITHOUT_DROP_ANIMATION}
          onDragStart={handlers.onDragStart}
          onDragMove={handlers.onDragMove}
          onDragEnd={handlers.onDragEnd}
        >
          <ComposerHeader>
            {hasMultipleSenders && (
              <ComposerFieldRow label={t`From`}>
                <Select
                  dropdownId="email-composer-from-account"
                  fullWidth
                  value={selectedSenderValue}
                  options={senderOptions}
                  onChange={handleSenderChange}
                />
              </ComposerFieldRow>
            )}
            <ComposerFieldRow
              label={t`To`}
              trailing={
                !areCcBccFieldsVisible && (
                  <button
                    onClick={() => composerState.setShowCcBcc(true)}
                    {...stylex.props(styles.ccBccToggle)}
                  >
                    {t`Cc/Bcc`}
                  </button>
                )
              }
            >
              <EmailRecipientsFieldInput
                fieldId="to"
                draggedSourceIndices={getDraggedIndicesForField('to')}
                label={t`To`}
                recipients={composerState.to}
                onChange={composerState.setTo}
                onSubmit={composerState.handleSend}
                excludedSuggestionKeys={allRecipientKeys}
                contextRecord={contextRecord}
              />
            </ComposerFieldRow>
            {areCcBccFieldsVisible && (
              <>
                <ComposerFieldRow label={t`Cc`}>
                  <EmailRecipientsFieldInput
                    fieldId="cc"
                    draggedSourceIndices={getDraggedIndicesForField('cc')}
                    label={t`Cc`}
                    recipients={composerState.cc}
                    onChange={composerState.setCc}
                    onSubmit={composerState.handleSend}
                    excludedSuggestionKeys={allRecipientKeys}
                    contextRecord={contextRecord}
                  />
                </ComposerFieldRow>
                <ComposerFieldRow label={t`Bcc`}>
                  <EmailRecipientsFieldInput
                    fieldId="bcc"
                    draggedSourceIndices={getDraggedIndicesForField('bcc')}
                    label={t`Bcc`}
                    recipients={composerState.bcc}
                    onChange={composerState.setBcc}
                    onSubmit={composerState.handleSend}
                    excludedSuggestionKeys={allRecipientKeys}
                    contextRecord={contextRecord}
                  />
                </ComposerFieldRow>
              </>
            )}
            <ComposerFieldRow label={t`Subject`}>
              <StyledComposerTextInput
                type="text"
                aria-label={t`Subject`}
                defaultValue={composerState.initialSubject}
                onChange={(event) =>
                  composerState.setSubject(event.target.value)
                }
              />
            </ComposerFieldRow>
          </ComposerHeader>
        </DragDropProvider>
      </DragDropItemDndContext.Provider>
      {composerState.exceedsRecipientLimit && (
        <div {...stylex.props(styles.recipientLimitWarning)}>
          {t`Too many recipients (${composerState.recipientCount}/${composerState.maxRecipients}).`}
        </div>
      )}
      <div {...stylex.props(styles.body)}>
        <FormAdvancedTextFieldInput
          defaultValue={composerState.initialBody}
          onChange={composerState.setBody}
          placeholder={t`Type something or press "/" to see commands`}
          profile={INLINE_EMAIL_BODY_EDITOR_PROFILE}
          onImageUpload={uploadEmailImage}
        />
      </div>
      {(composerState.files.length > 0 || isDefined(onAttachFiles)) && (
        <div {...stylex.props(styles.attachments)}>
          {isDefined(onAttachFiles) && (
            <button
              type="button"
              onClick={onAttachFiles}
              {...stylex.props(styles.attachAction)}
            >
              <IconPaperclip size={theme.icon.size.sm} />
              {t`Attach files`}
            </button>
          )}
          {composerState.files.length > 0 && (
            <EmailAttachmentsField
              files={composerState.files}
              onChange={composerState.setFiles}
            />
          )}
        </div>
      )}
    </div>
  );
};
