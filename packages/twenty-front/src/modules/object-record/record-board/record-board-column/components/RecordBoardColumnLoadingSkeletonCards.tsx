import { RECORD_BOARD_QUERY_PAGE_SIZE } from '@/object-record/record-board/constants/RecordBoardQueryPageSize';
import { RecordBoardColumnCardContainerSkeletonLoader } from '@/object-record/record-board/record-board-column/components/RecordBoardColumnCardContainerSkeletonLoader';
import * as stylex from '@stylexjs/stylex';
import {
  background,
  borderRadius,
  color,
  fontColor,
  spacing,
} from 'twenty-ui/theme/tokens.stylex';

const styles = stylex.create({
  skeletonCardContainer: {
    backgroundColor: background['--t-background-secondary'],
    borderColor: background['--t-background-quaternary'],
    borderRadius: borderRadius['--t-border-radius-sm'],
    borderStyle: 'solid',
    borderWidth: '1px',
    boxShadow: `0px 4px 8px 0px ${color['--t-color-gray2']}, 0px 0px 4px 0px ${color['--t-color-gray2']}`,
    color: fontColor['--t-font-color-primary'],
    marginBottom: spacing['--t-spacing-2'],
  },
});

export const RecordBoardColumnLoadingSkeletonCards = () => {
  return Array.from(
    {
      length: RECORD_BOARD_QUERY_PAGE_SIZE,
    },
    (_, index) => (
      <div key={`${index}`} {...stylex.props(styles.skeletonCardContainer)}>
        <RecordBoardColumnCardContainerSkeletonLoader />
      </div>
    ),
  );
};
