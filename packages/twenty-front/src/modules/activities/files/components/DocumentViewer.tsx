import { UnavailableFilePreview } from '@/activities/files/components/UnavailableFilePreview';
import { VideoPreview } from '@/activities/files/components/VideoPreview';
import { PREVIEWABLE_EXTENSIONS } from '@/activities/files/constants/PreviewableExtensions';
import { downloadFile } from '@/activities/files/utils/downloadFile';
import {
  type CsvPreviewData,
  fetchCsvPreview,
} from '@/activities/files/utils/fetchCsvPreview';
import { getFileType } from '@/activities/files/utils/getFileType';
import DocViewer, { DocViewerRenderers } from '@cyntler/react-doc-viewer';
import '@cyntler/react-doc-viewer/dist/index.css';
import { Trans, useLingui } from '@lingui/react/macro';
import { type ReactNode, useEffect, useState } from 'react';
import { isDefined } from 'twenty-shared/utils';
import { IconDownload } from 'twenty-ui/icon';
import { Button } from 'twenty-ui/primitives/input';
import { useTheme } from 'twenty-ui/theme';
import { getFileNameAndExtension } from '~/utils/file/getFileNameAndExtension';
import '~/third-party-styles/document-viewer.css';
import * as stylex from '@stylexjs/stylex';
import {
  background,
  backgroundTransparent,
  borderColor,
  fontColor,
  fontSize,
  fontWeight,
  spacing,
} from 'twenty-ui/theme/tokens.stylex';

const MS_OFFICE_EXTENSIONS = [
  'doc',
  'docx',
  'ppt',
  'pptx',
  'xls',
  'xlsx',
  'odt',
];

const styles = stylex.create({
  documentViewerContainer: {
    backgroundColor: background['--t-background-secondary'],
    display: 'flex',
    flexDirection: 'column',
    position: 'relative',
    height: 'calc(100vh / var(--t-zoom, 1) - 200px)',
    minHeight: '500px',
    width: '100%',
  },
  documentViewerContainerTransparent: {
    backgroundColor: 'transparent',
  },
  csvTable: {
    borderCollapse: 'collapse',
    fontSize: fontSize['--t-font-size-sm'],
    textAlign: 'left',
    width: '100%',
  },
  csvHeaderCell: {
    paddingBlock: 0,
    paddingInline: spacing['--t-spacing-2'],
    color: fontColor['--t-font-color-tertiary'],
    fontWeight: fontWeight['--t-font-weight-medium'],
    borderBottomColor: borderColor['--t-border-color-light'],
    borderBottomStyle: 'solid',
    borderBottomWidth: 1,
    height: spacing['--t-spacing-8'],
  },
  csvRow: {
    backgroundColor: {
      default: null,
      ':hover': backgroundTransparent['--t-background-transparent-light'],
    },
    borderBottomColor: borderColor['--t-border-color-light'],
    borderBottomStyle: 'solid',
    borderBottomWidth: 1,
  },
  csvCell: {
    overflow: 'hidden',
    paddingBlock: 0,
    paddingInline: spacing['--t-spacing-2'],
    color: fontColor['--t-font-color-secondary'],
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
    height: spacing['--t-spacing-8'],
    maxWidth: '200px',
  },
  unavailablePreviewContainer: {
    gap: spacing['--t-spacing-4'],
    paddingBlock: spacing['--t-spacing-8'],
    paddingInline: spacing['--t-spacing-8'],
    alignItems: 'center',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    textAlign: 'center',
    height: '100%',
  },
  lightMessage: {
    color: fontColor['--t-font-color-tertiary'],
    fontSize: fontSize['--t-font-size-sm'],
  },
});

const DocumentViewerContainer = ({
  children,
  isTransparent = false,
}: {
  children: ReactNode;
  isTransparent?: boolean;
}) => (
  <div
    data-document-viewer
    {...stylex.props(
      styles.documentViewerContainer,
      isTransparent && styles.documentViewerContainerTransparent,
    )}
  >
    {children}
  </div>
);

type DocumentViewerProps = {
  documentName: string;
  documentUrl: string;
  documentExtension?: string;
};

// MS Office Online only fetches public URLs and its failure is undetectable (no postMessage, CORS, cross-origin),
// so localhost and private IPs are caught by URL; other private hosts get Microsoft's error page but can still download.
// See https://github.com/twentyhq/twenty/issues/16900
const isPrivateUrl = (url: string): boolean => {
  try {
    const { hostname } = new URL(url);

    if (
      hostname === 'localhost' ||
      hostname === '127.0.0.1' ||
      hostname === '[::1]'
    ) {
      return true;
    }

    const ipParts = hostname.split('.').map(Number);
    if (ipParts.length === 4 && ipParts.every((part) => !isNaN(part))) {
      if (ipParts[0] === 10) return true;
      if (ipParts[0] === 172 && ipParts[1] >= 16 && ipParts[1] <= 31)
        return true;
      if (ipParts[0] === 192 && ipParts[1] === 168) return true;
    }

    if (
      hostname.endsWith('.local') ||
      hostname.endsWith('.localhost') ||
      hostname.endsWith('.internal')
    ) {
      return true;
    }

    return false;
  } catch {
    return false;
  }
};

const MIME_TYPE_MAPPING: Record<
  (typeof PREVIEWABLE_EXTENSIONS)[number],
  string
> = {
  bmp: 'image/bmp',
  csv: 'text/csv',
  odt: 'application/vnd.oasis.opendocument.text',
  doc: 'application/msword',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  gif: 'image/gif',
  htm: 'text/html',
  html: 'text/html',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  pdf: 'application/pdf',
  png: 'image/png',
  ppt: 'application/vnd.ms-powerpoint',
  pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  tiff: 'image/tiff',
  txt: 'text/plain',
  xls: 'application/vnd.ms-excel',
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  mp4: 'video/mp4',
  webp: 'image/webp',
};

export const DocumentViewer = ({
  documentName,
  documentUrl,
  documentExtension,
}: DocumentViewerProps) => {
  const theme = useTheme();
  const { t } = useLingui();
  const [csvPreview, setCsvPreview] = useState<CsvPreviewData | undefined>(
    undefined,
  );

  const { extension } = getFileNameAndExtension(documentName);
  const fileExtension = isDefined(documentExtension)
    ? documentExtension.toLowerCase().replace('.', '')
    : (extension?.toLowerCase().replace('.', '') ?? '');
  const fileCategory = getFileType(documentName);
  const isPreviewable = PREVIEWABLE_EXTENSIONS.includes(fileExtension);
  const isMsOfficeFile = MS_OFFICE_EXTENSIONS.includes(fileExtension);

  const mimeType = isPreviewable ? MIME_TYPE_MAPPING[fileExtension] : undefined;
  const isVideo = mimeType?.startsWith('video/') === true;

  useEffect(() => {
    if (fileExtension === 'csv') {
      fetchCsvPreview(documentUrl).then(setCsvPreview);
    }
  }, [documentUrl, fileExtension]);

  if (!isPreviewable) {
    return (
      <DocumentViewerContainer>
        <UnavailableFilePreview
          fileName={documentName}
          fileUrl={documentUrl}
          message={
            fileCategory === 'ARCHIVE' ? (
              <Trans>
                Archive files cannot be previewed. Please download the file to
                access its contents.
              </Trans>
            ) : (
              <Trans>
                This file type cannot be previewed. Please download the file to
                view it.
              </Trans>
            )
          }
        />
      </DocumentViewerContainer>
    );
  }

  if (isVideo) {
    return (
      <DocumentViewerContainer>
        <VideoPreview
          key={documentUrl}
          videoName={documentName}
          videoUrl={documentUrl}
        />
      </DocumentViewerContainer>
    );
  }

  if (fileExtension === 'csv') {
    if (!isDefined(csvPreview)) {
      return (
        <DocumentViewerContainer>
          <Trans>Loading csv ... </Trans>
        </DocumentViewerContainer>
      );
    }
    return (
      <DocumentViewerContainer isTransparent>
        <table {...stylex.props(styles.csvTable)}>
          <thead>
            <tr>
              {csvPreview.headers.map((header, columnIndex) => (
                <th key={columnIndex} {...stylex.props(styles.csvHeaderCell)}>
                  {header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {csvPreview.rows.map((row, rowIndex) => (
              <tr key={rowIndex} {...stylex.props(styles.csvRow)}>
                {row.map((cell, cellIndex) => (
                  <td key={cellIndex} {...stylex.props(styles.csvCell)}>
                    {cell}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </DocumentViewerContainer>
    );
  }

  if (isMsOfficeFile && isPrivateUrl(documentUrl)) {
    return (
      <DocumentViewerContainer>
        <div {...stylex.props(styles.unavailablePreviewContainer)}>
          <div {...stylex.props(styles.lightMessage)}>
            <Trans>
              This file cannot be previewed because it is hosted locally.
            </Trans>
          </div>
          <Button
            startIcon={<IconDownload />}
            onClick={() => downloadFile(documentUrl, documentName)}
            size="sm"
            variant="outline"
          >{t`Download`}</Button>
        </div>
      </DocumentViewerContainer>
    );
  }

  return (
    <DocumentViewerContainer>
      <DocViewer
        documents={[
          {
            uri: documentUrl,
            fileName: documentName,
            fileType: mimeType,
          },
        ]}
        pluginRenderers={DocViewerRenderers}
        style={{
          height: '100%',
          color: theme.font.color.primary,
          backgroundColor: theme.background.primary,
        }}
        config={{
          header: {
            disableHeader: true,
            disableFileName: true,
            retainURLParams: false,
          },
          pdfVerticalScrollByDefault: true,
          pdfZoom: {
            defaultZoom: 1,
            zoomJump: 0.1,
          },
        }}
        theme={{
          primary: theme.background.primary,
          secondary: theme.background.secondary,
          tertiary: theme.background.tertiary,
          textPrimary: theme.font.color.primary,
          textSecondary: theme.font.color.secondary,
          textTertiary: theme.font.color.tertiary,
          disableThemeScrollbar: true,
        }}
      />
    </DocumentViewerContainer>
  );
};
