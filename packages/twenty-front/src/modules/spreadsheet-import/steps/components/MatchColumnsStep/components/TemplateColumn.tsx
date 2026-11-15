
import { MatchColumnToFieldSelect } from '@/spreadsheet-import/components/MatchColumnToFieldSelect';
import { DO_NOT_IMPORT_OPTION_KEY } from '@/spreadsheet-import/constants/DoNotImportOptionKey';
import { useSpreadsheetImportInternal } from '@/spreadsheet-import/hooks/useSpreadsheetImportInternal';
import { suggestedFieldsByColumnHeaderState } from '@/spreadsheet-import/steps/components/MatchColumnsStep/components/states/suggestedFieldsByColumnHeaderState';
import { SpreadsheetColumnType } from '@/spreadsheet-import/types/SpreadsheetColumnType';
import { type SpreadsheetColumns } from '@/spreadsheet-import/types/SpreadsheetColumns';
import { spreadsheetImportBuildFieldOptions } from '@/spreadsheet-import/utils/spreadsheetImportBuildFieldOptions';
import { useAtomStateValue } from '@/ui/utilities/state/jotai/hooks/useAtomStateValue';
import { useLingui } from '@lingui/react/macro';
import { IconForbid } from 'twenty-ui/icon';
import * as stylex from '@stylexjs/stylex';
import { fontColor, fontSize, fontWeight, spacing } from 'twenty-ui/theme/tokens.stylex';

type TemplateColumnProps = {
  columns: SpreadsheetColumns;
  columnIndex: number;
  onChange: (val: string, index: number) => void;
};

export const TemplateColumn = ({
  columns,
  columnIndex,
  onChange,
}: TemplateColumnProps) => {
  const { spreadsheetImportFields: fields } = useSpreadsheetImportInternal();
  const suggestedFieldsByColumnHeader = useAtomStateValue(
    suggestedFieldsByColumnHeaderState,
  );

  const column = columns[columnIndex];
  const isIgnored = column.type === SpreadsheetColumnType.ignored;

  const { t } = useLingui();

  const fieldOptions = spreadsheetImportBuildFieldOptions(fields, columns);
  const suggestedFieldOptions = spreadsheetImportBuildFieldOptions(
    suggestedFieldsByColumnHeader[column.header] ?? [],
    columns,
  );

  const selectOptions = [
    {
      Icon: IconForbid,
      value: DO_NOT_IMPORT_OPTION_KEY,
      label: t`Do not import`,
    },
    ...fieldOptions,
  ];

  const selectValue = fieldOptions.find(
    ({ value }) => 'value' in column && column.value === value,
  );

  const ignoreValue = selectOptions.find(
    ({ value }) => value === DO_NOT_IMPORT_OPTION_KEY,
  );

  return (
    <div {...stylex.props(styles.container)}>
      <MatchColumnToFieldSelect
        placeholder={t`Select column...`}
        value={isIgnored ? ignoreValue : selectValue}
        onChange={(value) => onChange(value.value, column.index)}
        options={selectOptions}
        suggestedOptions={suggestedFieldOptions}
        columnIndex={column.index.toString()}
      />
      {column.type === SpreadsheetColumnType.matchedError && (
        <span {...stylex.props(styles.errorMessage)}>{`"${column.header}" ${column.errorMessage}`}</span>
      )}
    </div>
  );
};

const styles = stylex.create({
  container: {
    display: 'flex',
    flexDirection: 'column',
    minHeight: '10px',
    width: '100%',
  },
  errorMessage: {
    color: fontColor['--t-font-color-danger'],
    fontSize: fontSize['--t-font-size-sm'],
    fontWeight: fontWeight['--t-font-weight-regular'],
    marginTop: spacing['--t-spacing-1'],
  },
});
