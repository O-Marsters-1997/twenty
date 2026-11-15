import { FieldDisplay } from '@/object-record/record-field/ui/components/FieldDisplay';
import { recordTableLayout } from '../../constants/recordTableLayout.stylex';
import { useRecordTableBodyContextOrThrow } from '@/object-record/record-table/contexts/RecordTableBodyContext';
import { useRecordTableRowContextOrThrow } from '@/object-record/record-table/contexts/RecordTableRowContext';
import { RecordTableCellDisplayMode } from '@/object-record/record-table/record-table-cell/components/RecordTableCellDisplayMode';

import { isRecordTableRowActiveComponentFamilyState } from '@/object-record/record-table/states/isRecordTableRowActiveComponentFamilyState';
import { recordTableFocusPositionComponentState } from '@/object-record/record-table/states/recordTableFocusPositionComponentState';
import { recordTableHoverPositionComponentState } from '@/object-record/record-table/states/recordTableHoverPositionComponentState';
import { useAtomComponentFamilyStateValue } from '@/ui/utilities/state/jotai/hooks/useAtomComponentFamilyStateValue';
import { useAtomComponentStateValue } from '@/ui/utilities/state/jotai/hooks/useAtomComponentStateValue';
import * as stylex from '@stylexjs/stylex';
import { isDefined } from 'twenty-shared/utils';
import {
  accent,
  background,
  borderRadius,
  color,
} from 'twenty-ui/theme/tokens.stylex';

export const RecordTableCellFocusedPortalContent = () => {
  const { rowIndex } = useRecordTableRowContextOrThrow();
  const { onMoveHoverToCurrentCell } = useRecordTableBodyContextOrThrow();

  const recordTableFocusPosition = useAtomComponentStateValue(
    recordTableFocusPositionComponentState,
  );

  const isRecordTableRowActive = useAtomComponentFamilyStateValue(
    isRecordTableRowActiveComponentFamilyState,
    rowIndex,
  );

  const recordTableHoverPosition = useAtomComponentStateValue(
    recordTableHoverPositionComponentState,
  );

  const arePositionsDifferent =
    recordTableHoverPosition?.row !== recordTableFocusPosition?.row ||
    recordTableHoverPosition?.column !== recordTableFocusPosition?.column;

  const handleContainerMouseMove = () => {
    if (arePositionsDifferent && isDefined(recordTableFocusPosition)) {
      onMoveHoverToCurrentCell(recordTableFocusPosition);
    }
  };

  return (
    <div
      {...stylex.props(
        styles.container,
        isRecordTableRowActive && styles.containerActive,
      )}
      onMouseMove={handleContainerMouseMove}
    >
      <RecordTableCellDisplayMode>
        <FieldDisplay />
      </RecordTableCellDisplayMode>
    </div>
  );
};

const styles = stylex.create({
  container: {
    alignItems: 'center',
    backgroundColor: background['--t-background-primary'],
    borderTopLeftRadius: borderRadius['--t-border-radius-sm'],
    borderTopRightRadius: borderRadius['--t-border-radius-sm'],
    borderBottomRightRadius: borderRadius['--t-border-radius-sm'],
    borderBottomLeftRadius: borderRadius['--t-border-radius-sm'],
    boxSizing: 'border-box',
    display: 'flex',
    height: recordTableLayout.rowHeight,
    outlineColor: color['--t-color-blue8'],
    outlineOffset: -1,
    outlineStyle: 'solid',
    outlineWidth: 1,
    userSelect: 'none',
  },
  containerActive: {
    backgroundColor: accent['--t-accent-quaternary'],
  },
});
