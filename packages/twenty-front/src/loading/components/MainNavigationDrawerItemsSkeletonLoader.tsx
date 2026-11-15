import { SkeletonLine } from '@/ui/feedback/skeleton/components/SkeletonLine';
import * as stylex from '@stylexjs/stylex';
import { SKELETON_HEIGHT_SIZES } from 'twenty-ui/primitives/feedback';

export const MainNavigationDrawerItemsSkeletonLoader = ({
  title,
  length,
}: {
  title?: boolean;
  length: number;
}) => {
  return (
    <div {...stylex.props(styles.skeletonContainer)}>
      {title && <SkeletonLine width={48} height={SKELETON_HEIGHT_SIZES.xs} />}
      {Array.from({ length }).map((_, index) => (
        <SkeletonLine
          key={index}
          containerClassName={
            stylex.props(styles.fillSkeletonContainer).className
          }
          height={SKELETON_HEIGHT_SIZES.s}
        />
      ))}
    </div>
  );
};

const styles = stylex.create({
  skeletonContainer: {
    alignItems: 'flex-start',
    display: 'flex',
    flexDirection: 'column',
    gap: 6,
    width: '100%',
  },
  fillSkeletonContainer: {
    display: 'block',
    width: '100%',
  },
});
