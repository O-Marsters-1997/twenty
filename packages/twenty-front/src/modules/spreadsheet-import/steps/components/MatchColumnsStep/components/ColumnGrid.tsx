import { type SpreadsheetColumns } from '@/spreadsheet-import/types/SpreadsheetColumns';
import { t } from '@lingui/core/macro';
import React from 'react';
import * as stylex from '@stylexjs/stylex';
import {
  background,
  borderColor,
  fontColor,
  fontSize,
  fontWeight,
  spacing,
} from 'twenty-ui/theme/tokens.stylex';

type ColumnGridProps = {
  columns: SpreadsheetColumns;
  renderUserColumn: (
    columns: SpreadsheetColumns,
    columnIndex: number,
  ) => React.ReactNode;
  renderTemplateColumn: (
    columns: SpreadsheetColumns,
    columnIndex: number,
  ) => React.ReactNode;
  renderUnmatchedColumn: (
    columns: SpreadsheetColumns,
    columnIndex: number,
  ) => React.ReactNode;
};

export const ColumnGrid = ({
  columns,
  renderUserColumn,
  renderTemplateColumn,
  renderUnmatchedColumn,
}: ColumnGridProps) => {
  return (
    <>
      <div {...stylex.props(styles.gridContainer)}>
        <div {...stylex.props(styles.grid)}>
          <div {...stylex.props(styles.row, styles.rowHeader)}>
            <div {...stylex.props(styles.gridHeader)}>{t`Imported data`}</div>
            <div {...stylex.props(styles.gridHeader)}>{t`Twenty fields`}</div>
          </div>
          {columns.map((column, index) => {
            const userColumn = renderUserColumn(columns, index);
            const templateColumn = renderTemplateColumn(columns, index);
            const unmatchedColumn = renderUnmatchedColumn(columns, index);
            const isSelect = 'matchedOptions' in columns[index];
            const isLast = index === columns.length - 1;

            if (React.isValidElement(userColumn)) {
              return (
                <div key={index}>
                  <div
                    {...stylex.props(
                      styles.row,
                      styles.rowDefaultHeight,
                      !isSelect && !isLast && styles.rowWithBorder,
                    )}
                  >
                    <div {...stylex.props(styles.cell, styles.cellLeft)}>
                      {userColumn}
                    </div>
                    <div {...stylex.props(styles.cell, styles.cellRight)}>
                      {templateColumn}
                    </div>
                  </div>
                  {isSelect && (
                    <div
                      {...stylex.props(
                        styles.row,
                        styles.rowDefaultHeight,
                        !isLast && styles.rowWithBorder,
                      )}
                    >
                      <div {...stylex.props(styles.cell, styles.cellFullLine)}>
                        {unmatchedColumn}
                      </div>
                    </div>
                  )}
                </div>
              );
            }

            return null;
          })}
        </div>
      </div>
    </>
  );
};

const styles = stylex.create({
  gridContainer: {
    alignItems: 'center',
    display: 'flex',
    flexDirection: 'column',
    flexGrow: 1,
    height: '0px',
    width: '100%',
  },
  grid: {
    boxSizing: 'border-box',
    display: 'flex',
    flexDirection: 'column',
    width: '100%',
  },
  gridHeader: {
    paddingInline: spacing['--t-spacing-4'],
    alignItems: 'center',
    backgroundColor: background['--t-background-secondary'],
    boxSizing: 'border-box',
    color: fontColor['--t-font-color-light'],
    display: 'flex',
    flexBasis: '0%',
    flexGrow: 1,
    flexShrink: 1,
    fontSize: fontSize['--t-font-size-xs'],
    fontWeight: fontWeight['--t-font-weight-semi-bold'],
    borderBottomColor: borderColor['--t-border-color-medium'],
    borderBottomStyle: 'solid',
    borderBottomWidth: '1px',
  },
  row: {
    boxSizing: 'border-box',
    display: 'flex',
    flexDirection: 'row',
  },
  rowHeader: {
    minHeight: '32px',
  },
  rowDefaultHeight: {
    minHeight: '64px',
  },
  rowWithBorder: {
    borderBottomColor: borderColor['--t-border-color-medium'],
    borderBottomStyle: 'solid',
    borderBottomWidth: '1px',
  },
  cell: {
    alignItems: 'center',
    boxSizing: 'border-box',
    display: 'flex',
    flexBasis: '0%',
    flexGrow: 1,
    flexShrink: 1,
    overflowX: 'auto',
    paddingBottom: spacing['--t-spacing-4'],
  },
  cellLeft: {
    paddingLeft: spacing['--t-spacing-4'],
    paddingRight: spacing['--t-spacing-2'],
    paddingTop: spacing['--t-spacing-4'],
    width: 'auto',
  },
  cellRight: {
    paddingLeft: spacing['--t-spacing-2'],
    paddingRight: spacing['--t-spacing-4'],
    paddingTop: spacing['--t-spacing-4'],
    width: 'auto',
  },
  cellFullLine: {
    paddingLeft: spacing['--t-spacing-2'],
    paddingRight: spacing['--t-spacing-4'],
    paddingTop: spacing['--t-spacing-0'],
    width: '100%',
  },
});
