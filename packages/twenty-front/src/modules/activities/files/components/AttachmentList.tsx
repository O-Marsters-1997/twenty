import { Dialog } from 'twenty-ui/primitives/surfaces';
import { DialogInstance } from '@/ui/layout/dialog/components/DialogInstance';
import { t } from '@lingui/core/macro';
import { lazy, Suspense, useState } from 'react';

import { DropZone } from '@/activities/files/components/DropZone';
import { useUploadAttachmentFile } from '@/activities/files/hooks/useUploadAttachmentFile';
import { type Attachment } from '@/activities/files/types/Attachment';
import { downloadFile } from '@/activities/files/utils/downloadFile';
import { type ActivityTargetableObject } from '@/activities/types/ActivityTargetableEntity';
import { isAttachmentPreviewEnabledState } from '@/client-config/states/isAttachmentPreviewEnabledState';
import { useAtomStateValue } from '@/ui/utilities/state/jotai/hooks/useAtomStateValue';

import { ActivityList } from '@/activities/components/ActivityList';
import {
  type AttachmentWithFile,
  filterAttachmentsWithFile,
} from '@/activities/files/utils/filterAttachmentsWithFile';
import { getAttachmentUrl } from '@/activities/utils/getAttachmentUrl';
import { useHasPermissionFlag } from '@/settings/roles/hooks/useHasPermissionFlag';
import { useDialog } from '@/ui/layout/dialog/hooks/useDialog';
import { ScrollWrapper } from '@/ui/utilities/scroll/components/ScrollWrapper';
import { isDefined } from 'twenty-shared/utils';
import { IconDownload, IconX } from 'twenty-ui/icon';
import { IconButton } from 'twenty-ui/components/input';
import { PermissionFlagType } from '~/generated-metadata/graphql';
import { AttachmentRow } from './AttachmentRow';
import * as stylex from '@stylexjs/stylex';
import {
  background,
  fontColor,
  fontSize,
  fontWeight,
  spacing,
} from 'twenty-ui/theme/tokens.stylex';

const DocumentViewer = lazy(() =>
  import('@/activities/files/components/DocumentViewer').then((module) => ({
    default: module.DocumentViewer,
  })),
);

type AttachmentListProps = {
  targetableObject: ActivityTargetableObject;
  attachments: Attachment[];
};

const styles = stylex.create({
  container: {
    flex: '1',
    alignItems: 'flex-start',
    alignSelf: 'stretch',
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
    minHeight: '0',
    width: '100%',
  },
  dropZoneContainer: {
    flex: '1',
    height: '100%',
    minHeight: '0',
    width: '100%',
  },
  loadingContainer: {
    alignItems: 'center',
    backgroundColor: background['--t-background-primary'],
    display: 'flex',
    justifyContent: 'center',
    height: 'calc(80vh / var(--t-zoom, 1))',
    width: '100%',
  },
  loadingText: {
    color: fontColor['--t-font-color-secondary'],
    fontSize: fontSize['--t-font-size-lg'],
    fontWeight: fontWeight['--t-font-weight-medium'],
  },
  header: {
    alignItems: 'center',
    display: 'flex',
    justifyContent: 'space-between',
    minHeight: '40px',
    width: '100%',
  },
  modalTitle: {
    color: fontColor['--t-font-color-primary'],
  },
  buttonContainer: {
    gap: spacing['--t-spacing-1'],
    display: 'flex',
    flexDirection: 'row',
  },
});

const PREVIEW_MODAL_ID = 'preview-modal';

export const AttachmentList = ({
  targetableObject,
  attachments,
}: AttachmentListProps) => {
  const { uploadAttachmentFile } = useUploadAttachmentFile();
  const [isDraggingFile, setIsDraggingFile] = useState(false);
  const [previewedAttachment, setPreviewedAttachment] =
    useState<AttachmentWithFile | null>(null);

  const isAttachmentPreviewEnabled = useAtomStateValue(
    isAttachmentPreviewEnabledState,
  );

  const hasDownloadPermission = useHasPermissionFlag(
    PermissionFlagType.DOWNLOAD_FILE,
  );

  const hasUploadPermission = useHasPermissionFlag(
    PermissionFlagType.UPLOAD_FILE,
  );

  const { openDialog, closeDialog } = useDialog();

  const attachmentsWithFile = filterAttachmentsWithFile(attachments);

  const onUploadFile = async (file: File) => {
    await uploadAttachmentFile(file, targetableObject);
  };

  const onUploadFiles = async (files: File[]) => {
    for (const file of files) {
      await onUploadFile(file);
    }
  };

  const handlePreview = (attachment: AttachmentWithFile) => {
    if (!isAttachmentPreviewEnabled) return;
    setPreviewedAttachment(attachment);
    openDialog(PREVIEW_MODAL_ID);
  };

  const handleClosePreview = () => {
    closeDialog(PREVIEW_MODAL_ID);
    setPreviewedAttachment(null);
  };

  const handleDownload = () => {
    if (!isDefined(previewedAttachment)) return;
    const attachmentUrl = getAttachmentUrl({ attachment: previewedAttachment });
    downloadFile(attachmentUrl, previewedAttachment.name);
  };

  return (
    <>
      {attachmentsWithFile.length > 0 && (
        <div {...stylex.props(styles.container)}>
          <div
            onDragEnter={() => hasUploadPermission && setIsDraggingFile(true)}
            {...stylex.props(styles.dropZoneContainer)}
          >
            {isDraggingFile && hasUploadPermission ? (
              <DropZone
                setIsDraggingFile={setIsDraggingFile}
                onUploadFiles={onUploadFiles}
              />
            ) : (
              <ActivityList>
                {attachmentsWithFile.map((attachment) => (
                  <AttachmentRow
                    key={attachment.id}
                    attachment={attachment}
                    onPreview={
                      isAttachmentPreviewEnabled ? handlePreview : undefined
                    }
                  />
                ))}
              </ActivityList>
            )}
          </div>
        </div>
      )}
      {previewedAttachment && isAttachmentPreviewEnabled && (
        <DialogInstance
          dialogId={PREVIEW_MODAL_ID}
          dismissible
          onClose={handleClosePreview}
          renderInDocumentBody
        >
          {({ onKeyDown }) => (
            <Dialog.Popup
              aria-label={previewedAttachment.name}
              onKeyDown={onKeyDown}
              size="lg"
              style={{
                padding: 'var(--t-spacing-2)',
                gap: 'var(--t-spacing-2)',
              }}
            >
              <Dialog.Header
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  height: 'auto',
                  padding: 0,
                }}
              >
                <div {...stylex.props(styles.header)}>
                  <span {...stylex.props(styles.modalTitle)}>
                    {previewedAttachment.name}
                  </span>
                  <div {...stylex.props(styles.buttonContainer)}>
                    {hasDownloadPermission && (
                      <IconButton
                        aria-label={t`Download attachment`}
                        onClick={handleDownload}
                        size="sm"
                      >
                        <IconDownload />
                      </IconButton>
                    )}
                    <IconButton
                      aria-label={t`Close preview`}
                      onClick={handleClosePreview}
                      size="sm"
                    >
                      <IconX />
                    </IconButton>
                  </div>
                </div>
              </Dialog.Header>
              <ScrollWrapper
                componentInstanceId={`preview-modal-${previewedAttachment.id}`}
              >
                <Dialog.Body
                  style={{
                    display: 'flex',
                    flex: '1 1 0%',
                    flexDirection: 'column',
                    padding: 0,
                  }}
                >
                  <Suspense
                    fallback={
                      <div {...stylex.props(styles.loadingContainer)}>
                        <div {...stylex.props(styles.loadingText)}>
                          {t`Loading document viewer...`}
                        </div>
                      </div>
                    }
                  >
                    <DocumentViewer
                      documentName={previewedAttachment.name}
                      documentUrl={getAttachmentUrl({
                        attachment: previewedAttachment,
                      })}
                    />
                  </Suspense>
                </Dialog.Body>
              </ScrollWrapper>
            </Dialog.Popup>
          )}
        </DialogInstance>
      )}
    </>
  );
};
