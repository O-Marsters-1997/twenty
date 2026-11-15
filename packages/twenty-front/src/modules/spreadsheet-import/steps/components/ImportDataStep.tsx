import { Dialog } from 'twenty-ui/primitives/surfaces';
import { useNumberFormat } from '@/localization/hooks/useNumberFormat';
import { StepNavigationButton } from '@/spreadsheet-import/components/StepNavigationButton';
import { useSpreadsheetImportInternal } from '@/spreadsheet-import/hooks/useSpreadsheetImportInternal';
import { spreadsheetImportCreatedRecordsProgressState } from '@/spreadsheet-import/states/spreadsheetImportCreatedRecordsProgressState';
import { useAtomStateValue } from '@/ui/utilities/state/jotai/hooks/useAtomStateValue';
import { t } from '@lingui/core/macro';
import { Loader } from 'twenty-ui/primitives/feedback';
import * as stylex from '@stylexjs/stylex';
import { fontColor, fontSize, fontWeight, spacing } from 'twenty-ui/theme/tokens.stylex';

const styles = stylex.create({
  dialogBody: {
    display: 'flex',
    flexBasis: '0%',
    flexGrow: 1,
    flexShrink: 1,
    flexDirection: 'column',
    paddingBlock: 0,
    paddingInline: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  header: {
    color: fontColor['--t-font-color-primary'],
    fontSize: fontSize['--t-font-size-md'],
    fontWeight: fontWeight['--t-font-weight-medium'],
    marginBottom: spacing['--t-spacing-2'],
  },
  description: {
    color: fontColor['--t-font-color-tertiary'],
    fontSize: fontSize['--t-font-size-md'],
    fontWeight: fontWeight['--t-font-weight-regular'],
    marginBottom: spacing['--t-spacing-5'],
  },
});

type ImportDataStepProps = {
  recordsToImportCount: number;
};

export const ImportDataStep = ({
  recordsToImportCount,
}: ImportDataStepProps) => {
  const { onClose } = useSpreadsheetImportInternal();
  const spreadsheetImportCreatedRecordsProgress = useAtomStateValue(
    spreadsheetImportCreatedRecordsProgressState,
  );
  const { formatNumber } = useNumberFormat();

  const formattedCreatedRecordsProgress = formatNumber(
    spreadsheetImportCreatedRecordsProgress,
  );
  const formattedRecordsToImportCount = formatNumber(recordsToImportCount);

  return (
    <>
      <Dialog.Body
        {...stylex.props(styles.dialogBody)}
      >
        <span {...stylex.props(styles.header)}>{t`Importing Data ...`}</span>
        <span {...stylex.props(styles.description)}>{t`${formattedCreatedRecordsProgress} out of ${formattedRecordsToImportCount} records imported.`}</span>
        <Loader />
      </Dialog.Body>
      <StepNavigationButton onBack={onClose} backTitle={t`Cancel`} />
    </>
  );
};
