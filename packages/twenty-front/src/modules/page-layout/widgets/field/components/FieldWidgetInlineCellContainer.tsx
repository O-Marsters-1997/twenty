import { useContext } from 'react';

import { FieldContext } from '@/object-record/record-field/ui/contexts/FieldContext';
import { useFieldFocus } from '@/object-record/record-field/ui/hooks/useFieldFocus';
import { useRecordInlineCellContext } from '@/object-record/record-inline-cell/components/RecordInlineCellContext';
import { RecordInlineCellValue } from '@/object-record/record-inline-cell/components/RecordInlineCellValue';
import * as stylex from '@stylexjs/stylex';
import { spacing } from 'twenty-ui/theme/tokens.stylex';

const styles = stylex.create({
  base: {
    gap: spacing['--t-spacing-1'],
    alignItems: 'center',
    boxSizing: 'border-box',
    display: 'flex',
    userSelect: 'none',
    height: 'fit-content',
    width: '100%',
  },
  readonly: { cursor: 'default' },
  editable: { cursor: 'pointer' },
  valueContainer: {
    display: 'flex',
    position: 'relative',
    minWidth: '0',
    width: '100%',
  },
});

export const FieldWidgetInlineCellContainer = () => {
  const { readonly } = useRecordInlineCellContext();

  const { onMouseEnter, onMouseLeave, anchorId } = useContext(FieldContext);

  const { setIsFocused } = useFieldFocus();

  const handleContainerMouseEnter = () => {
    if (!readonly) {
      setIsFocused(true);
    }
    onMouseEnter?.();
  };

  const handleContainerMouseLeave = () => {
    if (!readonly) {
      setIsFocused(false);
    }
    onMouseLeave?.();
  };

  return (
    <div
      onMouseEnter={handleContainerMouseEnter}
      onMouseLeave={handleContainerMouseLeave}
      {...stylex.props(
        styles.base,
        (readonly ?? false) ? styles.readonly : styles.editable,
      )}
    >
      <div id={anchorId} {...stylex.props(styles.valueContainer)}>
        <RecordInlineCellValue />
      </div>
    </div>
  );
};
