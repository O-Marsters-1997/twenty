import { SkeletonLine } from '@/ui/feedback/skeleton/components/SkeletonLine';
import * as stylex from '@stylexjs/stylex';
import { SKELETON_HEIGHT_SIZES } from 'twenty-ui/primitives/feedback';

const styles = stylex.create({
  skeleton: {
    height: '24px',
  },
});

export const RecordInlineCellSkeletonLoader = () => {
  return (
    <div {...stylex.props(styles.skeleton)}>
      <SkeletonLine width={154} height={SKELETON_HEIGHT_SIZES.s} />
    </div>
  );
};
