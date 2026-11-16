import * as stylex from '@stylexjs/stylex';
import { useContext, type ReactNode } from 'react';

import { FieldContext } from '@/object-record/record-field/ui/contexts/FieldContext';
import { isFieldIdentifierDisplay } from '@/object-record/record-field/ui/meta-types/display/utils/isFieldIdentifierDisplay';
import { RECORD_CHIP_CLICK_OUTSIDE_ID } from '@/object-record/record-table/constants/RecordChipClickOutsideId';
import { RECORD_TABLE_CELL_CONTENT_CLASS_NAME } from '@/object-record/record-table/constants/RecordTableCellContentClassName';
import { RecordTableCellContext } from '@/object-record/record-table/contexts/RecordTableCellContext';
import { useRecordTableContextOrThrow } from '@/object-record/record-table/contexts/RecordTableContext';
import { useOpenRecordTableCellFromCell } from '@/object-record/record-table/record-table-cell/hooks/useOpenRecordTableCellFromCell';
import { getRecordTableCellId } from '@/object-record/record-table/utils/getRecordTableCellId';
import { mergeClassName } from '@/page-layout/utils/mergeClassName';
import { media } from 'twenty-ui/theme/constants.stylex';
import {
  background,
  borderColor,
  fontColor,
} from 'twenty-ui/theme/tokens.stylex';
import { recordTableLayout } from '../../constants/recordTableLayout.stylex';

import './RecordTableCellBaseContainer.css';

export const RecordTableCellBaseContainer = ({
  children,
}: {
  children: ReactNode;
}) => {
  const {
    isRecordFieldReadOnly: isReadOnly,
    fieldDefinition,
    isLabelIdentifier,
  } = useContext(FieldContext);
  const { openTableCell } = useOpenRecordTableCellFromCell();

  const { cellPosition } = useContext(RecordTableCellContext);
  const { recordTableId } = useRecordTableContextOrThrow();

  const isChipDisplay = isFieldIdentifierDisplay(
    fieldDefinition,
    isLabelIdentifier,
  );

  const handleContainerClick = () => {
    openTableCell();
  };

  const baseContainerProps = stylex.props(
    styles.container,
    isReadOnly ? styles.readOnly : styles.interactive,
  );

  return (
    <div
      {...mergeClassName(
        baseContainerProps,
        RECORD_TABLE_CELL_CONTENT_CLASS_NAME,
      )}
      onClick={handleContainerClick}
      data-read-only={isReadOnly === true}
      id={getRecordTableCellId(
        recordTableId,
        cellPosition.column,
        cellPosition.row,
      )}
      data-record-table-col={cellPosition.column}
      data-record-table-row={cellPosition.row}
      data-click-outside-id={
        isChipDisplay ? RECORD_CHIP_CLICK_OUTSIDE_ID : undefined
      }
    >
      {children}
    </div>
  );
};

const styles = stylex.create({
  container: {
    alignItems: 'center',
    boxSizing: 'border-box',
    display: 'flex',
    height: recordTableLayout.rowHeight,
    position: 'relative',
    userSelect: 'none',
  },
  interactive: {
    cursor: 'pointer',
  },
  readOnly: {
    backgroundColor: {
      default: null,
      ':hover': {
        default: null,
        [media.hoverCapable]: background['--t-background-secondary'],
      },
    },
    borderRadius: {
      default: null,
      ':hover': { default: null, [media.hoverCapable]: 0 },
    },
    color: {
      default: null,
      ':hover': {
        default: null,
        [media.hoverCapable]: fontColor['--t-font-color-secondary'],
      },
    },
    cursor: 'default',
    outlineColor: {
      default: null,
      ':hover': {
        default: null,
        [media.hoverCapable]: borderColor['--t-border-color-medium'],
      },
    },
    outlineStyle: {
      default: null,
      ':hover': { default: null, [media.hoverCapable]: 'solid' },
    },
    outlineWidth: {
      default: null,
      ':hover': { default: null, [media.hoverCapable]: 1 },
    },
  },
});
