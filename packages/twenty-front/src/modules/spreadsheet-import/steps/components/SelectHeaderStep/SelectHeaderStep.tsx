import { Dialog } from 'twenty-ui/primitives/surfaces';
import { useCallback, useState } from 'react';

import { Heading } from '@/spreadsheet-import/components/Heading';
import { StepNavigationButton } from '@/spreadsheet-import/components/StepNavigationButton';
import { type ImportedRow } from '@/spreadsheet-import/types';

import { useComputeColumnSuggestionsAndAutoMatch } from '@/spreadsheet-import/hooks/useComputeColumnSuggestionsAndAutoMatch';
import { useSpreadsheetImportInternal } from '@/spreadsheet-import/hooks/useSpreadsheetImportInternal';
import { type SpreadsheetImportStep } from '@/spreadsheet-import/steps/types/SpreadsheetImportStep';
import { SpreadsheetImportStepType } from '@/spreadsheet-import/steps/types/SpreadsheetImportStepType';
import { useLingui } from '@lingui/react/macro';
import { SelectHeaderTable } from './components/SelectHeaderTable';
import * as stylex from '@stylexjs/stylex';
import { spacing } from 'twenty-ui/theme/tokens.stylex';

type SelectHeaderStepProps = {
  importedRows: ImportedRow[];
  setCurrentStepState: (currentStepState: SpreadsheetImportStep) => void;
  nextStep: () => void;
  setPreviousStepState: (currentStepState: SpreadsheetImportStep) => void;
  onError: (message: string) => void;
  onBack: () => void;
  currentStepState: SpreadsheetImportStep;
};

export const SelectHeaderStep = ({
  importedRows,
  setCurrentStepState,
  nextStep,
  setPreviousStepState,
  onError,
  onBack,
  currentStepState,
}: SelectHeaderStepProps) => {
  const [selectedRowIndex, setSelectedRowIndex] = useState(0);

  const [isLoading, setIsLoading] = useState(false);

  const { selectHeaderStepHook } = useSpreadsheetImportInternal();

  const computeColumnSuggestionsAndAutoMatch =
    useComputeColumnSuggestionsAndAutoMatch();

  const handleContinue = useCallback(
    async (...args: Parameters<typeof selectHeaderStepHook>) => {
      try {
        const { importedRows: data, headerRow: headerValues } =
          await selectHeaderStepHook(...args);

        await computeColumnSuggestionsAndAutoMatch({
          headerValues,
          data,
        });

        setCurrentStepState({
          type: SpreadsheetImportStepType.matchColumns,
          data,
          headerValues,
        });
        setPreviousStepState(currentStepState);
        nextStep();
      } catch (e) {
        onError((e as Error).message);
      }
    },
    [
      onError,
      nextStep,
      selectHeaderStepHook,
      setPreviousStepState,
      setCurrentStepState,
      currentStepState,
      computeColumnSuggestionsAndAutoMatch,
    ],
  );

  const handleOnContinue = useCallback(async () => {
    // We consider data above header to be redundant
    const trimmedData = importedRows.slice(selectedRowIndex + 1);

    setIsLoading(true);

    await handleContinue(importedRows[selectedRowIndex], trimmedData);

    setIsLoading(false);
  }, [handleContinue, importedRows, selectedRowIndex]);

  const { t } = useLingui();

  return (
    <>
      <Dialog.Body {...stylex.props(styles.dialogBody)}>
        <div {...stylex.props(styles.headingContainer)}>
          <Heading title={t`Select header row`} />
        </div>
        <div {...stylex.props(styles.tableContainer)}>
          <SelectHeaderTable
            importedRows={importedRows}
            selectedRowIndex={selectedRowIndex}
            onSelectedRowChange={setSelectedRowIndex}
          />
        </div>
      </Dialog.Body>
      <StepNavigationButton
        onContinue={handleOnContinue}
        onBack={onBack}
        continueTitle={t`Continue`}
        isLoading={isLoading}
      />
    </>
  );
};

const styles = stylex.create({
  dialogBody: {
    paddingBlock: spacing['--t-spacing-10'],
    paddingInline: spacing['--t-spacing-10'],
    display: 'flex',
    flexBasis: '0%',
    flexDirection: 'column',
    flexGrow: 1,
    flexShrink: 1,
  },
  headingContainer: {
    marginBottom: spacing['--t-spacing-8'],
  },
  tableContainer: {
    display: 'flex',
    flexGrow: 1,
    height: '0px',
  },
});
