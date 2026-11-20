import { FieldDisplay } from '@/object-record/record-field/ui/components/FieldDisplay';
import { useFieldFocus } from '@/object-record/record-field/ui/hooks/useFieldFocus';
import { useRecordInlineCellContext } from '@/object-record/record-inline-cell/components/RecordInlineCellContext';
import { RecordInlineCellDisplayMode } from '@/object-record/record-inline-cell/components/RecordInlineCellDisplayMode';
import { RecordInlineCellSkeletonLoader } from '@/object-record/record-inline-cell/components/RecordInlineCellSkeletonLoader';
import * as stylex from '@stylexjs/stylex';
import { spacing } from 'twenty-ui/theme/tokens.stylex';

const styles = stylex.create({
  clickableContainer: {
    gap: spacing['--t-spacing-1'],
    alignItems: 'center',
    cursor: 'pointer',
    display: 'flex',
    justifyContent: 'normal',
    width: '100%',
  },
  readonly: {
    cursor: 'default',
  },
  centered: {
    justifyContent: 'center',
  },
});

export const RecordInlineCellValue = () => {
  const { readonly, loading, isCentered, onOpenEditMode } =
    useRecordInlineCellContext();
  const { isFocused } = useFieldFocus();

  if (loading === true) {
    return <RecordInlineCellSkeletonLoader />;
  }

  return (
    <div
      {...stylex.props(
        styles.clickableContainer,
        readonly && styles.readonly,
        isCentered === true && styles.centered,
      )}
    >
      <RecordInlineCellDisplayMode
        isHovered={isFocused}
        onClick={onOpenEditMode}
      >
        <FieldDisplay />
      </RecordInlineCellDisplayMode>
    </div>
  );
};
