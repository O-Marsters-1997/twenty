import { FieldDisplay } from '@/object-record/record-field/ui/components/FieldDisplay';
import { FieldContext } from '@/object-record/record-field/ui/contexts/FieldContext';
import { FieldFocusStaticFocusedProvider } from '@/object-record/record-field/ui/contexts/FieldFocusContextProvider';
import { useIsFieldInputOnly } from '@/object-record/record-field/ui/hooks/useIsFieldInputOnly';
import { recordTableLayout } from '../../constants/recordTableLayout.stylex';
import { useRecordTableRowContextOrThrow } from '@/object-record/record-table/contexts/RecordTableRowContext';
import { RecordTableCellDisplayMode } from '@/object-record/record-table/record-table-cell/components/RecordTableCellDisplayMode';
import { RecordTableCellEditButton } from '@/object-record/record-table/record-table-cell/components/RecordTableCellEditButton';
import { RecordTableCellEditMode } from '@/object-record/record-table/record-table-cell/components/RecordTableCellEditMode';
import { RecordTableCellFieldInput } from '@/object-record/record-table/record-table-cell/components/RecordTableCellFieldInput';

import { isRecordTableRowActiveComponentFamilyState } from '@/object-record/record-table/states/isRecordTableRowActiveComponentFamilyState';
import { recordTableHoverPositionComponentState } from '@/object-record/record-table/states/recordTableHoverPositionComponentState';
import { useAtomComponentFamilyStateValue } from '@/ui/utilities/state/jotai/hooks/useAtomComponentFamilyStateValue';
import { useAtomComponentStateValue } from '@/ui/utilities/state/jotai/hooks/useAtomComponentStateValue';
import * as stylex from '@stylexjs/stylex';
import { useContext } from 'react';
import {
  accent,
  background,
  borderColor,
  borderRadius,
  fontColor,
} from 'twenty-ui/theme/tokens.stylex';
import { useIsMobile } from 'twenty-ui/utilities';

export const RecordTableCellHoveredPortalContent = () => {
  const recordTableHoverPosition = useAtomComponentStateValue(
    recordTableHoverPositionComponentState,
  );

  const isMobile = useIsMobile();

  const isFirstColumn = recordTableHoverPosition?.column === 0;

  const { isRecordFieldReadOnly: isReadOnly } = useContext(FieldContext);

  const isFieldInputOnly = useIsFieldInputOnly() && !isReadOnly;

  const showButton =
    !isFieldInputOnly &&
    (!isReadOnly || isFirstColumn) &&
    !(isMobile && isFirstColumn);

  const showInteractiveStyle = !isReadOnly || (isFirstColumn && showButton);

  const { rowIndex } = useRecordTableRowContextOrThrow();

  const isRecordTableRowActive = useAtomComponentFamilyStateValue(
    isRecordTableRowActiveComponentFamilyState,
    rowIndex,
  );

  return (
    <div
      {...stylex.props(
        styles.container,
        showInteractiveStyle ? styles.interactive : styles.nonInteractive,
        isRecordTableRowActive
          ? styles.rowActive
          : showInteractiveStyle
            ? styles.outlineInteractive
            : styles.outlineNonInteractive,
      )}
    >
      <FieldFocusStaticFocusedProvider>
        {isFieldInputOnly ? (
          <RecordTableCellEditMode>
            <RecordTableCellFieldInput />
          </RecordTableCellEditMode>
        ) : (
          <RecordTableCellDisplayMode>
            <FieldDisplay />
          </RecordTableCellDisplayMode>
        )}
      </FieldFocusStaticFocusedProvider>
      {showButton && <RecordTableCellEditButton />}
    </div>
  );
};

const styles = stylex.create({
  container: {
    alignItems: 'center',
    backgroundColor: background['--t-background-primary'],
    boxSizing: 'border-box',
    display: 'flex',
    height: recordTableLayout.rowHeight,
    outlineOffset: -1,
    userSelect: 'none',
  },
  interactive: {
    borderTopLeftRadius: borderRadius['--t-border-radius-sm'],
    borderTopRightRadius: borderRadius['--t-border-radius-sm'],
    borderBottomRightRadius: borderRadius['--t-border-radius-sm'],
    borderBottomLeftRadius: borderRadius['--t-border-radius-sm'],
    cursor: 'pointer',
  },
  nonInteractive: {
    borderTopLeftRadius: 0,
    borderTopRightRadius: 0,
    borderBottomRightRadius: 0,
    borderBottomLeftRadius: 0,
    cursor: 'default',
  },
  rowActive: {
    backgroundColor: accent['--t-accent-quaternary'],
    outlineStyle: 'none',
  },
  outlineInteractive: {
    outlineColor: fontColor['--t-font-color-extra-light'],
    outlineStyle: 'solid',
    outlineWidth: 1,
  },
  outlineNonInteractive: {
    outlineColor: borderColor['--t-border-color-medium'],
    outlineStyle: 'solid',
    outlineWidth: 1,
  },
});
