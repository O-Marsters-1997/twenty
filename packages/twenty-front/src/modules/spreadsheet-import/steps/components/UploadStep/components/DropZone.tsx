import { useNumberFormat } from '@/localization/hooks/useNumberFormat';
import { SPREADSHEET_MAX_RECORD_IMPORT_CAPACITY } from '@/spreadsheet-import/constants/SpreadsheetMaxRecordImportCapacity';
import { useSpreadsheetImportInternal } from '@/spreadsheet-import/hooks/useSpreadsheetImportInternal';
import { useDownloadFakeRecords } from '@/spreadsheet-import/steps/components/UploadStep/hooks/useDownloadFakeRecords';
import { readFileAsync } from '@/spreadsheet-import/utils/readFilesAsync';
import { Trans, useLingui } from '@lingui/react/macro';
import { useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { useToast } from 'twenty-ui/components/feedback';
import { MainButton } from 'twenty-ui/components/input';
import { read, type WorkBook } from 'xlsx-ugnis';
import * as stylex from '@stylexjs/stylex';
import { backgroundTransparent, borderRadius, fontColor, fontSize, fontWeight, spacing } from 'twenty-ui/theme/tokens.stylex';

type DropZoneProps = {
  onContinue: (data: WorkBook, file: File) => void;
  isLoading: boolean;
};

export const DropZone = ({ onContinue, isLoading }: DropZoneProps) => {
  const { maxFileSize, dateFormat, parseRaw } = useSpreadsheetImportInternal();
  const { formatNumber } = useNumberFormat();

  const [loading, setLoading] = useState(false);

  const { enqueueToast } = useToast();

  const { downloadSample } = useDownloadFakeRecords();

  const { getRootProps, getInputProps, isDragActive, open } = useDropzone({
    noClick: true,
    noKeyboard: true,
    maxFiles: 1,
    maxSize: maxFileSize,
    accept: {
      'application/vnd.ms-excel': ['.xls'],
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': [
        '.xlsx',
      ],
      'text/csv': ['.csv'],
    },
    onDropRejected: (fileRejections) => {
      setLoading(false);
      fileRejections.forEach((fileRejection) => {
        const fileName = fileRejection.file.name;
        enqueueToast({
          status: 'error',
          children: t`${fileName} upload rejected`,
          description: fileRejection.errors[0].message,
        });
      });
    },
    onDropAccepted: async ([file]) => {
      setLoading(true);
      const arrayBuffer = await readFileAsync(file);
      const workbook = read(arrayBuffer, {
        cellDates: true,
        codepage: 65001, // UTF-8 codepage
        dateNF: dateFormat,
        raw: parseRaw,
        dense: true,
      });
      setLoading(false);
      onContinue(workbook, file);
    },
  });

  const { t } = useLingui();

  const formatSpreadsheetMaxRecordImportCapacity = formatNumber(
    SPREADSHEET_MAX_RECORD_IMPORT_CAPACITY,
  );

  return (
    <div
      // oxlint-disable-next-line react/jsx-props-no-spreading
      {...getRootProps()} {...stylex.props(styles.container)}
    >
      {isDragActive && <div {...stylex.props(styles.overlay)} />}
      <input
        // oxlint-disable-next-line react/jsx-props-no-spreading
        {...getInputProps()}
      />
      {isDragActive ? (
        <span {...stylex.props(styles.text)}>
          <Trans>Drop file here...</Trans>
        </span>
      ) : loading || isLoading ? (
        <span {...stylex.props(styles.text)}>
          <Trans>Processing...</Trans>
        </span>
      ) : (
        <>
          <span {...stylex.props(styles.text)}>
            <Trans>Upload .xlsx, .xls or .csv file</Trans>
          </span>
          <div {...stylex.props(styles.buttonsContainer)}>
            <MainButton onClick={open} fullWidth>{t`Select file`}</MainButton>
            <MainButton
              onClick={downloadSample}
              fullWidth
              variant="outline"
            >{t`Download sample`}</MainButton>
          </div>
          <span {...stylex.props(styles.footerText)}>
            {t`Max import capacity: ${formatSpreadsheetMaxRecordImportCapacity} records. Otherwise, consider splitting your file or using the API.`}
          </span>
        </>
      )}
    </div>
  );
};

const styles = stylex.create({
  container: {
    alignItems: 'center',
    background: `repeating-linear-gradient(
      0deg,
      ${fontColor['--t-font-color-primary']},
      ${fontColor['--t-font-color-primary']} 10px,
      transparent 10px,
      transparent 20px,
      ${fontColor['--t-font-color-primary']} 20px
    ),
    repeating-linear-gradient(
      90deg,
      ${fontColor['--t-font-color-primary']},
      ${fontColor['--t-font-color-primary']} 10px,
      transparent 10px,
      transparent 20px,
      ${fontColor['--t-font-color-primary']} 20px
    ),
    repeating-linear-gradient(
      180deg,
      ${fontColor['--t-font-color-primary']},
      ${fontColor['--t-font-color-primary']} 10px,
      transparent 10px,
      transparent 20px,
      ${fontColor['--t-font-color-primary']} 20px
    ),
    repeating-linear-gradient(
      270deg,
      ${fontColor['--t-font-color-primary']},
      ${fontColor['--t-font-color-primary']} 10px,
      transparent 10px,
      transparent 20px,
      ${fontColor['--t-font-color-primary']} 20px
    )`,
    backgroundPosition: '0 0, 0 0, 100% 0, 0 100%',
    backgroundRepeat: 'no-repeat',
    backgroundSize: '2px 100%, 100% 2px, 2px 100%, 100% 2px',
    borderRadius: borderRadius['--t-border-radius-sm'],
    display: 'flex',
    flex: 1,
    flexDirection: 'column',
    justifyContent: 'center',
    position: 'relative',
  },
  overlay: {
    background: backgroundTransparent['--t-background-transparent-medium'],
    borderRadius: borderRadius['--t-border-radius-sm'],
    bottom: '0px',
    left: '0px',
    position: 'absolute',
    right: '0px',
    top: '0px',
  },
  text: {
    color: fontColor['--t-font-color-primary'],
    fontSize: fontSize['--t-font-size-sm'],
    fontWeight: fontWeight['--t-font-weight-medium'],
    padding: '16px',
    textAlign: 'center',
  },
  footerText: {
    bottom: spacing['--t-spacing-4'],
    color: fontColor['--t-font-color-tertiary'],
    fontSize: fontSize['--t-font-size-xs'],
    fontWeight: fontWeight['--t-font-weight-regular'],
    left: '50%',
    position: 'absolute',
    textAlign: 'center',
    transform: 'translateX(-50%)',
    width: '100%',
  },
  buttonsContainer: {
    alignItems: 'center',
    display: 'flex',
    flexDirection: 'column',
    gap: spacing['--t-spacing-2'],
    maxWidth: '200px',
    width: '100%',
  },
});
