import { recordDetailRecordsListItemMarker } from '@/object-record/record-field-list/record-detail-section/components/RecordDetailRecordsListItemContainer.stylex';
import { useLayoutRenderingContext } from '@/ui/layout/contexts/LayoutRenderingContext';
import * as stylex from '@stylexjs/stylex';
import { spacing } from 'twenty-ui/theme/tokens.stylex';
import { PageLayoutType } from '~/generated-metadata/graphql';

const styles = stylex.create({
  listItem: {
    gap: spacing['--t-spacing-1'],
    alignItems: 'center',
    display: 'flex',
    justifyContent: 'space-between',
    height: spacing['--t-spacing-10'],
    paddingLeft: spacing['--t-spacing-3'],
    paddingRight: spacing['--t-spacing-2'],
  },
  noHorizontalPadding: {
    paddingLeft: 0,
    paddingRight: 0,
  },
});

type RecordDetailRecordsListItemContainerProps = {
  children: React.ReactNode;
};

export const RecordDetailRecordsListItemContainer = ({
  children,
}: RecordDetailRecordsListItemContainerProps) => {
  const layoutRenderingContext = useLayoutRenderingContext();

  const isInRecordPageLayout =
    layoutRenderingContext?.layoutType === PageLayoutType.RECORD_PAGE;

  return (
    <div
      {...stylex.props(
        recordDetailRecordsListItemMarker,
        styles.listItem,
        isInRecordPageLayout && styles.noHorizontalPadding,
      )}
    >
      {children}
    </div>
  );
};
