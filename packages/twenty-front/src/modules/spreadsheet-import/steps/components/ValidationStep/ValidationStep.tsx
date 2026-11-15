import { Dialog } from 'twenty-ui/primitives/surfaces';
import { SpreadsheetImportTable } from '@/spreadsheet-import/components/SpreadsheetImportTable';
import { StepNavigationButton } from '@/spreadsheet-import/components/StepNavigationButton';
import { useHideStepBar } from '@/spreadsheet-import/hooks/useHideStepBar';
import { useSpreadsheetImportInternal } from '@/spreadsheet-import/hooks/useSpreadsheetImportInternal';
import { type SpreadsheetImportStep } from '@/spreadsheet-import/steps/types/SpreadsheetImportStep';
import { SpreadsheetImportStepType } from '@/spreadsheet-import/steps/types/SpreadsheetImportStepType';
import {
  type ImportedStructuredRow,
  type SpreadsheetImportImportValidationResult,
} from '@/spreadsheet-import/types';
import { type SpreadsheetColumns } from '@/spreadsheet-import/types/SpreadsheetColumns';
import { SpreadsheetColumnType } from '@/spreadsheet-import/types/SpreadsheetColumnType';
import { addErrorsAndRunHooks } from '@/spreadsheet-import/utils/dataMutations';
import { useDialogManager } from '@/ui/feedback/dialog-manager/hooks/useDialogManager';
import { Trans, useLingui } from '@lingui/react/macro';
import {
  type Dispatch,
  type SetStateAction,
  useCallback,
  useMemo,
  useState,
} from 'react';
import { type RowsChangeData } from 'react-data-grid';
import { isDefined } from 'twenty-shared/utils';
import { IconTrash } from 'twenty-ui/icon';
import { Button, Switch } from 'twenty-ui/primitives/input';
import { generateColumns } from './components/columns';
import { type ImportedStructuredRowMetadata } from './types';
import * as stylex from '@stylexjs/stylex';
import { background, borderColor, borderRadius, boxShadow, fontColor, fontSize, fontWeight, spacing } from 'twenty-ui/theme/tokens.stylex';

type ValidationStepProps = {
  initialData: ImportedStructuredRow[];
  importedColumns: SpreadsheetColumns;
  file: File;
  onBack: () => void;
  setCurrentStepState: Dispatch<SetStateAction<SpreadsheetImportStep>>;
};

export const ValidationStep = ({
  initialData,
  importedColumns,
  file,
  setCurrentStepState,
  onBack,
}: ValidationStepProps) => {
  const hideStepBar = useHideStepBar();
  const { enqueueDialog } = useDialogManager();
  const {
    spreadsheetImportFields: fields,
    onClose,
    onSubmit,
    rowHook,
    tableHook,
  } = useSpreadsheetImportInternal();

  const [data, setData] = useState<
    (ImportedStructuredRow & ImportedStructuredRowMetadata)[]
  >(
    useMemo(
      () => addErrorsAndRunHooks(initialData, fields, rowHook, tableHook),
      // oxlint-disable-next-line react-hooks/exhaustive-deps
      [],
    ),
  );
  const [selectedRows, setSelectedRows] = useState<
    ReadonlySet<number | string>
  >(new Set());
  const [filterByErrors, setFilterByErrors] = useState(false);

  const updateData = useCallback(
    (rows: typeof data) => {
      setData(addErrorsAndRunHooks(rows, fields, rowHook, tableHook));
    },
    [setData, rowHook, tableHook, fields],
  );

  const deleteSelectedRows = () => {
    if (selectedRows.size > 0) {
      const newData = data.filter((value) => !selectedRows.has(value.__index));
      updateData(newData);
      setSelectedRows(new Set());
    }
  };

  const { t } = useLingui();

  const updateRow = useCallback(
    (
      rows: typeof data,
      changedData?: RowsChangeData<(typeof data)[number]>,
    ) => {
      const changes = changedData?.indexes.reduce(
        // Todo: remove usage of react-data-grid
        (acc: any, index: any) => {
          // when data is filtered val !== actual index in data
          const realIndex = data.findIndex(
            (value) => value.__index === rows[index].__index,
          );
          acc[realIndex] = rows[index];
          return acc;
        },
        {} as Record<number, (typeof data)[number]>,
      );
      const newData = Object.assign([], data, changes);
      updateData(newData);
    },
    [data, updateData],
  );

  const columns = useMemo(
    () =>
      generateColumns(fields)
        .map((column) => {
          const hasBeenImported =
            importedColumns.filter(
              (importColumn) =>
                (importColumn.type === SpreadsheetColumnType.matched &&
                  importColumn.value === column.key) ||
                (importColumn.type === SpreadsheetColumnType.matchedSelect &&
                  importColumn.value === column.key) ||
                (importColumn.type ===
                  SpreadsheetColumnType.matchedSelectOptions &&
                  importColumn.value === column.key) ||
                (importColumn.type === SpreadsheetColumnType.matchedCheckbox &&
                  importColumn.value === column.key) ||
                column.key === 'select-row',
            ).length > 0;

          if (!hasBeenImported) return null;
          return column;
        })
        .filter(isDefined),
    [fields, importedColumns],
  );

  const tableData = useMemo(() => {
    if (filterByErrors) {
      return data.filter((value) => {
        if (isDefined(value?.__errors)) {
          return (
            (Object.values(value.__errors)?.filter(
              (err) => err.level === 'error',
            ).length ?? 0) > 0
          );
        }
        return false;
      });
    }
    return data;
  }, [data, filterByErrors]);

  const rowKeyGetter = useCallback(
    (row: ImportedStructuredRow & ImportedStructuredRowMetadata) => row.__index,
    [],
  );

  const submitData = async () => {
    const calculatedData = data.reduce(
      (acc, value) => {
        const { __index, __errors, ...values } = value;
        if (isDefined(__errors)) {
          for (const key in __errors) {
            if (__errors[key].level === 'error') {
              acc.invalidStructuredRows.push(
                values as unknown as ImportedStructuredRow,
              );
              return acc;
            }
          }
        }
        acc.validStructuredRows.push(
          values as unknown as ImportedStructuredRow,
        );
        return acc;
      },
      {
        validStructuredRows: [] as ImportedStructuredRow[],
        invalidStructuredRows: [] as ImportedStructuredRow[],
        allStructuredRows: data,
      } satisfies SpreadsheetImportImportValidationResult,
    );

    setCurrentStepState({
      type: SpreadsheetImportStepType.importData,
      recordsToImportCount: calculatedData.validStructuredRows.length,
    });
    hideStepBar();

    await onSubmit(calculatedData, file);
    onClose();
  };
  const onContinue = () => {
    const invalidData = data.find((value) => {
      if (isDefined(value?.__errors)) {
        return !!Object.values(value.__errors)?.filter(
          (err) => err.level === 'error',
        ).length;
      }
      return false;
    });
    if (!invalidData) {
      submitData();
    } else {
      enqueueDialog({
        title: t`Finish flow with errors`,
        message: t`There are still some rows that contain errors. Rows with errors will be ignored when submitting.`,
        buttons: [
          { title: t`Cancel` },
          {
            title: t`Submit`,
            variant: 'outline',
            onClick: submitData,
            role: 'confirm',
          },
        ],
      });
    }
  };

  return (
    <>
      <Dialog.Body
        {...stylex.props(styles.dialogBody)}
      >
        <div {...stylex.props(styles.contentWrapper)}>
          {filterByErrors && tableData.length === 0 ? (
            <div {...stylex.props(styles.noRowsWithErrorsContainer)}>
              <Trans>No rows with errors</Trans>
            </div>
          ) : (
            <div {...stylex.props(styles.scrollContainer)}>
              <SpreadsheetImportTable
                headerRowHeight={32}
                rowKeyGetter={rowKeyGetter}
                rows={tableData}
                onRowsChange={updateRow}
                columns={columns}
                selectedRows={selectedRows}
                onSelectedRowsChange={setSelectedRows as any} // TODO: replace 'any'
                renderers={{
                  noRowsFallback: (
                    <div {...stylex.props(styles.noRowsContainer)}>
                      {filterByErrors
                        ? t`No data containing errors`
                        : t`No data found`}
                    </div>
                  ),
                }}
              />
            </div>
          )}
          <div {...stylex.props(styles.toolbar)}>
            <div {...stylex.props(styles.errorSwitch)}>
              <Switch
                aria-label={t`Show only rows with errors`}
                checked={filterByErrors}
                onCheckedChange={() => setFilterByErrors(!filterByErrors)}
                size="sm"
              />
              <span {...stylex.props(styles.errorSwitchDescription)}>
                <Trans>Show only rows with errors</Trans>
              </span>
            </div>
            <Button
                xstyle={styles.removeButton}
                startIcon={<IconTrash />}
                onClick={deleteSelectedRows}
                disabled={selectedRows.size === 0}
              >{t`Remove`}</Button>
          </div>
        </div>
      </Dialog.Body>
      <StepNavigationButton
        onContinue={onContinue}
        onBack={onBack}
        continueTitle={t`Confirm`}
      />
    </>
  );
};

const styles = stylex.create({
  removeButton: {
    height: '24px',
  },
  dialogBody: {
    display: 'flex',
    flexBasis: '0%',
    flexGrow: 1,
    flexShrink: 1,
    flexDirection: 'column',
    paddingBlock: 0,
    paddingInline: 0,
  },
  contentWrapper: {
    display: 'flex',
    flex: '1 1 0%',
    flexDirection: 'column',
    position: 'relative',
  },
  toolbar: {
    alignItems: 'center',
    backgroundColor: background['--t-background-secondary'],
    borderWidth: '1px',
    borderStyle: 'solid',
    borderColor: borderColor['--t-border-color-medium'],
    borderRadius: borderRadius['--t-border-radius-md'],
    bottom: spacing['--t-spacing-3'],
    boxShadow: boxShadow['--t-box-shadow-strong'],
    display: 'flex',
    flexDirection: 'row',
    justifyContent: 'space-between',
    left: '50%',
    padding: spacing['--t-spacing-3'],
    position: 'absolute',
    transform: 'translateX(-50%)',
    width: '400px',
    zIndex: 1,
  },
  errorSwitch: {
    alignItems: 'center',
    display: 'flex',
    flexDirection: 'row',
  },
  errorSwitchDescription: {
    color: fontColor['--t-font-color-secondary'],
    fontSize: fontSize['--t-font-size-md'],
    fontWeight: fontWeight['--t-font-weight-regular'],
    marginLeft: spacing['--t-spacing-2'],
  },
  scrollContainer: {
    display: 'flex',
    flexDirection: 'column',
    flexGrow: 1,
    height: '0px',
    overflow: 'auto',
    width: '100%',
  },
  noRowsContainer: {
    display: 'flex',
    gridColumn: '1/-1',
    justifyContent: 'center',
    marginTop: spacing['--t-spacing-8'],
  },
  noRowsWithErrorsContainer: {
    color: fontColor['--t-font-color-tertiary'],
    display: 'flex',
    justifyContent: 'center',
    marginTop: 'auto',
    marginRight: '0',
    marginBottom: 'auto',
    marginLeft: '0',
  },
});
