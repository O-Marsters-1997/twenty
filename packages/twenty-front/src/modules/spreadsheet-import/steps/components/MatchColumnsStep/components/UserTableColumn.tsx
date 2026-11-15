
import { type ImportedRow } from '@/spreadsheet-import/types';

import { type SpreadsheetColumn } from '@/spreadsheet-import/types/SpreadsheetColumn';
import { isDefined } from 'twenty-shared/utils';
import * as stylex from '@stylexjs/stylex';
import { fontColor, fontSize, fontWeight } from 'twenty-ui/theme/tokens.stylex';

const styles = stylex.create({
  container: {
    display: 'flex',
    flexDirection: 'column',
    width: '100%',
  },
  value: {
    color: fontColor['--t-font-color-primary'],
    fontSize: fontSize['--t-font-size-md'],
    fontWeight: fontWeight['--t-font-weight-medium'],
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  example: {
    color: fontColor['--t-font-color-tertiary'],
    fontSize: fontSize['--t-font-size-sm'],
    fontWeight: fontWeight['--t-font-weight-medium'],
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
});

type UserTableColumnProps = {
  column: SpreadsheetColumn;
  importedRow: ImportedRow;
};

export const UserTableColumn = ({
  column,
  importedRow,
}: UserTableColumnProps) => {
  const { header } = column;
  const firstDefinedValue = importedRow.find(isDefined);

  return (
    <div {...stylex.props(styles.container)}>
      <span {...stylex.props(styles.value)}>{header}</span>
      {firstDefinedValue && (
        <span {...stylex.props(styles.example)}>{`ex: ${firstDefinedValue}`}</span>
      )}
    </div>
  );
};
