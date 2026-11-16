import * as stylex from '@stylexjs/stylex';
import { type Key } from 'react';
import { type SpreadsheetImportTableProps } from '@/spreadsheet-import/types/SpreadsheetImportTableProps';
import { DataGrid } from 'react-data-grid';
import 'react-data-grid/lib/styles.css';
import '~/third-party-styles/react-data-grid.css';
import { useSpreadsheetImportInternal } from '@/spreadsheet-import/hooks/useSpreadsheetImportInternal';
import { useThemeColorScheme } from 'twenty-ui/theme';

export const SpreadsheetImportTable = <TData, TRowKey extends Key = Key>({
  className,
  columns,
  headerRowHeight,
  rows,
  rowKeyGetter,
  renderers,
  onRowsChange,
  onCellClick,
  onSelectedCellChange,
  selectedRows,
  onSelectedRowsChange,
}: SpreadsheetImportTableProps<TData, TRowKey>) => {
  const colorScheme = useThemeColorScheme();
  const { rtl } = useSpreadsheetImportInternal();
  const themeClassName = colorScheme === 'dark' ? 'rdg-dark' : 'rdg-light';

  if (!rows.length || !columns.length) return null;

  return (
    <div
      data-spreadsheet-import-table=""
      data-header-hidden={headerRowHeight === 0 ? '' : undefined}
      {...stylex.props(styles.container)}
    >
      <DataGrid
        direction={rtl ? 'rtl' : 'ltr'}
        rowHeight={40}
        className={`${className || ''} ${themeClassName}`}
        headerRowHeight={headerRowHeight}
        columns={columns}
        rows={rows}
        rowKeyGetter={rowKeyGetter}
        renderers={renderers}
        onRowsChange={onRowsChange}
        onCellClick={onCellClick}
        onSelectedCellChange={onSelectedCellChange}
        selectedRows={selectedRows}
        onSelectedRowsChange={onSelectedRowsChange}
      />
    </div>
  );
};

const styles = stylex.create({
  container: {
    flexBasis: '0%',
    flexGrow: 1,
    flexShrink: 1,
    minHeight: 0,
  },
});
