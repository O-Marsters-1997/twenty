import { recordTableZIndex } from './recordTableLayout.stylex';

export const TABLE_Z_INDEX = {
  base: recordTableZIndex.base,
  hoverPortal: recordTableZIndex.hoverPortal,
  headerRow: recordTableZIndex.headerRow,
  cell: {
    default: recordTableZIndex.cellDefault,
    sticky: recordTableZIndex.cellSticky,
    editMode: recordTableZIndex.cellEditMode,
  },
  headerColumns: {
    headerColumnsSticky: recordTableZIndex.headerColumnsSticky,
    headerColumnsNormal: recordTableZIndex.headerColumnsNormal,
  },
  groupSection: {
    stickyCell: recordTableZIndex.groupSectionStickyCell,
    normalCell: recordTableZIndex.groupSectionNormalCell,
  },
  columnGrip: recordTableZIndex.columnGrip,
  rowDropLine: recordTableZIndex.rowDropLine,
  footer: {
    default: recordTableZIndex.footerDefault,
    stickyColumn: recordTableZIndex.footerStickyColumn,
  },
};
