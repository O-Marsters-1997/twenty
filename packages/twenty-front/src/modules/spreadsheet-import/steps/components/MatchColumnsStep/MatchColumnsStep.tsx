import { Dialog } from 'twenty-ui/primitives/surfaces';
import { useCallback, useMemo, useState } from 'react';

import { StepNavigationButton } from '@/spreadsheet-import/components/StepNavigationButton';
import { useSpreadsheetImportInternal } from '@/spreadsheet-import/hooks/useSpreadsheetImportInternal';
import {
  type ImportedRow,
  type ImportedStructuredRow,
} from '@/spreadsheet-import/types';
import { findUnmatchedRequiredFields } from '@/spreadsheet-import/utils/findUnmatchedRequiredFields';
import { normalizeTableData } from '@/spreadsheet-import/utils/normalizeTableData';
import { setColumn } from '@/spreadsheet-import/utils/setColumn';
import { setIgnoreColumn } from '@/spreadsheet-import/utils/setIgnoreColumn';
import { setSubColumn } from '@/spreadsheet-import/utils/setSubColumn';
import { useDialogManager } from '@/ui/feedback/dialog-manager/hooks/useDialogManager';

import { DO_NOT_IMPORT_OPTION_KEY } from '@/spreadsheet-import/constants/DoNotImportOptionKey';
import { ColumnGrid } from '@/spreadsheet-import/steps/components/MatchColumnsStep/components/ColumnGrid';
import { TemplateColumn } from '@/spreadsheet-import/steps/components/MatchColumnsStep/components/TemplateColumn';
import { UnmatchColumn } from '@/spreadsheet-import/steps/components/MatchColumnsStep/components/UnmatchColumn';
import { UserTableColumn } from '@/spreadsheet-import/steps/components/MatchColumnsStep/components/UserTableColumn';
import { initialComputedColumnsSelector } from '@/spreadsheet-import/steps/components/MatchColumnsStep/components/states/initialComputedColumnsState';
import { type SpreadsheetImportStep } from '@/spreadsheet-import/steps/types/SpreadsheetImportStep';
import { SpreadsheetImportStepType } from '@/spreadsheet-import/steps/types/SpreadsheetImportStepType';
import { type SpreadsheetColumn } from '@/spreadsheet-import/types/SpreadsheetColumn';
import { SpreadsheetColumnType } from '@/spreadsheet-import/types/SpreadsheetColumnType';
import { type SpreadsheetColumns } from '@/spreadsheet-import/types/SpreadsheetColumns';
import { type SpreadsheetImportField } from '@/spreadsheet-import/types/SpreadsheetImportField';
import { useAtomFamilySelectorState } from '@/ui/utilities/state/jotai/hooks/useAtomFamilySelectorState';
import { ScrollWrapper } from '@/ui/utilities/scroll/components/ScrollWrapper';
import { Trans, useLingui } from '@lingui/react/macro';
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
  },
  columnsContainer: {
    alignItems: 'center',
    display: 'flex',
    flexDirection: 'column',
    marginBottom: spacing['--t-spacing-4'],
  },
  columns: {
    color: fontColor['--t-font-color-primary'],
    fontSize: fontSize['--t-font-size-sm'],
    fontWeight: fontWeight['--t-font-weight-medium'],
  },
  column: {
    color: fontColor['--t-font-color-primary'],
    fontSize: fontSize['--t-font-size-sm'],
    fontWeight: fontWeight['--t-font-weight-regular'],
  },
});

export type MatchColumnsStepProps = {
  data: ImportedRow[];
  headerValues: ImportedRow;
  onBack?: () => void;
  setCurrentStepState: (currentStepState: SpreadsheetImportStep) => void;
  setPreviousStepState: (currentStepState: SpreadsheetImportStep) => void;
  currentStepState: SpreadsheetImportStep;
  nextStep: () => void;
  onError: (message: string) => void;
};

export const MatchColumnsStep = ({
  data,
  headerValues,
  onBack,
  setCurrentStepState,
  setPreviousStepState,
  currentStepState,
  nextStep,
  onError,
}: MatchColumnsStepProps) => {
  const { enqueueDialog } = useDialogManager();
  const dataExample = data.slice(0, 2);
  const { spreadsheetImportFields: fields } = useSpreadsheetImportInternal();
  const [isLoading, setIsLoading] = useState(false);
  const [columns, setColumns] = useAtomFamilySelectorState(
    initialComputedColumnsSelector,
    headerValues,
  );

  const { matchColumnsStepHook } = useSpreadsheetImportInternal();

  const { t } = useLingui();

  const onIgnore = useCallback(
    (columnIndex: number) => {
      setColumns(
        columns.map((column, index) =>
          columnIndex === index ? setIgnoreColumn(column) : column,
        ),
      );
    },
    [columns, setColumns],
  );

  const onRevertIgnore = useCallback(
    (columnIndex: number) => {
      setColumns(
        columns.map((column, index) =>
          columnIndex === index ? setColumn(column) : column,
        ),
      );
    },
    [columns, setColumns],
  );

  const onChange = useCallback(
    (value: string, columnIndex: number) => {
      if (value === DO_NOT_IMPORT_OPTION_KEY) {
        if (columns[columnIndex].type === SpreadsheetColumnType.ignored) {
          onRevertIgnore(columnIndex);
        } else {
          onIgnore(columnIndex);
        }
      } else {
        const field = fields.find(
          (field) => field.key === value,
        ) as unknown as SpreadsheetImportField;
        const existingFieldIndex = columns.findIndex(
          (column) => 'value' in column && column.value === field.key,
        );
        setColumns(
          columns.map<SpreadsheetColumn>((column, index) => {
            if (columnIndex === index) {
              return setColumn(column, field, data);
            } else if (index === existingFieldIndex) {
              return setColumn(column);
            } else {
              return column;
            }
          }),
        );
      }
    },
    [columns, onRevertIgnore, onIgnore, fields, setColumns, data],
  );

  const handleContinue = useCallback(
    async (
      values: ImportedStructuredRow[],
      rawData: ImportedRow[],
      columns: SpreadsheetColumns,
    ) => {
      try {
        setIsLoading(true);
        const data = await matchColumnsStepHook(values, rawData, columns);
        setCurrentStepState({
          type: SpreadsheetImportStepType.validateData,
          data,
          importedColumns: columns,
        });
        setPreviousStepState(currentStepState);
        nextStep();
      } catch (e) {
        onError((e as Error).message);
      }
    },
    [
      onError,
      matchColumnsStepHook,
      nextStep,
      setPreviousStepState,
      setCurrentStepState,
      currentStepState,
    ],
  );

  const onSubChange = useCallback(
    (value: string, columnIndex: number, entry: string) => {
      setColumns(
        columns.map((column, index) =>
          columnIndex === index && 'matchedOptions' in column
            ? setSubColumn(column, entry, value)
            : column,
        ),
      );
    },
    [columns, setColumns],
  );
  const unmatchedRequiredFields = useMemo(
    () => findUnmatchedRequiredFields(fields, columns),
    [fields, columns],
  );

  const handleAlertOnContinue = useCallback(async () => {
    setIsLoading(true);
    await handleContinue(
      normalizeTableData(columns, data, fields),
      data,
      columns,
    );
    setIsLoading(false);
  }, [handleContinue, columns, data, fields]);

  const handleOnContinue = useCallback(async () => {
    if (unmatchedRequiredFields.length > 0) {
      enqueueDialog({
        title: t`Not all columns matched`,
        message: t`There are required columns that are not matched or ignored. Do you want to continue?`,
        children: (
          <div {...stylex.props(styles.columnsContainer)}>
            <span {...stylex.props(styles.columns)}>
              <Trans>Columns not matched:</Trans>
            </span>
            {unmatchedRequiredFields.map((field) => (
              <span key={field} {...stylex.props(styles.column)}>{field}</span>
            ))}
          </div>
        ),
        buttons: [
          { title: t`Cancel` },
          {
            title: t`Continue`,
            onClick: handleAlertOnContinue,
            variant: 'outline',
            role: 'confirm',
          },
        ],
      });
    } else {
      setIsLoading(true);
      await handleContinue(
        normalizeTableData(columns, data, fields),
        data,
        columns,
      );
      setIsLoading(false);
    }
  }, [
    unmatchedRequiredFields,
    enqueueDialog,
    handleAlertOnContinue,
    handleContinue,
    columns,
    data,
    fields,
    t,
  ]);

  const hasMatchedColumns = columns.some(
    (column) =>
      ![SpreadsheetColumnType.ignored, SpreadsheetColumnType.empty].includes(
        column.type,
      ),
  );

  const onBackConfirmation = () => {
    onBack?.();
    setColumns([]);
  };

  const openRestartDialog = () => {
    enqueueDialog({
      title: t`Restart Import`,
      message: t`You will lose all your mappings.`,
      buttons: [
        { title: t`Cancel` },
        {
          title: t`Restart`,
          onClick: onBackConfirmation,
          color: 'danger',
          variant: 'solid',
          role: 'confirm',
        },
      ],
    });
  };

  return (
    <>
      <Dialog.Body
        {...stylex.props(styles.dialogBody)}
      >
        <ScrollWrapper componentInstanceId="scroll-wrapper-modal-content">
          <ColumnGrid
            columns={columns}
            renderUserColumn={(columns, columnIndex) => (
              <UserTableColumn
                column={columns[columnIndex]}
                importedRow={dataExample.map(
                  (row) => row[columns[columnIndex].index],
                )}
              />
            )}
            renderTemplateColumn={(columns, columnIndex) => (
              <TemplateColumn
                columns={columns}
                columnIndex={columnIndex}
                onChange={onChange}
              />
            )}
            renderUnmatchedColumn={(columns, columnIndex) => (
              <UnmatchColumn
                columns={columns}
                columnIndex={columnIndex}
                onSubChange={onSubChange}
              />
            )}
          />
        </ScrollWrapper>
      </Dialog.Body>
      <StepNavigationButton
        onContinue={handleOnContinue}
        isLoading={isLoading}
        continueTitle={t`Next Step`}
        backTitle={t`Restart Import`}
        onBack={openRestartDialog}
        isContinueDisabled={!hasMatchedColumns}
      />
    </>
  );
};
