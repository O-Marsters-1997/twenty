import * as stylex from '@stylexjs/stylex';

export const recordTableLayout = stylex.defineConsts({
  rowHeight: 32,
  checkboxColumnWidth: 28,
  dragAndDropColumnWidth: 12,
  addColumnButtonWidth: 32,
});

export const recordTableZIndex = stylex.defineConsts({
  base: 1,
  hoverPortal: 4,
  headerRow: 10,
  cellDefault: 3,
  cellSticky: 8,
  cellEditMode: 30,
  headerColumnsSticky: 14,
  headerColumnsNormal: 10,
  groupSectionStickyCell: 9,
  groupSectionNormalCell: 8,
  columnGrip: 30,
  rowDropLine: 9,
  footerDefault: 8,
  footerStickyColumn: 9,
});

export const recordTableCssVariable = stylex.defineConsts({
  dragDropWidth: '--record-table-drag-drop-width',
  checkboxWidth: '--record-table-checkbox-width',
  firstColumnLeft: '--record-table-first-column-left',
});

export const recordTableGripMarker = stylex.defineMarker();
