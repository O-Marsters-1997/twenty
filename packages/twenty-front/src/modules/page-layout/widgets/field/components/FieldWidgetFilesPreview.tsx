import { PREVIEWABLE_EXTENSIONS } from '@/activities/files/constants/PreviewableExtensions';
import { downloadFile } from '@/activities/files/utils/downloadFile';
import { type FieldFilesValue } from '@/object-record/record-field/ui/types/FieldMetadata';
import { useHasPermissionFlag } from '@/settings/roles/hooks/useHasPermissionFlag';
import { useLingui } from '@lingui/react/macro';
import { lazy, Suspense } from 'react';
import { IconDownload } from 'twenty-ui/icon';
import { Button } from 'twenty-ui/primitives/input';
import { getFileNameAndExtension } from '~/utils/file/getFileNameAndExtension';
import { PermissionFlagType } from '~/generated-metadata/graphql';
import * as stylex from '@stylexjs/stylex';
import { fontColor, spacing } from 'twenty-ui/theme/tokens.stylex';

const DocumentViewer = lazy(() =>
  import('@/activities/files/components/DocumentViewer').then((module) => ({
    default: module.DocumentViewer,
  })),
);

const styles = stylex.create({
  container: {
    display: 'flex',
    flexDirection: 'column',
    gap: spacing['--t-spacing-2'],
    width: '100%',
  },
  actions: {
    display: 'flex',
    justifyContent: 'flex-end',
  },
  loadingText: {
    color: fontColor['--t-font-color-tertiary'],
    paddingTop: spacing['--t-spacing-4'],
    paddingRight: spacing['--t-spacing-4'],
    paddingBottom: spacing['--t-spacing-4'],
    paddingLeft: spacing['--t-spacing-4'],
  },
});

type FieldWidgetFilesPreviewProps = {
  file: FieldFilesValue & { url: string };
};

export const FieldWidgetFilesPreview = ({
  file,
}: FieldWidgetFilesPreviewProps) => {
  const { t } = useLingui();

  const hasDownloadPermission = useHasPermissionFlag(
    PermissionFlagType.DOWNLOAD_FILE,
  );

  const fileExtension = (
    file.extension ??
    getFileNameAndExtension(file.label).extension ??
    ''
  )
    .toLowerCase()
    .replace('.', '');

  // Unpreviewable files get their own download action in the unavailable state.
  const isPreviewable = PREVIEWABLE_EXTENSIONS.includes(fileExtension);

  return (
    <div {...stylex.props(styles.container)}>
      {hasDownloadPermission && isPreviewable && (
        <div {...stylex.props(styles.actions)}>
          <Button
            startIcon={<IconDownload />}
            size="sm"
            variant="outline"
            onClick={() => downloadFile(file.url, file.label)}
          >{t`Download`}</Button>
        </div>
      )}
      <Suspense
        fallback={
          <div {...stylex.props(styles.loadingText)}>{t`Loading document viewer...`}</div>
        }
      >
        <DocumentViewer
          documentName={file.label}
          documentUrl={file.url}
          documentExtension={file.extension}
        />
      </Suspense>
    </div>
  );
};
