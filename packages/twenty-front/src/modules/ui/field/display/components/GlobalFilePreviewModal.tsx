import { Dialog } from 'twenty-ui/primitives/surfaces';
import { DialogInstance } from '@/ui/layout/dialog/components/DialogInstance';
import { downloadFile } from '@/activities/files/utils/downloadFile';
import { filePreviewState } from '@/ui/field/display/states/filePreviewState';
import { useDialog } from '@/ui/layout/dialog/hooks/useDialog';
import { useAtomState } from '@/ui/utilities/state/jotai/hooks/useAtomState';
import { ScrollWrapper } from '@/ui/utilities/scroll/components/ScrollWrapper';
import { useLingui } from '@lingui/react/macro';
import { type JSX, lazy, Suspense, useEffect } from 'react';
import { isDefined } from 'twenty-shared/utils';
import { IconDownload, IconX } from 'twenty-ui/icon';
import { IconButton } from 'twenty-ui/components/input';
import * as stylex from '@stylexjs/stylex';
import {
  borderColor,
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

const GLOBAL_FILE_PREVIEW_MODAL_ID = 'global-file-preview-modal';

const styles = stylex.create({
  modalHeader: {
    gap: spacing['--t-spacing-2'],
    overflow: 'hidden',
    alignItems: 'center',
    display: 'flex',
    flexDirection: 'row',
    justifyContent: 'space-between',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
    borderBottomColor: borderColor['--t-border-color-medium'],
    borderBottomStyle: 'solid',
    borderBottomWidth: '1px',
    height: '60px',
    paddingBottom: spacing['--t-spacing-0'],
    paddingLeft: spacing['--t-spacing-4'],
    paddingRight: spacing['--t-spacing-4'],
    paddingTop: spacing['--t-spacing-0'],
  },
  header: {
    gap: spacing['--t-spacing-2'],
    alignItems: 'center',
    display: 'flex',
    justifyContent: 'space-between',
    width: '100%',
  },
  modalTitle: {
    color: fontColor['--t-font-color-primary'],
    fontSize: fontSize['--t-font-size-xl'],
    fontWeight: fontWeight['--t-font-weight-semi-bold'],
  },
  buttonContainer: {
    gap: spacing['--t-spacing-1'],
    alignItems: 'center',
    display: 'flex',
  },
  modalContent: {
    height: '100%',
    paddingBottom: spacing['--t-spacing-4'],
    paddingLeft: spacing['--t-spacing-4'],
    paddingRight: spacing['--t-spacing-4'],
    paddingTop: spacing['--t-spacing-4'],
  },
  loadingContainer: {
    alignItems: 'center',
    display: 'flex',
    justifyContent: 'center',
    height: '100%',
  },
  loadingText: {
    color: fontColor['--t-font-color-tertiary'],
  },
});

export const GlobalFilePreviewModal = (): JSX.Element | null => {
  const { t } = useLingui();
  const [filePreview, setFilePreview] = useAtomState(filePreviewState);
  const { openDialog, closeDialog } = useDialog();

  useEffect(() => {
    if (isDefined(filePreview)) {
      openDialog(GLOBAL_FILE_PREVIEW_MODAL_ID);
    }
  }, [filePreview, openDialog]);

  const handleClose = () => {
    closeDialog(GLOBAL_FILE_PREVIEW_MODAL_ID);
    setFilePreview(null);
  };

  const handleDownload = () => {
    if (!filePreview || !filePreview.url) return;
    downloadFile(filePreview.url, filePreview.label ?? 'file');
  };

  if (!isDefined(filePreview)) {
    return null;
  }

  return (
    <DialogInstance
      dialogId={GLOBAL_FILE_PREVIEW_MODAL_ID}
      dismissible
      onClose={handleClose}
      renderInDocumentBody
    >
      {({ onKeyDown }) => (
        <Dialog.Popup
          aria-label={filePreview.label ?? t`File preview`}
          onKeyDown={onKeyDown}
          size="lg"
          style={{ padding: 'var(--t-spacing-4)' }}
        >
          <div {...stylex.props(styles.modalHeader)}>
            <div {...stylex.props(styles.header)}>
              <div {...stylex.props(styles.modalTitle)}>
                {filePreview.label}
              </div>
              <div {...stylex.props(styles.buttonContainer)}>
                <IconButton
                  aria-label={t`Download file`}
                  onClick={handleDownload}
                  size="sm"
                >
                  <IconDownload />
                </IconButton>
                <IconButton
                  aria-label={t`Close preview`}
                  onClick={handleClose}
                  size="sm"
                >
                  <IconX />
                </IconButton>
              </div>
            </div>
          </div>
          <ScrollWrapper
            componentInstanceId={`preview-modal-${filePreview.fileId ?? 'file'}`}
          >
            <div {...stylex.props(styles.modalContent)}>
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
                  documentName={filePreview.label ?? t`Untitled`}
                  documentUrl={filePreview.url ?? ''}
                  documentExtension={filePreview.extension ?? ''}
                />
              </Suspense>
            </div>
          </ScrollWrapper>
        </Dialog.Popup>
      )}
    </DialogInstance>
  );
};
