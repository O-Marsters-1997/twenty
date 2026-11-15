import { SkeletonLine } from '@/ui/feedback/skeleton/components/SkeletonLine';
import { styled } from '@linaria/react';
import { SKELETON_HEIGHT_SIZES } from 'twenty-ui/primitives/feedback';
import * as stylex from '@stylexjs/stylex';
import { spacing } from 'twenty-ui/theme/tokens.stylex';

const styles = stylex.create({
  skeletonContainer: {
    alignContent: 'flex-start',
    alignItems: 'center',
    display: 'flex',
    flexDirection: 'column',
    flexWrap: 'wrap',
    gap: spacing['--t-spacing-4'],
    paddingBlock: spacing['--t-spacing-8'],
    paddingInline: spacing['--t-spacing-8'],
    width: '100%',
  },
  skeletonSubSection: {
    display: 'flex',
    gap: spacing['--t-spacing-4'],
  },
  skeletonSubSectionContent: {
    display: 'flex',
    flexDirection: 'column',
    gap: spacing['--t-spacing-3'],
    justifyContent: 'center',
  },
});

const StyledSkeletonColumn = styled(SkeletonLine)`
  corner-shape: round;
`;

const SKELETON_COLUMN_HEIGHTS = {
  short: 84,
  tall: 120,
};

export const SkeletonLoader = ({
  withSubSections = false,
}: {
  withSubSections?: boolean;
}) => {
  const skeletonItems = Array.from({ length: 3 }).map((_, index) => ({
    id: `skeleton-item-${index}`,
  }));

  return (
    <div {...stylex.props(styles.skeletonContainer)}>
      <SkeletonLine width={440} height={SKELETON_HEIGHT_SIZES.s} />
      {withSubSections &&
        skeletonItems.map(({ id }, index) => (
          <div key={id} {...stylex.props(styles.skeletonSubSection)}>
            <StyledSkeletonColumn
              width={24}
              borderRadius={80}
              height={
                index === 1
                  ? SKELETON_COLUMN_HEIGHTS.tall
                  : SKELETON_COLUMN_HEIGHTS.short
              }
            />
            <div {...stylex.props(styles.skeletonSubSectionContent)}>
              <SkeletonLine width={400} height={SKELETON_HEIGHT_SIZES.m} />
              <SkeletonLine width={400} height={SKELETON_HEIGHT_SIZES.m} />
              {index === 1 && (
                <SkeletonLine width={400} height={SKELETON_HEIGHT_SIZES.m} />
              )}
            </div>
          </div>
        ))}
    </div>
  );
};
