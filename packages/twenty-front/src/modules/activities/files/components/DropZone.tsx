import { useLingui } from '@lingui/react/macro';
import { useDropzone } from 'react-dropzone';

import { useSpreadsheetImportInternal } from '@/spreadsheet-import/hooks/useSpreadsheetImportInternal';
import { IconUpload } from 'twenty-ui/icon';
import { useTheme } from 'twenty-ui/theme';
import * as stylex from '@stylexjs/stylex';
import {
  background,
  borderColor,
  borderRadius,
  fontColor,
  fontSize,
  fontWeight,
  spacing,
  textLineHeight,
} from 'twenty-ui/theme/tokens.stylex';

const styles = stylex.create({
  container: {
    borderColor: borderColor['--t-border-color-strong'],
    borderRadius: borderRadius['--t-border-radius-sm'],
    borderStyle: 'dashed',
    borderWidth: '2px',
    alignItems: 'center',
    backgroundColor: background['--t-background-secondary'],
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    textAlign: 'center',
    height: '100%',
  },
  uploadDragTitle: {
    color: fontColor['--t-font-color-primary'],
    fontSize: fontSize['--t-font-size-lg'],
    fontWeight: fontWeight['--t-font-weight-medium'],
    lineHeight: textLineHeight['--t-text-line-height-md'],
    marginBottom: '8px',
  },
  uploadDragSubTitle: {
    color: fontColor['--t-font-color-tertiary'],
    fontSize: fontSize['--t-font-size-md'],
    fontWeight: fontWeight['--t-font-weight-regular'],
    lineHeight: textLineHeight['--t-text-line-height-md'],
  },
  uploadIconContainer: {
    color: fontColor['--t-font-color-tertiary'],
    display: 'flex',
    marginBottom: spacing['--t-spacing-3'],
  },
});

type DropZoneProps = {
  setIsDraggingFile: (drag: boolean) => void;
  onUploadFiles: (files: File[]) => void;
};

export const DropZone = ({
  setIsDraggingFile,
  onUploadFiles,
}: DropZoneProps) => {
  const theme = useTheme();
  const { t } = useLingui();
  const { maxFileSize } = useSpreadsheetImportInternal();

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    noClick: true,
    noKeyboard: true,
    multiple: true,
    maxSize: maxFileSize,
    onDragEnter: () => {
      setIsDraggingFile(true);
    },
    onDragLeave: () => {
      setIsDraggingFile(false);
    },
    onDrop: () => {
      setIsDraggingFile(false);
    },
    onDropAccepted: async (files) => {
      onUploadFiles(files);
      setIsDraggingFile(false);
    },
  });

  return (
    <div
      // oxlint-disable-next-line react/jsx-props-no-spreading
      {...getRootProps()}
      {...stylex.props(styles.container)}
    >
      {isDragActive && (
        <>
          <input
            // oxlint-disable-next-line react/jsx-props-no-spreading
            {...getInputProps()}
          />
          <div {...stylex.props(styles.uploadIconContainer)}>
            <IconUpload
              stroke={theme.icon.stroke.sm}
              size={theme.icon.size.lg}
            />
          </div>
          <div {...stylex.props(styles.uploadDragTitle)}>{t`Upload files`}</div>
          <div {...stylex.props(styles.uploadDragSubTitle)}>
            {t`Drag and Drop Here`}
          </div>
        </>
      )}
    </div>
  );
};
