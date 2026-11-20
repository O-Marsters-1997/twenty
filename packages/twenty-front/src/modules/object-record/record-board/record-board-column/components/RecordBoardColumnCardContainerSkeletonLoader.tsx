import { Skeleton, SKELETON_HEIGHT_SIZES } from 'twenty-ui/primitives/feedback';
import { themeCssVariables } from 'twenty-ui/theme';

import { RecordCardBodyContainer } from '@/object-record/record-card/components/RecordCardBodyContainer';
import { RecordCardHeaderContainer } from '@/object-record/record-card/components/RecordCardHeaderContainer';
import { visibleRecordFieldsComponentSelector } from '@/object-record/record-field/states/visibleRecordFieldsComponentSelector';
import { useAtomComponentSelectorValue } from '@/ui/utilities/state/jotai/hooks/useAtomComponentSelectorValue';
import { useGetCurrentViewOnly } from '@/views/hooks/useGetCurrentViewOnly';
import * as stylex from '@stylexjs/stylex';
import { spacing } from 'twenty-ui/theme/tokens.stylex';

const styles = stylex.create({
  skeletonIconAndText: {
    gap: spacing['--t-spacing-1'],
    display: 'flex',
  },
  skeletonTitle: {
    paddingLeft: spacing['--t-spacing-1'],
  },
  bodyContainer: {
    gap: spacing['--t-spacing-0_5'],
    display: 'flex',
    flexDirection: 'column',
    paddingBottom: '4px',
    paddingTop: '4px',
  },
});

export const RecordBoardColumnCardContainerSkeletonLoader = () => {
  const { currentView } = useGetCurrentViewOnly();

  const isCompactModeActive = currentView?.isCompact ?? false;

  const visibleRecordFields = useAtomComponentSelectorValue(
    visibleRecordFieldsComponentSelector,
  );

  const numberOfFields = visibleRecordFields.length - 1;

  const skeletonItems = Array.from({ length: numberOfFields }).map(
    (_, index) => ({
      id: `skeleton-item-${index}`,
    }),
  );

  const titleSkeletonWidth = isCompactModeActive ? 72 : 54;

  return (
    <>
      <RecordCardHeaderContainer isCompact={isCompactModeActive}>
        <div {...stylex.props(styles.skeletonTitle)}>
          <Skeleton
            render={<div />}
            animated={false}
            baseColor={themeCssVariables.background.tertiary}
            borderRadius={themeCssVariables.border.radius.sm}
            width={titleSkeletonWidth}
            height={12}
            style={{ display: 'block' }}
          />
        </div>
      </RecordCardHeaderContainer>
      <div {...stylex.props(styles.bodyContainer)}>
        {!isCompactModeActive &&
          skeletonItems.map(({ id }) => (
            <RecordCardBodyContainer key={id}>
              <div {...stylex.props(styles.skeletonIconAndText)}>
                <Skeleton
                  render={<div />}
                  animated={false}
                  baseColor={themeCssVariables.background.tertiary}
                  borderRadius={themeCssVariables.border.radius.sm}
                  style={{ display: 'block' }}
                  width={16}
                  height={SKELETON_HEIGHT_SIZES.s}
                />
                <Skeleton
                  render={<div />}
                  animated={false}
                  baseColor={themeCssVariables.background.tertiary}
                  borderRadius={themeCssVariables.border.radius.sm}
                  style={{ display: 'block' }}
                  width={151}
                  height={SKELETON_HEIGHT_SIZES.s}
                />
              </div>
            </RecordCardBodyContainer>
          ))}
      </div>
    </>
  );
};
