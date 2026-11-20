import { RecordTableCellStyleWrapper } from '@/object-record/record-table/record-table-cell/components/RecordTableCellStyleWrapper';
import { getRecordTableColumnFieldWidthClassName } from '@/object-record/record-table/utils/getRecordTableColumnFieldWidthClassName';
import * as stylex from '@stylexjs/stylex';
import { Skeleton, SKELETON_HEIGHT_SIZES } from 'twenty-ui/primitives/feedback';
import { borderRadius, spacing } from 'twenty-ui/theme/tokens.stylex';

export const RecordTableCellLoading = ({
  recordFieldIndex,
  isSelected = false,
}: {
  recordFieldIndex: number;
  isSelected?: boolean;
}) => {
  return (
    <RecordTableCellStyleWrapper
      widthClassName={getRecordTableColumnFieldWidthClassName(recordFieldIndex)}
      isSelected={isSelected}
    >
      <Skeleton
        layout="block"
        height={SKELETON_HEIGHT_SIZES.s}
        {...stylex.props(styles.cellSkeleton)}
        animated={false}
      />
    </RecordTableCellStyleWrapper>
  );
};

const styles = stylex.create({
  cellSkeleton: {
    marginBlock: spacing['--t-spacing-2'],
    marginInline: spacing['--t-spacing-2'],
    borderBottomLeftRadius: borderRadius['--t-border-radius-sm'],
    borderBottomRightRadius: borderRadius['--t-border-radius-sm'],
    borderTopLeftRadius: borderRadius['--t-border-radius-sm'],
    borderTopRightRadius: borderRadius['--t-border-radius-sm'],
    width: 'auto',
  },
});
