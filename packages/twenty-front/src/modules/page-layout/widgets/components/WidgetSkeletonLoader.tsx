import { SkeletonLine } from '@/ui/feedback/skeleton/components/SkeletonLine';
import { SKELETON_HEIGHT_SIZES } from 'twenty-ui/primitives/feedback';
import * as stylex from '@stylexjs/stylex';

const styles = stylex.create({
  container: {
    alignItems: 'center',
    display: 'flex',
    height: '100%',
    justifyContent: 'center',
    width: '100%',
  },
});

export const WidgetSkeletonLoader = () => {
  return (
    <div {...stylex.props(styles.container)}>
      <SkeletonLine width={120} height={SKELETON_HEIGHT_SIZES.m} />
    </div>
  );
};
